import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { Payment } from '@/types'

function checkAuth(req: NextRequest) {
  return req.cookies.get('oil_admin_auth')?.value === 'true'
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const id        = searchParams.get('id')
  const category  = searchParams.get('category')
  const date_from = searchParams.get('date_from')
  const date_to   = searchParams.get('date_to')
  const due_only  = searchParams.get('due_only') === 'true'
  const db = supabaseAdmin()

  if (id) {
    const { data, error } = await db.from('purchases').select('*').eq('id', id).single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ...data, payments: data.payments || [] })
  }

  let query = db.from('purchases').select('*').order('date', { ascending: false })
  if (category)  query = query.eq('category', category)
  if (date_from) query = query.gte('date', date_from)
  if (date_to)   query = query.lte('date', date_to)
  if (due_only)  query = query.gt('due_amount', 0)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json((data || []).map(p => ({ ...p, payments: p.payments || [] })))
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const db = supabaseAdmin()

  const amountPaid = body.amount_paid || 0
  const due = Math.max(0, body.amount - amountPaid)
  const payments: Payment[] = amountPaid > 0 ? [{
    id: crypto.randomUUID(),
    date: body.date,
    amount: amountPaid,
    note: 'Initial payment',
  }] : []

  const { data, error } = await db.from('purchases').insert({
    category:    body.category,
    description: body.description || '',
    supplier:    body.supplier || '',
    amount:      body.amount,
    amount_paid: amountPaid,
    due_amount:  due,
    date:        body.date,
    payments,
    notes:       body.notes || '',
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PUT(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const db = supabaseAdmin()

  if (body.action === 'add_payment') {
    const { data: existing } = await db.from('purchases')
      .select('payments, amount').eq('id', body.id).single()

    const payments: Payment[] = existing?.payments || []
    const newPay: Payment = {
      id: crypto.randomUUID(),
      date: body.payment.date,
      amount: Number(body.payment.amount),
      note: body.payment.note || '',
    }
    const updated = [...payments, newPay]
    const totalPaid = updated.reduce((s, p) => s + p.amount, 0)
    const due = Math.max(0, (existing?.amount || 0) - totalPaid)

    const { data, error } = await db.from('purchases')
      .update({ payments: updated, amount_paid: totalPaid, due_amount: due })
      .eq('id', body.id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  if (body.action === 'delete_payment') {
    const { data: existing } = await db.from('purchases')
      .select('payments, amount').eq('id', body.id).single()

    const payments = (existing?.payments || []).filter((p: Payment) => p.id !== body.payment_id)
    const totalPaid = payments.reduce((s: number, p: Payment) => s + p.amount, 0)
    const due = Math.max(0, (existing?.amount || 0) - totalPaid)

    const { data, error } = await db.from('purchases')
      .update({ payments, amount_paid: totalPaid, due_amount: due })
      .eq('id', body.id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

export async function DELETE(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const db = supabaseAdmin()
  const { error } = await db.from('purchases').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export const dynamic = 'force-dynamic'
