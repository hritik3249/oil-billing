import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { Payment } from '@/types'
import { checkAuth } from '@/lib/auth-server'

const NO_CACHE = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
}

export async function GET(req: NextRequest) {
  if (!(await checkAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const customer_id = searchParams.get('customer_id')
  const date_from   = searchParams.get('date_from')
  const date_to     = searchParams.get('date_to')
  const due_only    = searchParams.get('due_only') === 'true'
  const search      = searchParams.get('search') || ''
  const id          = searchParams.get('id')
  const db = supabaseAdmin()

  if (id) {
    const { data, error } = await db.from('bills').select('*').eq('id', id).single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: NO_CACHE })
    if (!data.payments) data.payments = []
    return NextResponse.json(data, { headers: NO_CACHE })
  }

  let query = db.from('bills').select('*').order('date', { ascending: false }).order('created_at', { ascending: false })
  if (customer_id) query = query.eq('customer_id', customer_id)
  if (date_from)   query = query.gte('date', date_from)
  if (date_to)     query = query.lte('date', date_to)
  if (due_only)    query = query.gt('due_amount', 0)
  if (search)      query = query.ilike('customer_name', `%${search}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: NO_CACHE })
  const bills = (data || []).map(b => ({ ...b, payments: b.payments || [] }))
  return NextResponse.json(bills, { headers: NO_CACHE })
}

// Validate items and recompute every money figure server-side —
// never trust totals sent by the client.
type RawItem = { oil_type_id?: string; oil_name?: string; quantity?: unknown; rate?: unknown }
function sanitizeItems(raw: unknown): { items: { oil_type_id: string; oil_name: string; quantity: number; rate: number; total: number }[]; error?: string } {
  if (!Array.isArray(raw) || raw.length === 0) return { items: [], error: 'At least one item is required' }
  const items = []
  for (const r of raw as RawItem[]) {
    const oil_name = String(r.oil_name || '').trim()
    const quantity = Number(r.quantity)
    const rate     = Number(r.rate)
    if (!oil_name) return { items: [], error: 'Every item needs a product name' }
    if (!Number.isFinite(quantity) || quantity <= 0) return { items: [], error: 'Item quantity must be greater than 0' }
    if (!Number.isFinite(rate) || rate < 0) return { items: [], error: 'Item rate cannot be negative' }
    items.push({ oil_type_id: String(r.oil_type_id || 'custom'), oil_name, quantity, rate, total: rate * quantity })
  }
  return { items }
}

export async function POST(req: NextRequest) {
  if (!(await checkAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const db = supabaseAdmin()

  if (!String(body.bill_number || '').trim())
    return NextResponse.json({ error: 'Bill number is required' }, { status: 400 })

  const { items, error: itemErr } = sanitizeItems(body.items)
  if (itemErr) return NextResponse.json({ error: itemErr }, { status: 400 })

  const total_amount = items.reduce((s, i) => s + i.total, 0)
  const amount_paid  = Number(body.amount_paid) || 0
  if (amount_paid < 0) return NextResponse.json({ error: 'Amount paid cannot be negative' }, { status: 400 })
  const due = Math.max(0, total_amount - amount_paid)

  const payments: Payment[] = amount_paid > 0 ? [{
    id: crypto.randomUUID(),
    date: body.date || new Date().toISOString().split('T')[0],
    amount: amount_paid,
    note: 'Initial payment',
  }] : []

  const { data, error } = await db.from('bills').insert({
    bill_number:    String(body.bill_number).trim(),
    customer_id:    body.customer_id,
    customer_name:  body.customer_name,
    customer_area:  body.customer_area,
    vehicle_number: body.vehicle_number,
    date:           body.date,
    items,
    total_amount,
    amount_paid,
    due_amount:     due,
    payments,
    notes:          body.notes || '',
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: NO_CACHE })
  return NextResponse.json(data, { status: 201, headers: NO_CACHE })
}

export async function PUT(req: NextRequest) {
  if (!(await checkAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const db = supabaseAdmin()

  if (body.action === 'edit_bill') {
    const { items: editedItems, error: editErr } = sanitizeItems(body.items)
    if (editErr) return NextResponse.json({ error: editErr }, { status: 400 })
    const newTotal = editedItems.reduce((s, i) => s + i.total, 0)
    const { data: existing } = await db.from('bills').select('payments, amount_paid').eq('id', body.id).single()
    const payments: Payment[] = existing?.payments || []
    const totalPaid = payments.reduce((s: number, p: Payment) => s + p.amount, 0)
    const due = Math.max(0, newTotal - totalPaid)

    const { data, error } = await db.from('bills')
      .update({ items: editedItems, total_amount: newTotal, amount_paid: totalPaid, due_amount: due })
      .eq('id', body.id).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: NO_CACHE })
    return NextResponse.json({ ...data, payments }, { headers: NO_CACHE })
  }

  if (body.action === 'add_payment') {
    const payAmount = Number(body.payment?.amount)
    if (!Number.isFinite(payAmount) || payAmount <= 0)
      return NextResponse.json({ error: 'Payment amount must be greater than 0' }, { status: 400 })

    const { data: existing, error: fetchErr } = await db
      .from('bills').select('payments, total_amount').eq('id', body.id).single()
    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500, headers: NO_CACHE })

    const payments: Payment[] = existing?.payments || []
    const newPayment: Payment = {
      id:     crypto.randomUUID(),
      date:   body.payment.date,
      amount: Number(body.payment.amount),
      note:   body.payment.note || '',
    }
    const updatedPayments = [...payments, newPayment]
    const totalPaid = updatedPayments.reduce((s, p) => s + p.amount, 0)
    const due = Math.max(0, existing.total_amount - totalPaid)

    const { data, error } = await db.from('bills')
      .update({ payments: updatedPayments, amount_paid: totalPaid, due_amount: due })
      .eq('id', body.id).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: NO_CACHE })
    return NextResponse.json(data, { headers: NO_CACHE })
  }

  if (body.action === 'delete_payment') {
    const { data: existing } = await db
      .from('bills').select('payments, total_amount').eq('id', body.id).single()

    const payments: Payment[] = (existing?.payments || []).filter((p: Payment) => p.id !== body.payment_id)
    const totalPaid = payments.reduce((s, p) => s + p.amount, 0)
    const due = Math.max(0, (existing?.total_amount ?? 0) - totalPaid)

    const { data, error } = await db.from('bills')
      .update({ payments, amount_paid: totalPaid, due_amount: due })
      .eq('id', body.id).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: NO_CACHE })
    return NextResponse.json(data, { headers: NO_CACHE })
  }

  // Legacy plain payment update
  const due = body.total_amount - (body.amount_paid || 0)
  const { data, error } = await db.from('bills')
    .update({ amount_paid: body.amount_paid, due_amount: due < 0 ? 0 : due, notes: body.notes })
    .eq('id', body.id).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: NO_CACHE })
  return NextResponse.json(data, { headers: NO_CACHE })
}

export async function DELETE(req: NextRequest) {
  if (!(await checkAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  const db = supabaseAdmin()
  const { error } = await db.from('bills').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: NO_CACHE })
  return NextResponse.json({ success: true }, { headers: NO_CACHE })
}

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const revalidate = 0
