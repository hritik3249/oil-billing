'use client'
import { useEffect, useMemo, useState } from 'react'
import { Purchase, PURCHASE_CATEGORIES, Payment } from '@/types'
import { formatCurrency, formatDate } from '@/lib/constants'
import { TableSkeleton } from '@/components/ui/Skeletons'
import {
  ShoppingCart, Plus, Trash2, X, CheckCircle, Save,
  AlertCircle, ChevronDown, ChevronLeft, ChevronUp, IndianRupee,
  Store, ReceiptText, Edit2
} from 'lucide-react'

type CategoryGroup = {
  category: string
  purchases: Purchase[]
  supplier_count: number
  total: number
  paid: number
  due: number
  latest_date: string
}

type MonthGroup = {
  key: string
  label: string
  purchases: Purchase[]
  category_count: number
  supplier_count: number
  total: number
  paid: number
  due: number
  latest_date: string
}

type SupplierGroup = {
  key: string
  supplier: string
  purchases: Purchase[]
  total: number
  paid: number
  due: number
  latest_date: string
}

const blankPurchaseForm = () => ({
  category: PURCHASE_CATEGORIES[0] as string,
  description: '',
  supplier: '',
  amount: '',
  amount_paid: '',
  date: new Date().toISOString().split('T')[0],
  notes: '',
})

const supplierKey = (supplier: string) => {
  const normalized = supplier.trim().toLowerCase()
  return normalized || 'no-supplier'
}

const supplierLabel = (supplier: string) => supplier.trim() || 'No Supplier'

const purchaseMonthKey = (date: string) => date.slice(0, 7)

const monthLabel = (month: string) => {
  const [year, monthNum] = month.split('-').map(Number)
  return new Date(year, monthNum - 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [expandedSupplier, setExpandedSupplier] = useState<string | null>(null)
  const [expandedPurchase, setExpandedPurchase] = useState<string | null>(null)

  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [dueOnly, setDueOnly] = useState(false)

  const [form, setForm] = useState(blankPurchaseForm)
  const [saving, setSaving] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    category: '',
    description: '',
    supplier: '',
    amount: '',
    date: '',
    notes: '',
  })

  const [showPayForm, setShowPayForm] = useState<string | null>(null)
  const [payAmount, setPayAmount] = useState<number | ''>('')
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0])
  const [payNote, setPayNote] = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const fetchPurchases = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (dateFrom) params.set('date_from', dateFrom)
    if (dateTo) params.set('date_to', dateTo)
    if (dueOnly) params.set('due_only', 'true')
    params.set('t', String(Date.now()))
    const res = await fetch(`/api/purchases?${params}`, { cache: 'no-store' })
    const data = await res.json()
    setPurchases(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { fetchPurchases() }, [dateFrom, dateTo, dueOnly])

  const savePurchase = async () => {
    if (!form.amount || Number(form.amount) <= 0) { showToast('Enter a valid amount'); return }
    setSaving(true)
    const res = await fetch('/api/purchases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, amount: Number(form.amount), amount_paid: Number(form.amount_paid || 0) }),
    })
    const data = await res.json()
    if (data.id) {
      showToast('Purchase added')
      setShowForm(false)
      setForm(blankPurchaseForm())
      fetchPurchases()
    } else {
      showToast(data.error || 'Error saving purchase')
    }
    setSaving(false)
  }

  const openEdit = (purchase: Purchase) => {
    if (purchase.category === 'Employee Salary') return
    setEditingId(purchase.id)
    setExpandedPurchase(purchase.id)
    setEditForm({
      category: purchase.category,
      description: purchase.description || '',
      supplier: purchase.supplier || '',
      amount: String(purchase.amount),
      date: purchase.date,
      notes: purchase.notes || '',
    })
  }

  const cancelEdit = () => setEditingId(null)

  const saveEditPurchase = async () => {
    if (!editingId || !editForm.amount || Number(editForm.amount) <= 0) {
      showToast('Enter a valid amount')
      return
    }

    setSaving(true)
    const res = await fetch('/api/purchases', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editingId,
        action: 'edit_purchase',
        ...editForm,
        amount: Number(editForm.amount),
      }),
    })
    const data = await res.json()
    if (data.id) {
      setPurchases(prev => prev.map(p => p.id === data.id ? { ...data, payments: data.payments || [] } : p))
      setEditingId(null)
      showToast('Purchase updated')
    } else {
      showToast(data.error || 'Error updating purchase')
    }
    setSaving(false)
  }

  const deletePurchase = async (id: string) => {
    if (!confirm('Delete this purchase?')) return
    await fetch(`/api/purchases?id=${id}`, { method: 'DELETE' })
    setPurchases(prev => prev.filter(p => p.id !== id))
    showToast('Purchase deleted')
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
      showToast('Payment recorded')
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

  const monthGroups = useMemo(() => {
    const groups = new Map<string, MonthGroup>()

    purchases.forEach(purchase => {
      const key = purchaseMonthKey(purchase.date)
      const current = groups.get(key)
      if (!current) {
        groups.set(key, {
          key,
          label: monthLabel(key),
          purchases: [purchase],
          category_count: 0,
          supplier_count: 0,
          total: purchase.amount,
          paid: purchase.amount_paid,
          due: purchase.due_amount,
          latest_date: purchase.date,
        })
        return
      }

      current.purchases.push(purchase)
      current.total += purchase.amount
      current.paid += purchase.amount_paid
      current.due += purchase.due_amount
      if (purchase.date > current.latest_date) current.latest_date = purchase.date
    })

    return Array.from(groups.values()).map(group => ({
      ...group,
      category_count: new Set(group.purchases.map(p => p.category)).size,
      supplier_count: new Set(group.purchases.map(p => supplierKey(p.supplier))).size,
    })).sort((a, b) => b.key.localeCompare(a.key))
  }, [purchases])

  const categoryGroups = useMemo(() => {
    const groups = new Map<string, CategoryGroup>()

    purchases
      .filter(purchase => !selectedMonth || purchaseMonthKey(purchase.date) === selectedMonth)
      .forEach(purchase => {
      const current = groups.get(purchase.category)
      if (!current) {
        groups.set(purchase.category, {
          category: purchase.category,
          purchases: [purchase],
          supplier_count: 0,
          total: purchase.amount,
          paid: purchase.amount_paid,
          due: purchase.due_amount,
          latest_date: purchase.date,
        })
        return
      }

      current.purchases.push(purchase)
      current.total += purchase.amount
      current.paid += purchase.amount_paid
      current.due += purchase.due_amount
      if (purchase.date > current.latest_date) current.latest_date = purchase.date
    })

    return Array.from(groups.values()).map(group => ({
      ...group,
      supplier_count: new Set(group.purchases.map(p => supplierKey(p.supplier))).size,
    })).sort((a, b) => {
      const preferred = PURCHASE_CATEGORIES.indexOf(a.category as typeof PURCHASE_CATEGORIES[number])
        - PURCHASE_CATEGORIES.indexOf(b.category as typeof PURCHASE_CATEGORIES[number])
      if (preferred !== 0) return preferred
      return a.category.localeCompare(b.category)
    })
  }, [purchases, selectedMonth])

  const supplierGroups = useMemo(() => {
    if (!selectedMonth || !selectedCategory) return []

    const groups = new Map<string, SupplierGroup>()
    purchases
      .filter(purchase => purchaseMonthKey(purchase.date) === selectedMonth && purchase.category === selectedCategory)
      .forEach(purchase => {
        const key = supplierKey(purchase.supplier)
        const current = groups.get(key)
        if (!current) {
          groups.set(key, {
            key,
            supplier: supplierLabel(purchase.supplier),
            purchases: [purchase],
            total: purchase.amount,
            paid: purchase.amount_paid,
            due: purchase.due_amount,
            latest_date: purchase.date,
          })
          return
        }

        current.purchases.push(purchase)
        current.total += purchase.amount
        current.paid += purchase.amount_paid
        current.due += purchase.due_amount
        if (purchase.date > current.latest_date) current.latest_date = purchase.date
      })

    return Array.from(groups.values()).sort((a, b) => {
      if (b.due !== a.due) return b.due - a.due
      return a.supplier.localeCompare(b.supplier)
    })
  }, [purchases, selectedMonth, selectedCategory])

  const totalShown = purchases.reduce((s, p) => s + p.amount, 0)
  const totalDue = purchases.reduce((s, p) => s + p.due_amount, 0)
  const selectedMonthTotal = monthGroups.find(g => g.key === selectedMonth)
  const selectedCategoryTotal = categoryGroups.find(g => g.category === selectedCategory)

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
          <p className="text-sm text-gray-400">
            {purchases.length} records · {monthGroups.length} months · {formatCurrency(totalShown)} total
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2 py-2 px-4 text-base">
          <Plus className="w-5 h-5" /> Add
        </button>
      </div>

      {totalDue > 0 && (
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl px-4 py-3 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-red-700 font-semibold text-sm">Total purchase dues: <span className="text-base">{formatCurrency(totalDue)}</span></p>
        </div>
      )}

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
              <label className="label">Supplier</label>
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
            <label className="label">Notes</label>
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

      <div className="card space-y-3">
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

      {loading ? (
        <TableSkeleton />
      ) : purchases.length === 0 ? (
        <div className="card text-center py-10 text-gray-400">No purchases found.</div>
      ) : !selectedMonth ? (
        <div className="space-y-3">
          {monthGroups.map(group => (
            <button
              key={group.key}
              onClick={() => { setSelectedMonth(group.key); setSelectedCategory(null); setExpandedSupplier(null); setExpandedPurchase(null); setEditingId(null) }}
              className="card w-full flex items-center gap-3 text-left border-2 border-transparent hover:border-orange-100 transition-all"
            >
              <div className="w-11 h-11 bg-orange-100 rounded-xl flex items-center justify-center shrink-0">
                <ShoppingCart className="w-6 h-6 text-orange-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-800 text-base">{group.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {group.purchases.length} purchases · {group.category_count} categories · {group.supplier_count} suppliers
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-gray-800">{formatCurrency(group.total)}</p>
                {group.due > 0
                  ? <p className="text-xs text-red-500 font-semibold">Due: {formatCurrency(group.due)}</p>
                  : <p className="text-xs text-green-500 font-semibold">Paid</p>}
              </div>
              <ChevronDown className="w-5 h-5 text-gray-400 shrink-0 -rotate-90" />
            </button>
          ))}
        </div>
      ) : !selectedCategory ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => { setSelectedMonth(null); setSelectedCategory(null); setExpandedSupplier(null); setExpandedPurchase(null); setEditingId(null) }}
              className="flex items-center gap-1.5 text-gray-500 hover:text-gray-800 font-semibold text-sm"
            >
              <ChevronLeft className="w-5 h-5" /> Months
            </button>
            {selectedMonthTotal && (
              <p className="text-sm font-bold text-gray-700">{selectedMonthTotal.label}</p>
            )}
          </div>

          {categoryGroups.map(group => (
            <button
              key={group.category}
              onClick={() => { setSelectedCategory(group.category); setExpandedSupplier(null); setExpandedPurchase(null); setEditingId(null) }}
              className="card w-full flex items-center gap-3 text-left border-2 border-transparent hover:border-orange-100 transition-all"
            >
              <div className="w-11 h-11 bg-orange-100 rounded-xl flex items-center justify-center shrink-0">
                <ShoppingCart className="w-6 h-6 text-orange-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-800 text-base">{group.category}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {group.purchases.length} purchases · {group.supplier_count} suppliers · Last {formatDate(group.latest_date)}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-gray-800">{formatCurrency(group.total)}</p>
                {group.due > 0
                  ? <p className="text-xs text-red-500 font-semibold">Due: {formatCurrency(group.due)}</p>
                  : <p className="text-xs text-green-500 font-semibold">Paid</p>}
              </div>
              <ChevronDown className="w-5 h-5 text-gray-400 shrink-0 -rotate-90" />
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => { setSelectedCategory(null); setExpandedSupplier(null); setExpandedPurchase(null); setEditingId(null) }}
              className="flex items-center gap-1.5 text-gray-500 hover:text-gray-800 font-semibold text-sm"
            >
              <ChevronLeft className="w-5 h-5" /> Categories
            </button>
            {selectedCategoryTotal && (
              <p className="text-sm font-bold text-gray-700">
                {selectedMonthTotal?.label} · {selectedCategoryTotal.category}
              </p>
            )}
          </div>

          {supplierGroups.map(group => {
            const isOpen = expandedSupplier === group.key
            return (
              <div key={group.key} className="card p-0 overflow-hidden">
                <button
                  onClick={() => setExpandedSupplier(isOpen ? null : group.key)}
                  className="w-full p-4 flex items-center gap-3 text-left"
                >
                  <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                    <Store className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 text-base truncate">{group.supplier}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {group.purchases.length} purchases · Last {formatDate(group.latest_date)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-gray-800">{formatCurrency(group.total)}</p>
                    {group.due > 0
                      ? <p className="text-xs text-red-500 font-semibold">Due: {formatCurrency(group.due)}</p>
                      : <p className="text-xs text-green-500 font-semibold">Paid</p>}
                  </div>
                  {isOpen ? <ChevronUp className="w-5 h-5 text-gray-400 shrink-0" /> : <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" />}
                </button>

                {isOpen && (
                  <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-white border border-gray-100 rounded-xl p-3">
                        <p className="text-xs text-gray-400">Total</p>
                        <p className="font-bold text-gray-800">{formatCurrency(group.total)}</p>
                      </div>
                      <div className="bg-white border border-gray-100 rounded-xl p-3">
                        <p className="text-xs text-gray-400">Paid</p>
                        <p className="font-bold text-green-600">{formatCurrency(group.paid)}</p>
                      </div>
                      <div className="bg-white border border-red-100 rounded-xl p-3">
                        <p className="text-xs text-gray-400">Due</p>
                        <p className="font-bold text-red-600">{formatCurrency(group.due)}</p>
                      </div>
                    </div>

                    {group.purchases.map(purchase => {
                      const isSalary = purchase.category === 'Employee Salary'
                      const purchaseOpen = expandedPurchase === purchase.id
                      const isEditing = editingId === purchase.id
                      return (
                        <div key={purchase.id} className="bg-white border border-gray-100 rounded-xl overflow-hidden">
                          <button
                            onClick={() => setExpandedPurchase(purchaseOpen ? null : purchase.id)}
                            className="w-full p-3 flex items-center gap-3 text-left"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-bold text-gray-800 truncate">{purchase.description || purchase.category}</p>
                                {isSalary && <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Auto</span>}
                                {purchase.due_amount > 0 && <span className="text-xs font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Due</span>}
                              </div>
                              <p className="text-xs text-gray-400 mt-0.5">{formatDate(purchase.date)}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-bold text-gray-800">{formatCurrency(purchase.amount)}</p>
                              {purchase.due_amount > 0
                                ? <p className="text-xs text-red-500 font-semibold">Due: {formatCurrency(purchase.due_amount)}</p>
                                : <p className="text-xs text-green-500 font-semibold">Paid</p>}
                            </div>
                            {purchaseOpen ? <ChevronUp className="w-5 h-5 text-gray-400 shrink-0" /> : <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" />}
                          </button>

                          {purchaseOpen && (
                            <div className="border-t border-gray-100 bg-gray-50 p-3 space-y-3">
                              {isEditing ? (
                                <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-3 space-y-3">
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="col-span-2">
                                      <label className="label text-xs">Category</label>
                                      <select className="input-field" value={editForm.category}
                                        onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}>
                                        {PURCHASE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                                      </select>
                                    </div>
                                    <div className="col-span-2">
                                      <label className="label text-xs">Description</label>
                                      <input className="input-field" value={editForm.description}
                                        onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
                                    </div>
                                    <div>
                                      <label className="label text-xs">Supplier</label>
                                      <input className="input-field" value={editForm.supplier}
                                        onChange={e => setEditForm(f => ({ ...f, supplier: e.target.value }))} />
                                    </div>
                                    <div>
                                      <label className="label text-xs">Date</label>
                                      <input type="date" className="input-field" value={editForm.date}
                                        onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))} />
                                    </div>
                                    <div className="col-span-2">
                                      <label className="label text-xs">Total Amount (₹)</label>
                                      <input type="number" min="0" className="input-field font-bold" value={editForm.amount}
                                        onChange={e => setEditForm(f => ({ ...f, amount: e.target.value }))}
                                        onFocus={e => e.target.select()} />
                                    </div>
                                    <div className="col-span-2">
                                      <label className="label text-xs">Notes</label>
                                      <textarea className="input-field resize-none" rows={2} value={editForm.notes}
                                        onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} />
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <button onClick={saveEditPurchase} disabled={saving}
                                      className="btn-primary flex-1 flex items-center justify-center gap-2 py-2.5 text-sm">
                                      <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                    <button onClick={cancelEdit} className="btn-secondary px-3 py-2.5"><X className="w-4 h-4" /></button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-center justify-between gap-2">
                                    <h3 className="font-bold text-gray-700 text-sm flex items-center gap-1.5">
                                      <ReceiptText className="w-4 h-4 text-orange-500" /> Purchase Details
                                    </h3>
                                    <div className="flex gap-2">
                                      {!isSalary && (
                                        <button onClick={() => openEdit(purchase)}
                                          className="flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-2 rounded-xl text-xs font-bold">
                                          <Edit2 className="w-3.5 h-3.5" /> Edit
                                        </button>
                                      )}
                                      {!isSalary && (
                                        <button onClick={() => deletePurchase(purchase.id)}
                                          className="p-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl">
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  {purchase.notes && (
                                    <div className="bg-white border border-gray-100 rounded-xl px-3 py-2 text-sm text-gray-600">
                                      {purchase.notes}
                                    </div>
                                  )}

                                  <div className="flex items-center justify-between">
                                    <h3 className="font-bold text-gray-700 text-sm flex items-center gap-1.5">
                                      <IndianRupee className="w-4 h-4 text-green-500" /> Payment History
                                    </h3>
                                    {purchase.due_amount > 0 && (
                                      <button onClick={() => setShowPayForm(showPayForm === purchase.id ? null : purchase.id)}
                                        className="flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white text-xs font-bold px-3 py-2 rounded-xl">
                                        <Plus className="w-3.5 h-3.5" /> Add Payment
                                      </button>
                                    )}
                                  </div>

                                  {showPayForm === purchase.id && (
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
                                        <button onClick={() => addPayment(purchase.id)} disabled={!payAmount}
                                          className="btn-success flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm disabled:opacity-50">
                                          <Save className="w-4 h-4" /> Record
                                        </button>
                                        <button onClick={() => setShowPayForm(null)} className="btn-secondary px-3"><X className="w-4 h-4" /></button>
                                      </div>
                                    </div>
                                  )}

                                  {(purchase.payments || []).length === 0 ? (
                                    <p className="text-gray-400 text-xs text-center py-2">No payments recorded yet.</p>
                                  ) : (
                                    <div className="space-y-1.5">
                                      {(purchase.payments as Payment[]).map((pay, i) => (
                                        <div key={pay.id} className="flex items-center justify-between bg-white rounded-xl px-3 py-2.5 text-sm border border-gray-100">
                                          <div className="flex items-center gap-2">
                                            <span className="w-5 h-5 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-xs font-bold">{i+1}</span>
                                            <div>
                                              <span className="font-semibold text-gray-800">{formatCurrency(pay.amount)}</span>
                                              <span className="text-gray-400 ml-2 text-xs">{formatDate(pay.date)}{pay.note ? ` · ${pay.note}` : ''}</span>
                                            </div>
                                          </div>
                                          <button onClick={() => deletePayment(purchase.id, pay.id)} className="p-1.5 text-red-400 hover:text-red-600 rounded-lg">
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      ))}
                                      <div className="flex justify-between text-sm pt-1 border-t border-gray-200 font-semibold">
                                        <span className="text-green-600">Paid: {formatCurrency(purchase.amount_paid)}</span>
                                        {purchase.due_amount > 0 && <span className="text-red-500">Due: {formatCurrency(purchase.due_amount)}</span>}
                                      </div>
                                    </div>
                                  )}
                                </>
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
          })}
        </div>
      )}
    </div>
  )
}
