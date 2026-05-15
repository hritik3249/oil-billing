import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  if (req.cookies.get('oil_admin_auth')?.value !== 'true')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = supabaseAdmin()
  const now = new Date()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const prefix = `ET-${mm}-`

  // Fetch ALL bills with this month prefix — find max numerically (not alphabetically)
  // Alphabetical order fails: "ET-05-9" > "ET-05-14" alphabetically, so we can't use ORDER BY
  const { data, error } = await db
    .from('bills')
    .select('bill_number')
    .like('bill_number', `${prefix}%`)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Parse each number as integer and find the true maximum
  let maxNum = 0
  for (const row of (data || [])) {
    const parts = row.bill_number.split('-')
    const num = parseInt(parts[parts.length - 1], 10)
    if (!isNaN(num) && num > maxNum) maxNum = num
  }

  const nextNumber = maxNum + 1
  const invoiceNo  = `${prefix}${nextNumber}`

  return NextResponse.json({ invoice_no: invoiceNo, next_number: nextNumber, month: mm })
}

export const dynamic = 'force-dynamic'
