import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { SalaryPayment } from '@/types'
import { checkAuth } from '@/lib/auth-server'

const monthLabel = (m: string) => {
  const [y, mo] = m.split('-')
  return new Date(Number(y), Number(mo) - 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

export async function GET(req: NextRequest) {
  if (!(await checkAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const employee_id = searchParams.get('employee_id')
  const month       = searchParams.get('month')
  const db = supabaseAdmin()

  let query = db.from('salary_records').select('*').order('month', { ascending: false })
  if (employee_id) query = query.eq('employee_id', employee_id)
  if (month)       query = query.eq('month', month)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json((data || []).map(r => ({ ...r, payments: r.payments || [] })))
}

export async function POST(req: NextRequest) {
  if (!(await checkAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const db = supabaseAdmin()

  const { data: existing } = await db.from('salary_records')
    .select('id').eq('employee_id', body.employee_id).eq('month', body.month).single()
  if (existing) return NextResponse.json({ error: 'Salary record already exists for this month' }, { status: 400 })

  const { data, error } = await db.from('salary_records').insert({
    employee_id:   body.employee_id,
    employee_name: body.employee_name,
    month:         body.month,
    salary_due:    body.salary_due,
    amount_paid:   0,
    due_amount:    body.salary_due,
    payments:      [],
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PUT(req: NextRequest) {
  if (!(await checkAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const db = supabaseAdmin()

  // ── ADD PAYMENT ──
  if (body.action === 'add_payment') {
    const { data: existing } = await db.from('salary_records')
      .select('payments, salary_due, employee_name, month').eq('id', body.id).single()

    const payments: SalaryPayment[] = existing?.payments || []
    const newPayment: SalaryPayment = {
      id:     crypto.randomUUID(),
      date:   body.payment.date,
      amount: Number(body.payment.amount),
      note:   body.payment.note || '',
    }
    const updated   = [...payments, newPayment]
    const totalPaid = updated.reduce((s, p) => s + p.amount, 0)
    const due       = Math.max(0, (existing?.salary_due || 0) - totalPaid)

    // Update salary record
    const { data, error } = await db.from('salary_records')
      .update({ payments: updated, amount_paid: totalPaid, due_amount: due })
      .eq('id', body.id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // ── Auto-create matching purchase entry ──
    const label = monthLabel(existing?.month || '')
    await db.from('purchases').insert({
      category:    'Employee Salary',
      description: `Salary – ${existing?.employee_name} (${label})`,
      supplier:    existing?.employee_name || '',
      amount:      newPayment.amount,
      amount_paid: newPayment.amount,
      due_amount:  0,
      date:        newPayment.date,
      payments:    [{ id: newPayment.id, date: newPayment.date, amount: newPayment.amount, note: newPayment.note }],
      notes:       `Salary record ID: ${body.id} | Payment ID: ${newPayment.id}`,
    })

    return NextResponse.json(data)
  }

  // ── DELETE PAYMENT ──
  if (body.action === 'delete_payment') {
    const { data: existing } = await db.from('salary_records')
      .select('payments, salary_due').eq('id', body.id).single()

    const payments = (existing?.payments || []).filter((p: SalaryPayment) => p.id !== body.payment_id)
    const totalPaid = payments.reduce((s: number, p: SalaryPayment) => s + p.amount, 0)
    const due = Math.max(0, (existing?.salary_due || 0) - totalPaid)

    const { data, error } = await db.from('salary_records')
      .update({ payments, amount_paid: totalPaid, due_amount: due })
      .eq('id', body.id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // ── Remove matching purchase entry by payment ID in notes ──
    await db.from('purchases')
      .delete()
      .eq('category', 'Employee Salary')
      .like('notes', `%Payment ID: ${body.payment_id}%`)

    return NextResponse.json(data)
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

export async function DELETE(req: NextRequest) {
  if (!(await checkAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const db = supabaseAdmin()

  // Also delete all purchase entries linked to this salary record
  await db.from('purchases')
    .delete()
    .eq('category', 'Employee Salary')
    .like('notes', `%Salary record ID: ${id}%`)

  const { error } = await db.from('salary_records').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export const dynamic = 'force-dynamic'

