import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  if (req.cookies.get('oil_admin_auth')?.value !== 'true')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month') // YYYY-MM
  if (!month) return NextResponse.json({ error: 'month required' }, { status: 400 })

  const dateFrom = `${month}-01`
  const dateToObj = new Date(Number(month.split('-')[0]), Number(month.split('-')[1]), 0)
  const dateTo = dateToObj.toISOString().split('T')[0]

  const db = supabaseAdmin()

  const [
    { data: bills },
    { data: purchases },
    { data: salaryRecords },
  ] = await Promise.all([
    db.from('bills')
      .select('total_amount, amount_paid, due_amount, items')
      .gte('date', dateFrom).lte('date', dateTo),
    db.from('purchases')
      .select('category, amount, amount_paid, due_amount')
      .gte('date', dateFrom).lte('date', dateTo),
    db.from('salary_records')
      .select('employee_name, salary_due, amount_paid, due_amount')
      .eq('month', month),
  ])

  // ── INCOME ──
  const total_billed    = bills?.reduce((s, b) => s + b.total_amount, 0) ?? 0
  const total_collected = bills?.reduce((s, b) => s + b.amount_paid, 0) ?? 0
  const customer_dues   = bills?.reduce((s, b) => s + b.due_amount, 0) ?? 0

  // Oil-wise breakdown
  const oilMap: Record<string, { quantity: number; revenue: number }> = {}
  bills?.forEach(bill => {
    bill.items?.forEach((item: { oil_name: string; quantity: number; total: number }) => {
      if (!oilMap[item.oil_name]) oilMap[item.oil_name] = { quantity: 0, revenue: 0 }
      oilMap[item.oil_name].quantity += item.quantity
      oilMap[item.oil_name].revenue  += item.total
    })
  })
  const oil_breakdown = Object.entries(oilMap).map(([name, v]) => ({ name, ...v }))

  // ── EXPENSES ──
  // Category-wise (excluding Employee Salary — handled separately)
  const catMap: Record<string, { total: number; paid: number; due: number }> = {}
  purchases?.forEach(p => {
    if (p.category === 'Employee Salary') return // handled via salary_records
    if (!catMap[p.category]) catMap[p.category] = { total: 0, paid: 0, due: 0 }
    catMap[p.category].total += p.amount
    catMap[p.category].paid  += p.amount_paid
    catMap[p.category].due   += p.due_amount
  })
  const expense_breakdown = Object.entries(catMap).map(([category, v]) => ({ category, ...v }))

  // Employee salary breakdown
  const salary_breakdown = (salaryRecords || []).map(r => ({
    name:       r.employee_name,
    salary_due: r.salary_due,
    paid:       r.amount_paid,
    due:        r.due_amount,
  }))
  const total_salary_due  = salary_breakdown.reduce((s, r) => s + r.salary_due, 0)
  const total_salary_paid = salary_breakdown.reduce((s, r) => s + r.paid, 0)
  const total_salary_due_remaining = salary_breakdown.reduce((s, r) => s + r.due, 0)

  // Totals
  const total_expenses       = expense_breakdown.reduce((s, e) => s + e.total, 0) + total_salary_due
  const total_expenses_paid  = expense_breakdown.reduce((s, e) => s + e.paid, 0) + total_salary_paid
  const total_expenses_due   = expense_breakdown.reduce((s, e) => s + e.due, 0) + total_salary_due_remaining

  const gross_profit = total_billed    - total_expenses
  const cash_profit  = total_collected - total_expenses_paid

  return NextResponse.json({
    month,
    // Income
    total_billed,
    total_collected,
    customer_dues,
    oil_breakdown,
    // Expenses
    expense_breakdown,
    salary_breakdown,
    total_salary_due,
    total_salary_paid,
    total_salary_due_remaining,
    total_expenses,
    total_expenses_paid,
    total_expenses_due,
    // Profit
    gross_profit,
    cash_profit,
  })
}

export const dynamic = 'force-dynamic'
