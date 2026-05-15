'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Customer, BillItem } from '@/types'
import { formatCurrency } from '@/lib/constants'
import {
  Search, Plus, Trash2, Printer, Save,
  User, MapPin, Car, CheckCircle, X, Hash, UserPlus
} from 'lucide-react'

const emptyItem = (): BillItem => ({
  oil_type_id: 'custom',
  oil_name:    '',
  quantity:    1,
  rate:        0,
  total:       0,
})

export default function NewBillPage() {
  const router = useRouter()

  // Customer
  const [customerSearch, setCustomerSearch]     = useState('')
  const [customers, setCustomers]               = useState<Customer[]>([])
  const [allCustomers, setAllCustomers]         = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [showDropdown, setShowDropdown]         = useState(false)
  const [vehicleNumber, setVehicleNumber]       = useState('')
  const searchRef = useRef<HTMLDivElement>(null)

  // Add new customer inline
  const [showAddCustomer, setShowAddCustomer]   = useState(false)
  const [newCustName, setNewCustName]           = useState('')
  const [newCustArea, setNewCustArea]           = useState('')
  const [addingCustomer, setAddingCustomer]     = useState(false)

  // Bill
  const [items, setItems]           = useState<BillItem[]>([emptyItem()])
  const [date, setDate]             = useState(new Date().toISOString().split('T')[0])
  const [amountPaid, setAmountPaid] = useState<number | ''>('')
  const [saving, setSaving]         = useState(false)

  // Invoice number
  const [invoiceNo, setInvoiceNo]           = useState('')
  const [invoiceLoading, setInvoiceLoading] = useState(true)

  // Toast & Print Preview
  const [toast, setToast]                       = useState('')
  const [showPrintPreview, setShowPrintPreview] = useState(false)
  const [savedBillId, setSavedBillId]           = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3500)
  }

  // Fetch auto-incremented invoice number on mount
  useEffect(() => {
    fetch('/api/invoice-number')
      .then(r => r.json())
      .then(d => {
        if (d.invoice_no) setInvoiceNo(d.invoice_no)
        setInvoiceLoading(false)
      })
      .catch(() => {
        const now = new Date()
        const mm  = String(now.getMonth() + 1).padStart(2, '0')
        setInvoiceNo(`ET-${mm}-1`)
        setInvoiceLoading(false)
      })
  }, [])

  // Load all customers for instant dropdown
  useEffect(() => {
    fetch('/api/customers?search=').then(r => r.json()).then(d => {
      setAllCustomers(Array.isArray(d) ? d : [])
    })
  }, [])

  // Filter customers as user types
  useEffect(() => {
    const q = customerSearch.trim().toLowerCase()
    setCustomers(!q ? allCustomers : allCustomers.filter(c => c.name.toLowerCase().includes(q)))
  }, [customerSearch, allCustomers])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node))
        setShowDropdown(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selectCustomer = (c: Customer) => {
    setSelectedCustomer(c)
    setCustomerSearch(c.name)
    setShowDropdown(false)
    setShowAddCustomer(false)
  }

  const clearCustomer = () => {
    setSelectedCustomer(null)
    setCustomerSearch('')
    setVehicleNumber('')
    setShowDropdown(false)
    setShowAddCustomer(false)
  }

  // Open "add new customer" form pre-filled with what was typed
  const openAddCustomer = () => {
    setNewCustName(customerSearch)
    setNewCustArea('')
    setShowDropdown(false)
    setShowAddCustomer(true)
  }

  // Save new customer and auto-select them
  const saveNewCustomer = async () => {
    if (!newCustName.trim()) return
    setAddingCustomer(true)
    const res = await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCustName.trim(), area: newCustArea.trim(), vehicle_number: '' }),
    })
    const created = await res.json()
    setAddingCustomer(false)
    if (created.id) {
      // Add to local list and select immediately
      setAllCustomers(prev => [...prev, created])
      selectCustomer(created)
      setCustomerSearch(created.name)
      setShowAddCustomer(false)
      showToast(`✅ Customer "${created.name}" added & selected!`)
    } else {
      showToast('❌ Failed to add customer')
    }
  }

  const updateItem = (idx: number, field: keyof BillItem, value: string | number) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item
      const updated = { ...item, [field]: value }
      if (field === 'rate' || field === 'quantity') {
        const rate = field === 'rate'     ? Number(value) : updated.rate
        const qty  = field === 'quantity' ? Number(value) : updated.quantity
        updated.total = rate * qty
      }
      return updated
    }))
  }

  const addItem    = () => setItems(prev => [...prev, emptyItem()])
  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx))

  const totalAmount = items.reduce((s, i) => s + i.total, 0)
  const paidNum     = amountPaid === '' ? 0 : Number(amountPaid)
  const dueAmount   = Math.max(0, totalAmount - paidNum)

  const saveBill = async (): Promise<string | null> => {
    if (!selectedCustomer)                   { showToast('⚠️ Please select a customer'); return null }
    if (!invoiceNo.trim())                   { showToast('⚠️ Invoice number is required'); return null }
    if (items.some(i => !i.oil_name.trim())) { showToast('⚠️ Please enter oil name for all items'); return null }
    if (items.some(i => i.quantity <= 0))    { showToast('⚠️ Quantity must be greater than 0'); return null }

    setSaving(true)
    try {
      const res = await fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bill_number:    invoiceNo,
          customer_id:    selectedCustomer.id,
          customer_name:  selectedCustomer.name,
          customer_area:  selectedCustomer.area,
          vehicle_number: vehicleNumber,
          date,
          items,
          total_amount:   totalAmount,
          amount_paid:    paidNum,
          due_amount:     dueAmount,
          notes:          '',
        }),
      })
      const data = await res.json()
      if (data.id) return data.id
      showToast('❌ Error: ' + (data.error || 'Unknown error'))
      return null
    } catch {
      showToast('❌ Network error. Try again.')
      return null
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async () => {
    const id = await saveBill()
    if (id) {
      showToast('✅ Bill saved successfully!')
      setTimeout(() => router.push(`/bills/${id}`), 1200)
    }
  }

  const handleSaveAndPrint = async () => {
    const id = await saveBill()
    if (id) {
      setSavedBillId(id)
      showToast('✅ Bill saved! Opening print preview...')
      setTimeout(() => setShowPrintPreview(true), 800)
    }
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-2 font-semibold text-sm whitespace-nowrap">
          <CheckCircle className="w-5 h-5 text-green-400 shrink-0" /> {toast}
        </div>
      )}

      {/* Print Preview Modal */}
      {showPrintPreview && savedBillId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-bold text-gray-800 text-lg">Print Invoice</h3>
              <button onClick={() => { setShowPrintPreview(false); router.push(`/bills/${savedBillId}`) }}
                className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-gray-600 text-sm">
                Invoice <span className="font-bold text-orange-600">{invoiceNo}</span> saved successfully!
              </p>
              <button
                onClick={() => {
                  window.open(`/bills/${savedBillId}?print=1`, '_blank')
                  setShowPrintPreview(false)
                  router.push(`/bills/${savedBillId}`)
                }}
                className="btn-primary w-full flex items-center justify-center gap-2 text-base"
              >
                <Printer className="w-5 h-5" /> Open & Print Invoice
              </button>
              <button
                onClick={() => { setShowPrintPreview(false); router.push(`/bills/${savedBillId}`) }}
                className="btn-secondary w-full flex items-center justify-center gap-2"
              >
                View Bill Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">New Bill</h1>
          <p className="text-xs text-gray-400 mt-0.5">EMTA TRADERS</p>
        </div>
        <input type="date" className="input-field py-2 text-sm w-auto" value={date}
          onChange={e => setDate(e.target.value)} />
      </div>

      {/* Invoice Number */}
      <div className="card">
        <label className="label flex items-center gap-1.5">
          <Hash className="w-4 h-4 text-orange-500" /> Invoice No.
        </label>
        <div className="flex gap-2 items-center">
          <input
            className="input-field font-bold font-mono text-lg tracking-wide flex-1"
            value={invoiceLoading ? 'Loading...' : invoiceNo}
            onChange={e => setInvoiceNo(e.target.value)}
            placeholder="ET-06-1"
          />
          <span className="text-xs text-gray-400 bg-gray-100 px-3 py-2.5 rounded-xl font-medium whitespace-nowrap">
            Auto ✓
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-1.5">
          Format: ET-{String(new Date().getMonth()+1).padStart(2,'0')}-N · Resets each month · You can edit manually if needed
        </p>
      </div>

      {/* Customer */}
      <div className="card">
        <h2 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
          <User className="w-5 h-5 text-orange-500" /> Customer Details
        </h2>

        <div className="relative" ref={searchRef}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
          <input
            className="input-field pl-11 pr-10"
            placeholder="Tap to search or select customer..."
            value={customerSearch}
            onChange={e => {
              setCustomerSearch(e.target.value)
              setSelectedCustomer(null)
              setShowDropdown(true)
              setShowAddCustomer(false)
            }}
            onFocus={() => setShowDropdown(true)}
          />
          {customerSearch && (
            <button onClick={clearCustomer} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Dropdown */}
          {showDropdown && !showAddCustomer && (
            <div className="absolute top-full left-0 right-0 bg-white border-2 border-orange-300 rounded-xl shadow-2xl z-50 mt-1 max-h-64 overflow-y-auto">
              {customers.length === 0 ? (
                <div className="px-4 py-3 text-center">
                  <p className="text-gray-400 text-sm mb-2">
                    {customerSearch ? `No customer found for "${customerSearch}"` : 'No customers added yet.'}
                  </p>
                  {customerSearch && (
                    <button
                      onClick={openAddCustomer}
                      className="flex items-center gap-2 mx-auto bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-all"
                    >
                      <UserPlus className="w-4 h-4" /> Add &quot;{customerSearch}&quot; as new customer
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {customers.map(c => (
                    <button key={c.id} onClick={() => selectCustomer(c)}
                      className="w-full text-left px-4 py-3 hover:bg-orange-50 border-b border-gray-100 last:border-0 transition-colors active:bg-orange-100">
                      <p className="font-semibold text-gray-800">{c.name}</p>
                      {c.area && <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{c.area}</p>}
                    </button>
                  ))}
                  {/* Always show "add new" option at the bottom when typing */}
                  {customerSearch && (
                    <button
                      onClick={openAddCustomer}
                      className="w-full text-left px-4 py-3 bg-orange-50 hover:bg-orange-100 border-t-2 border-orange-200 transition-colors flex items-center gap-2 text-orange-600 font-semibold text-sm"
                    >
                      <UserPlus className="w-4 h-4" /> Add &quot;{customerSearch}&quot; as new customer
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Inline Add New Customer form */}
        {showAddCustomer && (
          <div className="mt-3 bg-blue-50 border-2 border-blue-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <UserPlus className="w-5 h-5 text-blue-500" />
              <h3 className="font-bold text-blue-800">Add New Customer</h3>
            </div>
            <div>
              <label className="label text-xs">Customer Name *</label>
              <input
                className="input-field"
                placeholder="Full name"
                value={newCustName}
                onChange={e => setNewCustName(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <label className="label text-xs">Area / Location</label>
              <input
                className="input-field"
                placeholder="Village / Town / Area"
                value={newCustArea}
                onChange={e => setNewCustArea(e.target.value)}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={saveNewCustomer}
                disabled={addingCustomer || !newCustName.trim()}
                className="btn-primary flex-1 flex items-center justify-center gap-2 py-3 disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" />
                {addingCustomer ? 'Adding...' : 'Add & Select'}
              </button>
              <button
                onClick={() => { setShowAddCustomer(false); setShowDropdown(false) }}
                className="btn-secondary flex items-center gap-2 px-4"
              >
                <X className="w-4 h-4" /> Cancel
              </button>
            </div>
          </div>
        )}

        {/* Selected customer badge */}
        {selectedCustomer && (
          <div className="mt-3 bg-orange-50 border border-orange-200 rounded-xl p-3 flex flex-wrap gap-3 items-center">
            <span className="flex items-center gap-1.5 text-sm font-bold text-orange-700">
              <User className="w-4 h-4" />{selectedCustomer.name}
            </span>
            {selectedCustomer.area && (
              <span className="flex items-center gap-1.5 text-sm text-gray-500">
                <MapPin className="w-3.5 h-3.5" />{selectedCustomer.area}
              </span>
            )}
          </div>
        )}

        <div className="mt-3">
          <label className="label flex items-center gap-1.5">
            <Car className="w-4 h-4 text-orange-400" /> Vehicle Number
          </label>
          <input className="input-field" placeholder="e.g. WB 23 AB 1234"
            value={vehicleNumber} onChange={e => setVehicleNumber(e.target.value)} />
        </div>
      </div>

      {/* Oil Items */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-700">Oil / Product Items</h2>
          <button onClick={addItem}
            className="flex items-center gap-1.5 text-orange-500 font-semibold text-sm bg-orange-50 hover:bg-orange-100 px-3 py-2 rounded-xl transition-all">
            <Plus className="w-4 h-4" /> Add Item
          </button>
        </div>

        <div className="space-y-3">
          {items.map((item, idx) => (
            <div key={idx} className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2">
              <div>
                <label className="label text-xs">Oil / Product Name</label>
                <input
                  className="input-field font-semibold"
                  placeholder="Type oil name e.g. Soya Refined Oil..."
                  value={item.oil_name}
                  onChange={e => updateItem(idx, 'oil_name', e.target.value)}
                  autoComplete="off"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="label text-xs">Qty (Jars)</label>
                  <input
                    type="number"
                    min="1"
                    className="input-field text-center font-bold"
                    value={item.quantity}
                    onChange={e => updateItem(idx, 'quantity', Math.max(1, Number(e.target.value)))}
                    onFocus={e => e.target.select()}
                  />
                </div>
                <div>
                  <label className="label text-xs">Rate (₹/jar)</label>
                  <input
                    type="number"
                    min="0"
                    className="input-field text-center"
                    value={item.rate === 0 ? '' : item.rate}
                    placeholder="0"
                    onChange={e => updateItem(idx, 'rate', Number(e.target.value))}
                    onFocus={e => e.target.select()}
                  />
                </div>
                <div>
                  <label className="label text-xs">Total</label>
                  <div className="input-field bg-amber-50 font-bold text-orange-700 text-center">
                    {formatCurrency(item.total)}
                  </div>
                </div>
              </div>

              {items.length > 1 && (
                <button onClick={() => removeItem(idx)}
                  className="flex items-center gap-1 text-red-400 hover:text-red-600 text-xs font-semibold transition-colors">
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Payment */}
      <div className="card">
        <h2 className="font-bold text-gray-700 mb-3">Payment Summary</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-gray-600 font-medium">Total Amount</span>
            <span className="text-2xl font-bold text-gray-800">{formatCurrency(totalAmount)}</span>
          </div>
          <div>
            <label className="label">Amount Paid (₹)</label>
            <input type="number" min="0" className="input-field text-lg font-bold"
              placeholder="0"
              value={amountPaid}
              onChange={e => setAmountPaid(e.target.value === '' ? '' : Number(e.target.value))}
              onFocus={e => e.target.select()}
            />
          </div>
          <div className={`flex items-center justify-between py-3 px-4 rounded-xl font-bold
            ${dueAmount > 0 ? 'bg-red-50 border-2 border-red-200' : 'bg-green-50 border-2 border-green-200'}`}>
            <span className={dueAmount > 0 ? 'text-red-600' : 'text-green-600'}>
              {dueAmount > 0 ? 'Due Amount' : '✓ Fully Paid'}
            </span>
            {dueAmount > 0 && <span className="text-2xl text-red-600">{formatCurrency(dueAmount)}</span>}
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="grid grid-cols-2 gap-3 pb-4">
        <button onClick={handleSave} disabled={saving || !selectedCustomer}
          className="btn-primary flex items-center justify-center gap-2 py-4 text-base disabled:opacity-50 disabled:cursor-not-allowed">
          <Save className="w-5 h-5" />
          {saving ? 'Saving...' : 'Save Bill'}
        </button>
        <button onClick={handleSaveAndPrint} disabled={saving || !selectedCustomer}
          className="btn-success flex items-center justify-center gap-2 py-4 text-base disabled:opacity-50 disabled:cursor-not-allowed">
          <Printer className="w-5 h-5" />
          {saving ? 'Saving...' : 'Save & Print'}
        </button>
      </div>
    </div>
  )
}
