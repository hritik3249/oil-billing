import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { checkAuth } from '@/lib/auth-server'
import { computeStock } from '@/lib/stock'

const NO_CACHE = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
}

export async function GET(req: NextRequest) {
  if (!(await checkAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { stock, entries } = await computeStock(supabaseAdmin())
    return NextResponse.json({ stock, entries }, { headers: NO_CACHE })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Stock error' }, { status: 500, headers: NO_CACHE })
  }
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
