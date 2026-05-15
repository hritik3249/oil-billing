'use client'
import { useEffect, useState, useCallback } from 'react'
import { Customer } from '@/types'
import { Search, Plus, Edit2, Trash2, X, Check, MapPin, CheckCircle } from 'lucide-react'
import { TableSkeleton } from '@/components/ui/Skeletons'

type Mode = 'list' | 'add' | 'edit'

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch]       = useState('')
  const [loading, setLoading]     = useState(true)
  const [mode, setMode]           = useState<Mode>('list')
  const [selected, setSelected]   = useState<Customer | null>(null)
  const [form, setForm]           = useState({ name: '', area: '' })
  const [saving, setSaving]       = useState(false)
  const [toast, setToast]         = useState('')

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const fetchCustomers = useCallback(async (q = search) => {
    setLoading(true)
    const res = await fetch(`/api/customers?search=${encodeURIComponent(q)}`)
    const data = await res.json()
    setCustomers(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [search])

  useEffect(() => { fetchCustomers('') }, [])

  useEffect(() => {
    const t = setTimeout(() => fetchCustomers(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const openAdd  = () => { setForm({ name: '', area: '' }); setMode('add') }
  const openEdit = (c: Customer) => { setSelected(c); setForm({ name: c.name, area: c.area }); setMode('edit') }
  const cancel   = () => { setMode('list'); setSelected(null) }

  const save = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    const isEdit = mode === 'edit'
    await fetch('/api/customers', {
      method: isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(isEdit ? { ...form, id: selected?.id, vehicle_number: '' } : { ...form, vehicle_number: '' }),
    })
    setSaving(false)
    cancel()
    fetchCustomers(search)
    showToast(isEdit ? 'Customer updated!' : 'Customer added!')
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this customer?')) return
    await fetch(`/api/customers?id=${id}`, { method: 'DELETE' })
    fetchCustomers(search)
    showToast('Customer deleted.')
  }

  return (
    <div className="space-y-4">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-500 text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-2 font-semibold text-sm animate-bounce">
          <CheckCircle className="w-5 h-5" /> {toast}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Customers</h1>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2 py-2 px-4 text-base">
          <Plus className="w-5 h-5" /> Add
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input className="input-field pl-11" placeholder="Search by customer name..." value={search}
          onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Add / Edit Form */}
      {(mode === 'add' || mode === 'edit') && (
        <div className="card border-2 border-orange-200 bg-orange-50">
          <h2 className="font-bold text-gray-800 mb-4">{mode === 'add' ? 'Add Customer' : 'Edit Customer'}</h2>
          <div className="space-y-3">
            <div>
              <label className="label">Customer Name *</label>
              <input className="input-field" placeholder="Full name" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
            </div>
            <div>
              <label className="label">Area / Location</label>
              <input className="input-field" placeholder="Village / Town / Area" value={form.area}
                onChange={e => setForm(f => ({ ...f, area: e.target.value }))} />
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={save} disabled={saving || !form.name.trim()} className="btn-primary flex items-center gap-2 flex-1 justify-center">
                <Check className="w-5 h-5" /> {saving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={cancel} className="btn-secondary flex items-center gap-2">
                <X className="w-5 h-5" /> Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <TableSkeleton />
      ) : customers.length === 0 ? (
        <div className="card text-center py-10 text-gray-400">
          {search ? 'No customers found.' : 'No customers yet. Add your first one!'}
        </div>
      ) : (
        <div className="space-y-2">
          {customers.map(c => (
            <div key={c.id} className="card flex items-center justify-between gap-3 py-4">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-800 text-lg truncate">{c.name}</p>
                {c.area && (
                  <span className="flex items-center gap-1 text-sm text-gray-500 mt-0.5">
                    <MapPin className="w-3.5 h-3.5" />{c.area}
                  </span>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => openEdit(c)} className="p-2.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl transition-all">
                  <Edit2 className="w-5 h-5" />
                </button>
                <button onClick={() => remove(c.id)} className="p-2.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl transition-all">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
