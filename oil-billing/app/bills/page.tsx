'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Bill } from '@/types'
import { formatCurrency, formatDate } from '@/lib/constants'
import { Search, Plus, Filter, AlertCircle, Car, Trash2, CheckCircle } from 'lucide-react'
import { BillsListSkeleton } from '@/components/ui/Skeletons'

export default function BillsPage() {
  const [bills, setBills]       = useState<Bill[]>([])
  const [search, setSearch]     = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]     = useState('')
  const [dueOnly, setDueOnly]   = useState(false)
  const [loading, setLoading]   = useState(true)
  const [toast, setToast]       = useState('')
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const fetchBills = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search)   params.set('search', search)
    if (dateFrom) params.set('date_from', dateFrom)
    if (dateTo)   params.set('date_to', dateTo)
    if (dueOnly)  params.set('due_only', 'true')
    const res = await fetch(`/api/bills?${params}`)
    const data = await res.json()
    setBills(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { fetchBills() }, [dueOnly])
  useEffect(() => {
    const t = setTimeout(fetchBills, 350)
    return () => clearTimeout(t)
  }, [search, dateFrom, dateTo])

  const deleteBill = async (id: string) => {
    const res = await fetch(`/api/bills?id=${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.success) {
      setBills(prev => prev.filter(b => b.id !== id))
      showToast('🗑 Bill deleted successfully')
    } else {
      showToast('❌ Error deleting bill')
    }
    setConfirmId(null)
  }

  return (
    <div className="space-y-4">

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-2 font-semibold text-sm whitespace-nowrap">
          <CheckCircle className="w-5 h-5 text-green-400 shrink-0" /> {toast}
        </div>
      )}

      {/* Confirm delete modal */}
      {confirmId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-center w-14 h-14 bg-red-100 rounded-2xl mx-auto mb-4">
              <Trash2 className="w-7 h-7 text-red-500" />
            </div>
            <h3 className="font-bold text-gray-800 text-lg text-center mb-1">Delete Bill?</h3>
            <p className="text-gray-500 text-sm text-center mb-5">This action cannot be undone. The bill will be permanently deleted.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmId(null)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteBill(confirmId)}
                className="btn-danger flex-1 flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Bills</h1>
        <Link href="/bills/new" className="btn-primary flex items-center gap-2 py-2 px-4 text-base">
          <Plus className="w-5 h-5" /> New
        </Link>
      </div>

      {/* Filters */}
      <div className="card space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input className="input-field pl-11" placeholder="Search customer name..." value={search}
            onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="label flex items-center gap-1"><Filter className="w-3.5 h-3.5" />From</label>
            <input type="date" className="input-field" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div className="flex-1">
            <label className="label">To</label>
            <input type="date" className="input-field" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
        </div>
        <button onClick={() => setDueOnly(!dueOnly)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 font-semibold text-sm transition-all
            ${dueOnly ? 'bg-red-500 border-red-500 text-white' : 'border-gray-200 text-gray-600 hover:border-red-300'}`}
        >
          <AlertCircle className="w-4 h-4" /> Due Bills Only
        </button>
      </div>

      {/* Bill list */}
      {loading ? (
        <BillsListSkeleton />
      ) : bills.length === 0 ? (
        <div className="card text-center py-10 text-gray-400">No bills found.</div>
      ) : (
        <div className="space-y-2">
          {bills.map(bill => (
            <div key={bill.id} className="card flex items-center gap-3 border-2 border-transparent hover:border-orange-100 transition-all py-4">

              {/* Clickable bill info */}
              <Link href={`/bills/${bill.id}`} className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-gray-800 text-base">{bill.customer_name}</p>
                  {bill.due_amount > 0 && (
                    <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">Due</span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{bill.bill_number} · {formatDate(bill.date)} · {bill.customer_area}</p>
                {bill.vehicle_number && (
                  <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                    <Car className="w-3.5 h-3.5" />{bill.vehicle_number}
                  </div>
                )}
              </Link>

              {/* Amount + delete */}
              <div className="flex items-center gap-3 shrink-0">
                <Link href={`/bills/${bill.id}`} className="text-right">
                  <p className="font-bold text-gray-800 text-lg">{formatCurrency(bill.total_amount)}</p>
                  {bill.due_amount > 0
                    ? <p className="text-sm text-red-500 font-semibold">Due: {formatCurrency(bill.due_amount)}</p>
                    : <p className="text-sm text-green-500 font-semibold">Paid ✓</p>
                  }
                </Link>
                <button
                  onClick={() => setConfirmId(bill.id)}
                  className="p-2.5 bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-500 rounded-xl transition-all shrink-0"
                  title="Delete bill"
                >
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
