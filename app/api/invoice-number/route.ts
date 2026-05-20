import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  if (req.cookies.get('oil_admin_auth')?.value !== 'true')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = supabaseAdmin()

  // Use IST (UTC+5:30) to get the correct month — server runs in UTC
  const now = new Date()
  const istOffset = 5.5 * 60 * 60 * 1000 // 5 hours 30 minutes in ms
  const istDate = new Date(now.getTime() + istOffset)
  const mm = String(istDate.getUTCMonth() + 1).padStart(2, '0')
  const prefix = `ET-${mm}-`

  // Fetch ALL bills with this month prefix — find max numerically
  // DO NOT use .order() — alphabetical order breaks numeric sequence
  // e.g. ET-05-9 sorts AFTER ET-05-14 alphabetically
  const { data, error } = await db
    .from('bills')
    .select('bill_number')
    .like('bill_number', `${prefix}%`)

  if (error) {
    return NextResponse.json({ error: error.message }, {
      status: 500,
      headers: { 'Cache-Control': 'no-store' },
    })
  }

  // Parse each number as integer and find the true maximum
  let maxNum = 0
  for (const row of (data || [])) {
    const parts = row.bill_number.split('-')
    const num = parseInt(parts[parts.length - 1], 10)
    if (!isNaN(num) && num > maxNum) maxNum = num
  }

  const nextNumber = maxNum + 1
  const invoiceNo  = `${prefix}${nextNumber}`

  return NextResponse.json(
    { invoice_no: invoiceNo, next_number: nextNumber, month: mm },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    }
  )
}

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const revalidate = 0
