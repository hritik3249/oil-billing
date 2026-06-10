import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { checkAuth } from '@/lib/auth-server'
import { StockEntry, OilStock, BillItem } from '@/types'

const NO_CACHE = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
}

export async function GET(req: NextRequest) {
  if (!(await checkAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = supabaseAdmin()

  const [{ data: entries, error: entriesErr }, { data: bills, error: billsErr }] = await Promise.all([
    db.from('stock_entries').select('*').order('date', { ascending: false }).order('created_at', { ascending: false }),
    db.from('bills').select('date, items'),
  ])
  if (entriesErr) return NextResponse.json({ error: entriesErr.message }, { status: 500, headers: NO_CACHE })
  if (billsErr)   return NextResponse.json({ error: billsErr.message }, { status: 500, headers: NO_CACHE })

  // Per oil type: produced = sum of entries; sold = jars on bills dated on/after
  // the first stock entry for that oil (sales before tracking began don't count).
  const byOil = new Map<string, OilStock>()
  for (const e of (entries || []) as StockEntry[]) {
    let s = byOil.get(e.oil_type_id)
    if (!s) {
      s = { oil_type_id: e.oil_type_id, oil_name: e.oil_name, produced: 0, sold: 0, balance: 0, tracking_since: e.date }
      byOil.set(e.oil_type_id, s)
    }
    s.produced += Number(e.quantity)
    if (!s.tracking_since || e.date < s.tracking_since) s.tracking_since = e.date
  }

  // Fallback: bills created before the oil-type dropdown existed have
  // oil_type_id 'custom', so also match items by oil name (case-insensitive)
  const byName = new Map<string, OilStock>()
  Array.from(byOil.values()).forEach(s => byName.set(s.oil_name.trim().toLowerCase(), s))

  for (const bill of bills || []) {
    for (const item of (bill.items || []) as BillItem[]) {
      const s = byOil.get(item.oil_type_id)
        ?? byName.get((item.oil_name || '').trim().toLowerCase())
      if (s && s.tracking_since && bill.date >= s.tracking_since) {
        s.sold += Number(item.quantity)
      }
    }
  }

  const stock = Array.from(byOil.values()).map(s => ({ ...s, balance: s.produced - s.sold }))
  return NextResponse.json({ stock, entries: entries || [] }, { headers: NO_CACHE })
}

export async function POST(req: NextRequest) {
  if (!(await checkAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()

  const quantity = Number(body.quantity)
  if (!body.oil_type_id || !body.oil_name || !Number.isFinite(quantity) || quantity === 0) {
    return NextResponse.json({ error: 'oil type and a non-zero quantity are required' }, { status: 400 })
  }

  const db = supabaseAdmin()
  const { data, error } = await db.from('stock_entries').insert({
    oil_type_id: body.oil_type_id,
    oil_name:    body.oil_name,
    quantity,
    entry_type:  body.entry_type === 'adjustment' ? 'adjustment' : 'production',
    date:        body.date || new Date().toISOString().split('T')[0],
    notes:       body.notes || '',
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: NO_CACHE })
  return NextResponse.json(data, { status: 201, headers: NO_CACHE })
}

export async function DELETE(req: NextRequest) {
  if (!(await checkAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  const db = supabaseAdmin()
  const { error } = await db.from('stock_entries').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: NO_CACHE })
  return NextResponse.json({ success: true }, { headers: NO_CACHE })
}

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const revalidate = 0
