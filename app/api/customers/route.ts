import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { checkAuth } from '@/lib/auth-server'

export async function GET(req: NextRequest) {
  if (!(await checkAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') || ''
  const id = searchParams.get('id')
  const db = supabaseAdmin()

  if (id) {
    const { data, error } = await db.from('customers').select('*').eq('id', id).single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  let query = db.from('customers').select('*').order('name')
  if (search) query = query.ilike('name', `%${search}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  if (!(await checkAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const db = supabaseAdmin()

  const { data, error } = await db
    .from('customers')
    .insert({ name: body.name, area: body.area, phone: body.phone || '', vehicle_number: body.vehicle_number })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PUT(req: NextRequest) {
  if (!(await checkAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const db = supabaseAdmin()

  const { data, error } = await db
    .from('customers')
    .update({ name: body.name, area: body.area, phone: body.phone || '', vehicle_number: body.vehicle_number })
    .eq('id', body.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  if (!(await checkAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const db = supabaseAdmin()

  const { error } = await db.from('customers').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// Tell Next.js this route is dynamic (no static cache)
export const dynamic = 'force-dynamic'
