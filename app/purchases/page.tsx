'use client'
import { useEffect, useState } from 'react'
import { Purchase, PURCHASE_CATEGORIES, Payment } from '@/types'
import { formatCurrency, formatDate } from '@/lib/constants'
import { TableSkeleton } from '@/components/ui/Skeletons'
import {
  ShoppingCart, Plus, Trash2, X, CheckCircle, Save,
  Filter, AlertCircle, ChevronDown, IndianRupee
} from 'lucide-react'

export default function PurchasesPage() {
  const [purchases, setPurchases]       = useState<Purchase[]>([])
  const [loading, setLoading]           = useState(true)
  const [toast, setToast]               = useState('')
  const [showForm, setShowForm]         = useState(false)
  const [expanded, setExpanded]         = useState<string | null>(null)

  // Filters
  const [filterCat, setFilterCat]   = useState('')
  const [dateFrom, setDateFrom]     = useState('')
  const [dateTo, setDateTo]         = useState('')
  const [dueOnly, setDueOnly]       = useState(false)

  // New purchase form
  const [form, setForm] = useState({
    category: PURCHASE_CATEGORIES[0] as string,
    description: '', supplier: '', amount: '',
    amount_paid: '', date: new Date().toISOString().split('T')[0], notes: '',
  })
  const [saving, setSaving] = useState(false)

  // Add payment form
  const [showPayForm, setShowPayForm]   = useState<string | null>(null)
  const [payAmount, setPayAmount]       = useState<number | ''>('')
  const [payDate, setPayDate]           = useState(new Date().toISOString().split('T')[0])
  const [payNote, setPayNote]           = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const fetchPurchases = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterCat) params.set('category', filterCat)
    if (dateFrom)  params.set('date_from', dateFrom)
    if (dateTo)    params.set('date_to', dateTo)
    if (dueOnly)   params.set('due_only', 'true')
    const res = await fetch(`/api/purchases?${params}`)
    const data = await res.json()
    setPurchases(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { fetchPurchases() }, [filterCat, dateFrom, dateTo, dueOnly])

  const savePurchase = async () => {
    if (!form.amount || Number(form.amount) <= 0) { showToast('⚠️ Enter a valid amount'); return }
    setSaving(true)
    const res = await fetch('/api/purchases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, amount: Number(form.amount), amount_paid: Number(form.amount_paid || 0) }),
    })
    const data = await res.json()
    if (data.id) {
      showToast('✅ Purchase added!')
      setShowForm(false)
      setForm({ category: PURCHASE_CATEGORIES[0], description: '', supplier: '', amount: '', amount_paid: '', date: new Date().toISOString().split('T')[0], notes: '' })
      fetchPurchases()
    } else { showToast('❌ ' + (data.error || 'Error')) }
    setSaving(false)
  }

  const deletePurchase = async (id: string) => {
    if (!confirm('Delete this purchase?')) return
    await fetch(`/api/purchases?id=${id}`, { method: 'DELETE' })
    setPurchases(prev => prev.filter(p => p.id !== id))
    showToast('🗑 Purchase deleted')
  }

  const addPayment = async (purchaseId: string) => {
    if (!payAmount || Number(payAmount) <= 0) return
    const res = await fetch('/api/purchases', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: purchaseId, action: 'add_payment', payment: { date: payDate, amount: Number(payAmount), note: payNote } }),
    })
    const data = await res.json()
    if (data.id) {
      setPurchases(prev => prev.map(p => p.id === data.id ? { ...data, payments: data.payments || [] } : p))
      setShowPayForm(null); setPayAmount(''); setPayNote('')
      setPayDate(new Date().toISOString().split('T')[0])
      showToast('✅ Payment recorded!')
    }
  }

  const deletePayment = async (purchaseId: string, paymentId: string) => {
    if (!confirm('Remove this payment?')) return
    const res = await fetch('/api/purchases', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: purchaseId, action: 'delete_payment', payment_id: paymentId }),
    })
    const data = await res.json()
    if (data.id) setPurchases(prev => prev.map(p => p.id === data.id ? { ...data, payments: data.payments || [] } : p))
  }

  const totalShown = purchases.reduce((s, p) => s + p.amount, 0)
  const totalDue   = purchases.reduce((s, p) => s + p.due_amount, 0)

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-2 font-semibold text-sm whitespace-nowrap">
          <CheckCircle className="w-5 h-5 text-green-400 shrink-0" /> {toast}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Purchases</h1>
          <p className="text-sm text-gray-400">{purchases.length} records · {formatCurrency(totalShown)} total</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2 py-2 px-4 text-base">
          <Plus className="w-5 h-5" /> Add
        </button>
      </div>

      {/* Due summary */}
      {totalDue > 0 && (
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl px-4 py-3 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-red-700 font-semibold text-sm">Total purchase dues: <span className="text-base">{formatCurrency(totalDue)}</span></p>
        </div>
      )}

      {/* Add Purchase Form */}
      {showForm && (
        <div className="card border-2 border-orange-200 bg-orange-50 space-y-3">
          <h2 className="font-bold text-gray-800">New Purchase</h2>
          <div>
            <label className="label">Category *</label>
            <div className="relative">
              <select className="input-field appearance-none pr-10" value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {PURCHASE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="label">Description</label>
            <input className="input-field" placeholder="e.g. 500L Rice Oil from supplier..." value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Supplier (optional)</label>
              <input className="input-field" placeholder="Supplier name" value={form.supplier}
                onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} />
            </div>
            <div>
              <label className="label">Date *</label>
              <input type="date" className="input-field" value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label className="label">Total Amount (₹) *</label>
              <input type="number" min="0" className="input-field font-bold" placeholder="0"
                value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                onFocus={e => e.target.select()} />
            </div>
            <div>
              <label className="label">Amount Paid (₹)</label>
              <input type="number" min="0" className="input-field" placeholder="0"
                value={form.amount_paid} onChange={e => setForm(f => ({ ...f, amount_paid: e.target.value }))}
                onFocus={e => e.target.select()} />
            </div>
          </div>
          <div>
            <label className="label">Notes (optional)</label>
            <textarea className="input-field resize-none" rows={2} placeholder="Any remarks..."
              value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="flex gap-2">
            <button onClick={savePurchase} disabled={saving || !form.amount}
              className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50">
              <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Purchase'}
            </button>
            <button onClick={() => setShowForm(false)} className="btn-secondary px-4"><X className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card space-y-3">
        <div className="relative">
          <select className="input-field appearance-none pr-10" value={filterCat}
            onChange={e => setFilterCat(e.target.value)}>
            <option value="">All Categories</option>
            {PURCHASE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="label text-xs">From</label>
            <input type="date" className="input-field" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div className="flex-1">
            <label className="label text-xs">To</label>
            <input type="date" className="input-field" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
        </div>
        <button onClick={() => setDueOnly(!dueOnly)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 font-semibold text-sm transition-all
            ${dueOnly ? 'bg-red-500 border-red-500 text-white' : 'border-gray-200 text-gray-600 hover:border-red-300'}`}>
          <AlertCircle className="w-4 h-4" /> Due Only
        </button>
      </div>

      {/* Purchase list */}
      {loading ? (
        <TableSkeleton />
      ) : purchases.length === 0 ? (
        <div className="card text-center py-10 text-gray-400">No purchases found.</div>
      ) : (
        <div className="space-y-2">
          {purchases.map(p => {
            const isSalary = p.category === 'Employee Salary'
            return (
            <div key={p.id} className="card p-0 overflow-hidden">
              {/* Main row */}
              <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={() => setExpanded(expanded === p.id ? null : p.id)}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isSalary ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                      {p.category}
                    </span>
                    {isSalary && (
                      <span className="text-xs font-semibold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                        Auto · Employees
                      </span>
                    )}
                    {p.due_amount > 0 && <span className="text-xs font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Due</span>}
                  </div>
                  {isSalary ? (
                    // Salary: show employee name + month prominently
                    <>
                      <p className="font-bold text-gray-800 mt-1">{p.supplier}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{p.description.replace(`Salary – ${p.supplier} `, '')}</p>
                      <p className="text-xs text-gray-400">{formatDate(p.date)}</p>
                    </>
                  ) : (
                    <>
                      <p className="font-semibold text-gray-800 mt-1 truncate">{p.description || p.category}</p>
                      <p className="text-xs text-gray-400">{formatDate(p.date)}{p.supplier ? ` · ${p.supplier}` : ''}</p>
                    </>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-gray-800 text-base">{formatCurrency(p.amount)}</p>
                  {p.due_amount > 0
                    ? <p className="text-xs text-red-500 font-semibold">Due: {formatCurrency(p.due_amount)}</p>
                    : <p className="text-xs text-green-500 font-semibold">Paid ✓</p>}
                </div>
                {/* Only allow manual deletion for non-salary entries */}
                {!isSalary && (
                  <button onClick={e => { e.stopPropagation(); deletePurchase(p.id) }}
                    className="p-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Expanded payment section */}
              {expanded === p.id && (
                <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-gray-700 text-sm flex items-center gap-1.5">
                      <IndianRupee className="w-4 h-4 text-orange-500" /> Payment History
                    </h3>
                    {p.due_amount > 0 && (
                      <button onClick={() => setShowPayForm(showPayForm === p.id ? null : p.id)}
                        className="flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white text-xs font-bold px-3 py-2 rounded-xl">
                        <Plus className="w-3.5 h-3.5" /> Add Payment
                      </button>
                    )}
                  </div>

                  {showPayForm === p.id && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="label text-xs">Amount (₹) *</label>
                          <input type="number" className="input-field font-bold" placeholder="0"
                            value={payAmount} onChange={e => setPayAmount(e.target.value === '' ? '' : Number(e.target.value))}
                            onFocus={e => e.target.select()} autoFocus />
                        </div>
                        <div>
                          <label className="label text-xs">Date</label>
                          <input type="date" className="input-field" value={payDate}
                            onChange={e => setPayDate(e.target.value)} />
                        </div>
                      </div>
                      <input className="input-field text-sm" placeholder="Note (Cash / UPI / Cheque...)"
                        value={payNote} onChange={e => setPayNote(e.target.value)} />
                      <div className="flex gap-2">
                        <button onClick={() => addPayment(p.id)} disabled={!payAmount}
                          className="btn-success flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm disabled:opacity-50">
                          <Save className="w-4 h-4" /> Record
                        </button>
                        <button onClick={() => setShowPayForm(null)} className="btn-secondary px-3"><X className="w-4 h-4" /></button>
                      </div>
                    </div>
                  )}

                  {(p.payments || []).length === 0 ? (
                    <p className="text-gray-400 text-xs text-center py-2">No payments recorded yet.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {(p.payments as Payment[]).map((pay, i) => (
                        <div key={pay.id} className="flex items-center justify-between bg-white rounded-xl px-3 py-2.5 text-sm border border-gray-100">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-xs font-bold">{i+1}</span>
                            <div>
                              <span className="font-semibold text-gray-800">{formatCurrency(pay.amount)}</span>
                              <span className="text-gray-400 ml-2 text-xs">{formatDate(pay.date)}{pay.note ? ` · ${pay.note}` : ''}</span>
                            </div>
                          </div>
                          <button onClick={() => deletePayment(p.id, pay.id)} className="p-1.5 text-red-400 hover:text-red-600 rounded-lg">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      <div className="flex justify-between text-sm pt-1 border-t border-gray-200 font-semibold">
                        <span className="text-green-600">Paid: {formatCurrency(p.amount_paid)}</span>
                        {p.due_amount > 0 && <span className="text-red-500">Due: {formatCurrency(p.due_amount)}</span>}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
