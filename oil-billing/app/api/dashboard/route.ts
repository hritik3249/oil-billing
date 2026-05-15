import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  if (req.cookies.get('oil_admin_auth')?.value !== 'true')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = supabaseAdmin()
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29)
  const fromDate = thirtyDaysAgo.toISOString().split('T')[0]

  // All 6 queries fire simultaneously — no waiting
  const [
    { data: allBills },
    { data: dueBills },
    { data: allPurchases },
    { data: duePurchases },
    { data: recentBills },
    { data: salaryDue },
  ] = await Promise.all([
    // Only fetch columns we actually need — avoids pulling large JSONB payments field
    db.from('bills').select('date,total_amount,items').gte('date', fromDate),
    db.from('bills').select('due_amount').gt('due_amount', 0),
    db.from('purchases').select('date,amount,category').gte('date', fromDate),
    db.from('purchases').select('due_amount').gt('due_amount', 0),
    // Recent bills — exclude heavy JSONB columns (items, payments)
    db.from('bills')
      .select('id,bill_number,customer_name,customer_area,date,total_amount,due_amount')
      .order('created_at', { ascending: false })
      .limit(6),
    db.from('salary_records').select('due_amount').gt('due_amount', 0),
  ])

  // Totals
  const total_sales     = allBills?.reduce((s, b) => s + b.total_amount, 0) ?? 0
  const total_purchases = allPurchases?.reduce((s, p) => s + p.amount, 0) ?? 0
  const gross_profit    = total_sales - total_purchases
  const pending_dues    = dueBills?.reduce((s, b) => s + b.due_amount, 0) ?? 0
  const purchase_dues   = (duePurchases?.reduce((s, p) => s + p.due_amount, 0) ?? 0)
                        + (salaryDue?.reduce((s, r) => s + r.due_amount, 0) ?? 0)

  // Oil-wise sales — computed from already-fetched bills
  const oilMap: Record<string, { total: number; quantity: number }> = {}
  allBills?.forEach(bill => {
    bill.items?.forEach((item: { oil_name: string; total: number; quantity: number }) => {
      if (!oilMap[item.oil_name]) oilMap[item.oil_name] = { total: 0, quantity: 0 }
      oilMap[item.oil_name].total    += item.total
      oilMap[item.oil_name].quantity += item.quantity
    })
  })
  const oil_wise_sales = Object.entries(oilMap).map(([oil_name, v]) => ({ oil_name, ...v }))

  // Category-wise purchases
  const catMap: Record<string, number> = {}
  allPurchases?.forEach(p => { catMap[p.category] = (catMap[p.category] || 0) + p.amount })
  const category_wise_purchases = Object.entries(catMap)
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total)

  // Combined daily chart (last 10 days)
  const salesMap: Record<string, number>    = {}
  const purchaseMap: Record<string, number> = {}
  allBills?.forEach(b => { salesMap[b.date] = (salesMap[b.date] || 0) + b.total_amount })
  allPurchases?.forEach(p => { purchaseMap[p.date] = (purchaseMap[p.date] || 0) + p.amount })
  const daily_chart = Array.from({ length: 10 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (9 - i))
    const key = d.toISOString().split('T')[0]
    return { date: key, sales: salesMap[key] || 0, purchases: purchaseMap[key] || 0 }
  })

  return NextResponse.json({
    total_sales, total_purchases, gross_profit,
    pending_dues, purchase_dues,
    oil_wise_sales, category_wise_purchases,
    daily_chart,
    recent_bills: recentBills || [],
  })
}


export const dynamic = 'force-dynamic'
