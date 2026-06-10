'use client'
import { useEffect, useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { Customer } from '@/types'
import { fetcher } from '@/lib/fetcher'
import { Search, Plus, Edit2, Trash2, X, Check, MapPin, CheckCircle, Phone, ChevronRight } from 'lucide-react'
import { TableSkeleton } from '@/components/ui/Skeletons'

type Mode = 'list' | 'add' | 'edit'

export default function CustomersPage() {
  const [search, setSearch]       = useState('')
  const [mode, setMode]           = useState<Mode>('list')
  const [selected, setSelected]   = useState<Customer | null>(null)
  const [form, setForm]           = useState({ name: '', area: '', phone: '' })
  const [saving, setSaving]       = useState(false)
  const [toast, setToast]         = useState('')

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  // Debounced search term drives the SWR key
  const [debouncedSearch, setDebouncedSearch] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const { data, isLoading: loading, mutate } = useSWR<Customer[]>(
    `/api/customers?search=${encodeURIComponent(debouncedSearch)}`, fetcher,
    { revalidateOnFocus: true, keepPreviousData: true }
  )
  const customers = Array.isArray(data) ? data : []
  const fetchCustomers = (_q?: string) => mutate()

  const openAdd  = () => { setForm({ name: '', area: '', phone: '' }); setMode('add') }
  const openEdit = (c: Customer) => { setSelected(c); setForm({ name: c.name, area: c.area, phone: c.phone || '' }); setMode('edit') }
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
            <div>
              <label className="label">Phone Number</label>
              <input className="input-field" type="tel" inputMode="tel" placeholder="10-digit mobile number" value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
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
              <Link href={`/customers/${c.id}`} className="flex-1 min-w-0 group">
                <p className="font-bold text-gray-800 text-lg truncate group-hover:text-orange-600 transition-colors flex items-center gap-1">
                  {c.name}
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-orange-400" />
                </p>
                <div className="flex items-center gap-3 mt-0.5">
                  {c.area && (
                    <span className="flex items-center gap-1 text-sm text-gray-500">
                      <MapPin className="w-3.5 h-3.5" />{c.area}
                    </span>
                  )}
                  {c.phone && (
                    <span className="flex items-center gap-1 text-sm text-gray-500">
                      <Phone className="w-3.5 h-3.5" />{c.phone}
                    </span>
                  )}
                </div>
              </Link>
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
