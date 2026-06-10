import { SupabaseClient } from '@supabase/supabase-js'
import { StockEntry, OilStock, BillItem } from '@/types'

// Per oil type: produced = sum of stock entries; sold = jars on bills dated
// on/after the first stock entry for that oil. Items match by oil_type_id,
// falling back to case-insensitive oil name (covers bills created before
// the oil-type dropdown existed).
export async function computeStock(db: SupabaseClient): Promise<{ stock: OilStock[]; entries: StockEntry[] }> {
  const [{ data: entries, error: entriesErr }, { data: bills, error: billsErr }] = await Promise.all([
    db.from('stock_entries').select('*').order('date', { ascending: false }).order('created_at', { ascending: false }),
    db.from('bills').select('date, items'),
  ])
  if (entriesErr) throw new Error(entriesErr.message)
  if (billsErr) throw new Error(billsErr.message)

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
  return { stock, entries: (entries || []) as StockEntry[] }
}
