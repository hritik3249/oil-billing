import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { Payment } from '@/types'

function checkAuth(req: NextRequest) {
  return req.cookies.get('oil_admin_auth')?.value === 'true'
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    // Ensure payments array exists
    if (!data.payments) data.payments = []
    return NextResponse.json(data)
  }

  let query = db.from('bills').select('*').order('date', { ascending: false }).order('created_at', { ascending: false })
  if (customer_id) query = query.eq('customer_id', customer_id)
  if (date_from)   query = query.gte('date', date_from)
  if (date_to)     query = query.lte('date', date_to)
  if (due_only)    query = query.gt('due_amount', 0)
  if (search)      query = query.ilike('customer_name', `%${search}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  // Ensure payments array exists on all bills
  const bills = (data || []).map(b => ({ ...b, payments: b.payments || [] }))
  return NextResponse.json(bills)
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const db = supabaseAdmin()

  const due = (body.total_amount || 0) - (body.amount_paid || 0)

  // Build initial payments array if amount_paid > 0
  const payments: Payment[] = body.amount_paid > 0 ? [{
    id: crypto.randomUUID(),
    date: body.date || new Date().toISOString().split('T')[0],
    amount: body.amount_paid,
    note: 'Initial payment',
  }] : []

  const { data, error } = await db.from('bills').insert({
    bill_number:    body.bill_number,
    customer_id:    body.customer_id,
    customer_name:  body.customer_name,
    customer_area:  body.customer_area,
    vehicle_number: body.vehicle_number,
    date:           body.date,
    items:          body.items,
    total_amount:   body.total_amount,
    amount_paid:    body.amount_paid || 0,
    due_amount:     due < 0 ? 0 : due,
    payments,
    notes:          body.notes || '',
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PUT(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const db = supabaseAdmin()

  // ── EDIT BILL items/details ──
  if (body.action === 'edit_bill') {
    const newTotal = (body.items as { total: number }[]).reduce((s, i) => s + i.total, 0)
    // Recalculate due from existing payments
    const { data: existing } = await db.from('bills').select('payments, amount_paid').eq('id', body.id).single()
    const payments: Payment[] = existing?.payments || []
    const totalPaid = payments.reduce((s: number, p: Payment) => s + p.amount, 0)
    const due = Math.max(0, newTotal - totalPaid)

    const { data, error } = await db.from('bills')
      .update({
        items:        body.items,
        total_amount: newTotal,
        amount_paid:  totalPaid,
        due_amount:   due,
      })
      .eq('id', body.id).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ...data, payments })
  }

  // ── ADD PAYMENT installment ──
  if (body.action === 'add_payment') {
    const { data: existing, error: fetchErr } = await db
      .from('bills').select('payments, total_amount').eq('id', body.id).single()
    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })

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

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  // ── DELETE PAYMENT installment ──
  if (body.action === 'delete_payment') {
    const { data: existing } = await db
      .from('bills').select('payments, total_amount').eq('id', body.id).single()

    const payments: Payment[] = (existing?.payments || []).filter((p: Payment) => p.id !== body.payment_id)
    const totalPaid = payments.reduce((s, p) => s + p.amount, 0)
    const due = Math.max(0, (existing?.total_amount ?? 0) - totalPaid)

    const { data, error } = await db.from('bills')
      .update({ payments, amount_paid: totalPaid, due_amount: due })
      .eq('id', body.id).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  // ── LEGACY: plain payment update ──
  const due = body.total_amount - (body.amount_paid || 0)
  const { data, error } = await db.from('bills')
    .update({ amount_paid: body.amount_paid, due_amount: due < 0 ? 0 : due, notes: body.notes })
    .eq('id', body.id).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  const db = supabaseAdmin()
  const { error } = await db.from('bills').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export const dynamic = 'force-dynamic'
