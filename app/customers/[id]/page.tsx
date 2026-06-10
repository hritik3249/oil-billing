'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Customer, Bill } from '@/types'
import { formatCurrency, formatDate } from '@/lib/constants'
import { TableSkeleton } from '@/components/ui/Skeletons'
import {
  ChevronLeft, MapPin, Phone, FileText, AlertCircle,
  CheckCircle2, MessageCircle, PhoneCall, ChevronDown, ChevronUp, PlusCircle
} from 'lucide-react'

// Normalize an Indian mobile number for wa.me links: keep digits, add 91 if 10 digits
const waNumber = (phone: string) => {
  const digits = phone.replace(/\D/g, '')
  return digits.length === 10 ? `91${digits}` : digits
}

export default function CustomerLedgerPage() {
  const { id } = useParams<{ id: string }>()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [bills, setBills]       = useState<Bill[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    Promise.all([
      fetch(`/api/customers?id=${id}&t=${Date.now()}`, { cache: 'no-store' }).then(r => r.json()),
      fetch(`/api/bills?customer_id=${id}&t=${Date.now()}`, { cache: 'no-store' }).then(r => r.json()),
    ]).then(([cust, billList]) => {
      if (cust?.error) throw new Error(cust.error)
      setCustomer(cust)
      setBills(Array.isArray(billList) ? billList : [])
    }).catch(e => {
      console.error('Ledger fetch error:', e)
      setError('Could not load customer ledger. Please try again.')
    }).finally(() => setLoading(false))
  }, [id])

  if (loading) return <TableSkeleton />
  if (error || !customer) return (
    <div className="card text-center py-10 text-gray-500">
      <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-400" />
      {error || 'Customer not found.'}
      <div className="mt-4">
        <Link href="/customers" className="text-orange-500 font-semibold">← Back to customers</Link>
      </div>
    </div>
  )

  const totalBilled = bills.reduce((s, b) => s + b.total_amount, 0)
  const totalPaid   = bills.reduce((s, b) => s + b.amount_paid, 0)
  const totalDue    = bills.reduce((s, b) => s + b.due_amount, 0)
  const dueBills    = bills.filter(b => b.due_amount > 0)

  const reminderMsg = encodeURIComponent(
    `Namaste ${customer.name} ji, your pending balance with EMTA TRADERS is ${formatCurrency(totalDue)}. Kindly arrange the payment. Thank you!`
  )

  return (
    <div className="space-y-4">
      <Link href="/customers" className="inline-flex items-center gap-1 text-gray-500 hover:text-orange-500 text-sm font-semibold">
        <ChevronLeft className="w-4 h-4" /> All Customers
      </Link>

      {/* Customer header */}
      <div className="card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{customer.name}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-500">
              {customer.area && <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{customer.area}</span>}
              {customer.phone && <span className="flex items-center gap-1"><Phone className="w-4 h-4" />{customer.phone}</span>}
            </div>
          </div>
          {customer.phone && (
            <div className="flex gap-2">
              <a href={`tel:${customer.phone}`}
                className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-2 rounded-xl text-sm font-semibold transition-all">
                <PhoneCall className="w-4 h-4" /> Call
              </a>
              {totalDue > 0 && (
                <a href={`https://wa.me/${waNumber(customer.phone)}?text=${reminderMsg}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 bg-green-50 hover:bg-green-100 text-green-600 px-3 py-2 rounded-xl text-sm font-semibold transition-all">
                  <MessageCircle className="w-4 h-4" /> Remind
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card border-2 border-gray-100">
          <p className="text-xs text-gray-500 font-medium">Total Billed</p>
          <p className="text-lg font-bold text-gray-800">{formatCurrency(totalBilled)}</p>
          <p className="text-xs text-gray-400">{bills.length} bill{bills.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="card border-2 border-green-100 bg-green-50">
          <p className="text-xs text-gray-500 font-medium">Total Paid</p>
          <p className="text-lg font-bold text-green-700">{formatCurrency(totalPaid)}</p>
        </div>
        <div className={`card border-2 ${totalDue > 0 ? 'border-red-100 bg-red-50' : 'border-gray-100'}`}>
          <p className="text-xs text-gray-500 font-medium">Outstanding</p>
          <p className={`text-lg font-bold ${totalDue > 0 ? 'text-red-600' : 'text-gray-800'}`}>{formatCurrency(totalDue)}</p>
          {totalDue > 0 && <p className="text-xs text-red-400">{dueBills.length} unpaid bill{dueBills.length !== 1 ? 's' : ''}</p>}
        </div>
      </div>

      {/* Bills ledger */}
      <div className="card">
        <h2 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4" /> Bill History
        </h2>
        {bills.length === 0 ? (
          <p className="text-gray-400 text-sm py-4">
            No bills yet for this customer.{' '}
            <Link href="/bills/new" className="text-orange-500 font-semibold inline-flex items-center gap-1">
              Create one <PlusCircle className="w-4 h-4" />
            </Link>
          </p>
        ) : (
          <div className="space-y-2">
            {bills.map(bill => {
              const isOpen = expanded === bill.id
              const settled = bill.due_amount <= 0
              return (
                <div key={bill.id} className={`border rounded-xl ${settled ? 'border-gray-100' : 'border-red-100 bg-red-50/40'}`}>
                  <button onClick={() => setExpanded(isOpen ? null : bill.id)}
                    className="w-full flex items-center justify-between gap-3 p-3 text-left">
                    <div>
                      <p className="font-semibold text-gray-800">{bill.bill_number}</p>
                      <p className="text-xs text-gray-400">{formatDate(bill.date)} · {bill.items.length} item{bill.items.length !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-bold text-gray-800">{formatCurrency(bill.total_amount)}</p>
                        {settled
                          ? <p className="text-xs text-green-600 font-medium flex items-center gap-1 justify-end"><CheckCircle2 className="w-3 h-3" /> Paid</p>
                          : <p className="text-xs text-red-500 font-medium">Due: {formatCurrency(bill.due_amount)}</p>}
                      </div>
                      {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-3 pb-3 space-y-2 border-t border-gray-100 pt-2">
                      <div className="text-sm space-y-1">
                        {bill.items.map((it, i) => (
                          <div key={i} className="flex justify-between text-gray-600">
                            <span>{it.oil_name} × {it.quantity}</span>
                            <span>{formatCurrency(it.total)}</span>
                          </div>
                        ))}
                      </div>
                      {bill.payments.length > 0 && (
                        <div className="text-sm space-y-1 pt-1 border-t border-dashed border-gray-200">
                          {bill.payments.map(p => (
                            <div key={p.id} className="flex justify-between text-green-700">
                              <span>Payment · {formatDate(p.date)}{p.note ? ` · ${p.note}` : ''}</span>
                              <span>{formatCurrency(p.amount)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <Link href={`/bills/${bill.id}`}
                        className="inline-block text-orange-500 text-sm font-semibold pt-1">
                        Open bill →
                      </Link>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
