'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Bill, Payment } from '@/types'
import { formatCurrency, formatDate } from '@/lib/constants'
import {
  Search, Plus, Filter, AlertCircle, Car, Trash2, CheckCircle,
  ChevronDown, ChevronUp, User, ReceiptText, CreditCard, CalendarDays
} from 'lucide-react'
import { BillsListSkeleton } from '@/components/ui/Skeletons'

type CustomerPayment = Payment & {
  bill_id: string
  bill_number: string
}

type CustomerBillGroup = {
  key: string
  customer_id: string
  customer_name: string
  customer_area: string
  vehicle_numbers: string[]
  bills: Bill[]
  pending_bills: Bill[]
  payments: CustomerPayment[]
  total_amount: number
  amount_paid: number
  due_amount: number
  last_bill_date: string
}

const customerKey = (bill: Bill) =>
  bill.customer_id || bill.customer_name.trim().toLowerCase()

export default function BillsPage() {
  const [bills, setBills]       = useState<Bill[]>([])
  const [search, setSearch]     = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]     = useState('')
  const [dueOnly, setDueOnly]   = useState(true)
  const [loading, setLoading]   = useState(true)
  const [toast, setToast]       = useState('')
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [openCustomer, setOpenCustomer] = useState<string | null>(null)

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
    params.set('t', String(Date.now()))

    const res = await fetch(`/api/bills?${params}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
    })
    const data = await res.json()
    setBills(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { fetchBills() }, [])

  useEffect(() => {
    const t = setTimeout(fetchBills, 350)
    return () => clearTimeout(t)
  }, [search, dateFrom, dateTo])

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchBills()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [search, dateFrom, dateTo])

  const deleteBill = async (id: string) => {
    const res = await fetch(`/api/bills?id=${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.success) {
      setBills(prev => prev.filter(b => b.id !== id))
      showToast('Bill deleted successfully')
    } else {
      showToast('Error deleting bill')
    }
    setConfirmId(null)
  }

  const customerGroups = useMemo(() => {
    const groups = new Map<string, CustomerBillGroup>()

    bills.forEach(bill => {
      const key = customerKey(bill)
      const current = groups.get(key)
      const payments = (bill.payments || []).map(payment => ({
        ...payment,
        bill_id: bill.id,
        bill_number: bill.bill_number,
      }))

      if (!current) {
        groups.set(key, {
          key,
          customer_id: bill.customer_id,
          customer_name: bill.customer_name,
          customer_area: bill.customer_area,
          vehicle_numbers: bill.vehicle_number ? [bill.vehicle_number] : [],
          bills: [bill],
          pending_bills: bill.due_amount > 0 ? [bill] : [],
          payments,
          total_amount: bill.total_amount,
          amount_paid: bill.amount_paid,
          due_amount: bill.due_amount,
          last_bill_date: bill.date,
        })
        return
      }

      current.bills.push(bill)
      if (bill.due_amount > 0) current.pending_bills.push(bill)
      current.payments.push(...payments)
      current.total_amount += bill.total_amount
      current.amount_paid += bill.amount_paid
      current.due_amount += bill.due_amount
      if (bill.date > current.last_bill_date) current.last_bill_date = bill.date
      if (bill.vehicle_number && !current.vehicle_numbers.includes(bill.vehicle_number)) {
        current.vehicle_numbers.push(bill.vehicle_number)
      }
    })

    return Array.from(groups.values())
      .filter(group => !dueOnly || group.due_amount > 0)
      .sort((a, b) => {
        if (b.due_amount !== a.due_amount) return b.due_amount - a.due_amount
        return a.customer_name.localeCompare(b.customer_name)
      })
  }, [bills, dueOnly])

  const totalDue = customerGroups.reduce((s, group) => s + group.due_amount, 0)
  const totalBills = customerGroups.reduce((s, group) => s + group.total_amount, 0)
  const pendingBillCount = customerGroups.reduce((s, group) => s + group.pending_bills.length, 0)

  return (
    <div className="space-y-4">

      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-2 font-semibold text-sm whitespace-nowrap">
          <CheckCircle className="w-5 h-5 text-green-400 shrink-0" /> {toast}
        </div>
      )}

      {confirmId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-center w-14 h-14 bg-red-100 rounded-2xl mx-auto mb-4">
              <Trash2 className="w-7 h-7 text-red-500" />
            </div>
            <h3 className="font-bold text-gray-800 text-lg text-center mb-1">Delete Bill?</h3>
            <p className="text-gray-500 text-sm text-center mb-5">This action cannot be undone. The bill will be permanently deleted.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmId(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={() => deleteBill(confirmId)} className="btn-danger flex-1 flex items-center justify-center gap-2">
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Bills</h1>
          <p className="text-sm text-gray-400">
            {customerGroups.length} customers · {pendingBillCount} pending bills · {formatCurrency(totalBills)} billed
          </p>
        </div>
        <Link href="/bills/new" className="btn-primary flex items-center gap-2 py-2 px-4 text-base">
          <Plus className="w-5 h-5" /> New
        </Link>
      </div>

      {totalDue > 0 && (
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl px-4 py-3 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-red-700 font-semibold text-sm">
            Total customer dues: <span className="text-base">{formatCurrency(totalDue)}</span>
          </p>
        </div>
      )}

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
            ${dueOnly ? 'bg-red-500 border-red-500 text-white' : 'border-gray-200 text-gray-600 hover:border-red-300'}`}>
          <AlertCircle className="w-4 h-4" /> Customers With Dues
        </button>
      </div>

      {loading ? (
        <BillsListSkeleton />
      ) : customerGroups.length === 0 ? (
        <div className="card text-center py-10 text-gray-400">No customers or bills found.</div>
      ) : (
        <div className="space-y-3">
          {customerGroups.map(group => {
            const isOpen = openCustomer === group.key
            const sortedPayments = [...group.payments].sort((a, b) => b.date.localeCompare(a.date))
            return (
              <div key={group.key} className="card p-0 overflow-hidden border-2 border-transparent hover:border-orange-100 transition-all">
                <button
                  onClick={() => setOpenCustomer(isOpen ? null : group.key)}
                  className="w-full p-4 flex items-center gap-3 text-left"
                >
                  <div className="w-11 h-11 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                    <User className="w-6 h-6 text-orange-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-gray-800 text-base truncate">{group.customer_name}</p>
                      {group.due_amount > 0 && (
                        <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">
                          {group.pending_bills.length} pending
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {group.bills.length} total bills · Last bill {formatDate(group.last_bill_date)}
                    </p>
                    <div className="flex items-center gap-3 flex-wrap mt-1 text-xs text-gray-400">
                      {group.customer_area && <span>{group.customer_area}</span>}
                      {group.vehicle_numbers.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Car className="w-3.5 h-3.5" /> {group.vehicle_numbers.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-red-600 text-lg">{formatCurrency(group.due_amount)}</p>
                    <p className="text-xs text-gray-400">due</p>
                  </div>
                  {isOpen ? <ChevronUp className="w-5 h-5 text-gray-400 shrink-0" /> : <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" />}
                </button>

                {isOpen && (
                  <div className="border-t border-amber-100 bg-gray-50 p-4 space-y-4">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-white border border-gray-100 rounded-xl p-3">
                        <p className="text-xs text-gray-400">Billed</p>
                        <p className="font-bold text-gray-800">{formatCurrency(group.total_amount)}</p>
                      </div>
                      <div className="bg-white border border-gray-100 rounded-xl p-3">
                        <p className="text-xs text-gray-400">Paid</p>
                        <p className="font-bold text-green-600">{formatCurrency(group.amount_paid)}</p>
                      </div>
                      <div className="bg-white border border-red-100 rounded-xl p-3">
                        <p className="text-xs text-gray-400">Due</p>
                        <p className="font-bold text-red-600">{formatCurrency(group.due_amount)}</p>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h2 className="font-bold text-gray-700 flex items-center gap-2">
                          <ReceiptText className="w-4 h-4 text-orange-500" /> Pending Bills
                        </h2>
                        <span className="text-xs font-semibold text-gray-400">{group.pending_bills.length} open</span>
                      </div>
                      {group.pending_bills.length === 0 ? (
                        <div className="bg-white border border-gray-100 rounded-xl p-4 text-center text-sm text-gray-400">
                          No pending bills for this customer.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {group.pending_bills.map(bill => (
                            <div key={bill.id} className="bg-white border border-gray-100 rounded-xl p-3 flex items-center gap-3">
                              <Link href={`/bills/${bill.id}`} className="flex-1 min-w-0">
                                <p className="font-bold text-gray-800">{bill.bill_number}</p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                  {formatDate(bill.date)} · Total {formatCurrency(bill.total_amount)} · Paid {formatCurrency(bill.amount_paid)}
                                </p>
                                {bill.vehicle_number && (
                                  <p className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                                    <Car className="w-3.5 h-3.5" /> {bill.vehicle_number}
                                  </p>
                                )}
                              </Link>
                              <Link href={`/bills/${bill.id}`} className="text-right shrink-0">
                                <p className="font-bold text-red-600">{formatCurrency(bill.due_amount)}</p>
                                <p className="text-xs text-gray-400">due</p>
                              </Link>
                              <button
                                onClick={() => setConfirmId(bill.id)}
                                className="p-2 bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-500 rounded-xl transition-all shrink-0"
                                title="Delete bill"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h2 className="font-bold text-gray-700 flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-green-500" /> Payments Received
                        </h2>
                        <span className="text-xs font-semibold text-gray-400">{sortedPayments.length} payments</span>
                      </div>
                      {sortedPayments.length === 0 ? (
                        <div className="bg-white border border-gray-100 rounded-xl p-4 text-center text-sm text-gray-400">
                          No payments recorded for this customer.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {sortedPayments.map(payment => (
                            <Link
                              key={`${payment.bill_id}-${payment.id}`}
                              href={`/bills/${payment.bill_id}`}
                              className="bg-white border border-gray-100 rounded-xl px-3 py-2.5 flex items-center justify-between gap-3"
                            >
                              <div className="min-w-0">
                                <p className="font-bold text-green-600">{formatCurrency(payment.amount)}</p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                  {payment.bill_number}{payment.note ? ` · ${payment.note}` : ''}
                                </p>
                              </div>
                              <div className="flex items-center gap-1.5 text-xs text-gray-400 shrink-0">
                                <CalendarDays className="w-3.5 h-3.5" />
                                {formatDate(payment.date)}
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
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
