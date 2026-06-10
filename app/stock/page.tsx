'use client'
import { useState } from 'react'
import useSWR from 'swr'
import { StockEntry, OilStock } from '@/types'
import { OIL_TYPES, formatDate } from '@/lib/constants'
import { fetcher } from '@/lib/fetcher'
import { TableSkeleton } from '@/components/ui/Skeletons'
import {
  Package, Plus, Trash2, X, Check, CheckCircle, AlertTriangle,
  Factory, Wrench, Info
} from 'lucide-react'

const LOW_STOCK_THRESHOLD = 10 // jars

const blankForm = () => ({
  oil_type_id: OIL_TYPES[0].id,
  quantity: '',
  entry_type: 'production' as 'production' | 'adjustment',
  date: new Date().toISOString().split('T')[0],
  notes: '',
})

export default function StockPage() {
  const [toast, setToast]     = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]       = useState(blankForm)
  const [saving, setSaving]   = useState(false)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const { data, error: swrError, isLoading: loading, mutate } =
    useSWR<{ stock: OilStock[]; entries: StockEntry[] }>('/api/stock', fetcher, {
      revalidateOnFocus: true,
      keepPreviousData: true,
    })
  const stock   = data?.stock || []
  const entries = data?.entries || []
  const error   = swrError ? 'Could not load stock. Please try again.' : ''
  const fetchStock = () => mutate()

  const save = async () => {
    const qty = Number(form.quantity)
    if (!qty) return
    setSaving(true)
    const oil = OIL_TYPES.find(o => o.id === form.oil_type_id)
    const res = await fetch('/api/stock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        oil_type_id: form.oil_type_id,
        oil_name: oil?.name || form.oil_type_id,
        quantity: qty,
        entry_type: form.entry_type,
        date: form.date,
        notes: form.notes,
      }),
    })
    setSaving(false)
    if (res.ok) {
      setForm(blankForm())
      setShowForm(false)
      showToast('Stock entry added!')
      fetchStock()
    } else {
      const d = await res.json().catch(() => ({}))
      showToast(d.error || 'Could not save entry.')
    }
  }

  const removeEntry = async (e: StockEntry) => {
    if (!confirm(`Delete this entry? ${e.oil_name}: ${e.quantity > 0 ? '+' : ''}${e.quantity} jars on ${formatDate(e.date)}`)) return
    await fetch(`/api/stock?id=${e.id}`, { method: 'DELETE' })
    showToast('Entry deleted.')
    fetchStock()
  }

  if (loading) return <TableSkeleton />

  return (
    <div className="space-y-4">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-500 text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-2 font-semibold text-sm animate-toast-in">
          <CheckCircle className="w-5 h-5" /> {toast}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Stock</h1>
        <button onClick={() => setShowForm(s => !s)} className="btn-primary flex items-center gap-2 py-2 px-4 text-base">
          <Plus className="w-5 h-5" /> Add Production
        </button>
      </div>

      {error && (
        <div className="card border-2 border-red-100 bg-red-50 text-red-700 text-sm flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" /> {error}
        </div>
      )}

      {/* Add entry form */}
      {showForm && (
        <div className="card border-2 border-orange-200 bg-orange-50">
          <h2 className="font-bold text-gray-800 mb-4">
            {form.entry_type === 'production' ? 'Add Produced Jars' : 'Stock Adjustment'}
          </h2>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Oil Type *</label>
                <select className="input-field" value={form.oil_type_id}
                  onChange={e => setForm(f => ({ ...f, oil_type_id: e.target.value }))}>
                  {OIL_TYPES.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Jars *</label>
                <input className="input-field" type="number" inputMode="numeric" placeholder="e.g. 50" value={form.quantity}
                  onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Date</label>
                <input className="input-field" type="date" value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div>
                <label className="label">Type</label>
                <select className="input-field" value={form.entry_type}
                  onChange={e => setForm(f => ({ ...f, entry_type: e.target.value as 'production' | 'adjustment' }))}>
                  <option value="production">Production</option>
                  <option value="adjustment">Adjustment / Opening stock</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label">Notes</label>
              <input className="input-field" placeholder="e.g. Batch from tanker on 5 June" value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={save} disabled={saving || !Number(form.quantity)} className="btn-primary flex items-center gap-2 flex-1 justify-center">
                <Check className="w-5 h-5" /> {saving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => setShowForm(false)} className="btn-secondary flex items-center gap-2">
                <X className="w-5 h-5" /> Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Current stock */}
      {stock.length === 0 && !error ? (
        <div className="card text-center py-12 text-gray-400">
          <Package className="w-10 h-10 mx-auto mb-3 text-amber-300" />
          <p className="font-semibold text-gray-600">No stock tracked yet</p>
          <p className="text-sm mt-1 max-w-sm mx-auto">
            Add an <b>Adjustment / Opening stock</b> entry for each oil with the jars you currently
            have. From then on, add a <b>Production</b> entry whenever you fill jars — sales are
            subtracted automatically from your bills.
          </p>
        </div>
      ) : stock.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stock.map(s => {
              const low = s.balance < LOW_STOCK_THRESHOLD
              return (
                <div key={s.oil_type_id}
                  className={`card border-2 ${low ? 'border-red-200 bg-red-50' : 'border-green-100 bg-green-50'}`}>
                  <p className="text-xs text-gray-500 font-medium truncate">{s.oil_name}</p>
                  <p className={`text-2xl font-bold mt-1 ${low ? 'text-red-600' : 'text-green-700'}`}>
                    {s.balance} <span className="text-sm font-semibold">jars</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {s.produced} in · {s.sold} sold
                  </p>
                  {low && (
                    <p className="text-xs text-red-500 font-semibold mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Low stock
                    </p>
                  )}
                </div>
              )
            })}
          </div>
          <p className="text-xs text-gray-400 flex items-start gap-1.5 px-1">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            Sold jars are counted from bills dated on or after the first stock entry of each oil type.
            Custom (non-listed) oil items on bills are not tracked.
          </p>
        </>
      )}

      {/* Entry history */}
      {entries.length > 0 && (
        <div className="card">
          <h2 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
            <Factory className="w-4 h-4" /> Production History
          </h2>
          <div className="space-y-2">
            {entries.map(e => (
              <div key={e.id} className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-gray-100">
                <div className="flex items-center gap-2.5 min-w-0">
                  {e.entry_type === 'production'
                    ? <Factory className="w-4 h-4 text-green-500 shrink-0" />
                    : <Wrench className="w-4 h-4 text-blue-500 shrink-0" />}
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800 text-sm truncate">
                      {e.oil_name} <span className={e.quantity >= 0 ? 'text-green-600' : 'text-red-500'}>
                        {e.quantity >= 0 ? '+' : ''}{e.quantity} jars
                      </span>
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {formatDate(e.date)}{e.notes ? ` · ${e.notes}` : ''}{e.entry_type === 'adjustment' ? ' · adjustment' : ''}
                    </p>
                  </div>
                </div>
                <button onClick={() => removeEntry(e)} className="p-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl transition-all shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
