'use client'
import { useMemo } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { Bill, Customer } from '@/types'
import { formatCurrency, formatDate } from '@/lib/constants'
import { fetcher } from '@/lib/fetcher'
import { TableSkeleton } from '@/components/ui/Skeletons'
import { AlertCircle, MapPin, MessageCircle, PhoneCall, ChevronRight, IndianRupee } from 'lucide-react'

type DueGroup = {
  customer_id: string
  customer_name: string
  customer_area: string
  phone: string
  total_due: number
  bills: Bill[]
  oldest_date: string
}

const waNumber = (phone: string) => {
  const digits = phone.replace(/\D/g, '')
  return digits.length === 10 ? `91${digits}` : digits
}

export default function DuesPage() {
  const { data: billData, error: billErr, isLoading: billsLoading } =
    useSWR<Bill[]>('/api/bills?due_only=true', fetcher, { revalidateOnFocus: true, keepPreviousData: true })
  const { data: custData, error: custErr, isLoading: custLoading } =
    useSWR<Customer[]>('/api/customers', fetcher, { revalidateOnFocus: true, keepPreviousData: true })

  const bills     = Array.isArray(billData) ? billData : []
  const customers = Array.isArray(custData) ? custData : []
  const loading   = billsLoading || custLoading
  const error     = (billErr || custErr) ? 'Could not load dues. Please try again.' : ''

  const groups = useMemo<DueGroup[]>(() => {
    const phoneById = new Map(customers.map(c => [c.id, c.phone || '']))
    const map = new Map<string, DueGroup>()
    for (const b of bills) {
      const key = b.customer_id || b.customer_name
      const g = map.get(key)
      if (g) {
        g.total_due += b.due_amount
        g.bills.push(b)
        if (b.date < g.oldest_date) g.oldest_date = b.date
      } else {
        map.set(key, {
          customer_id: b.customer_id,
          customer_name: b.customer_name,
          customer_area: b.customer_area,
          phone: phoneById.get(b.customer_id) || '',
          total_due: b.due_amount,
          bills: [b],
          oldest_date: b.date,
        })
      }
    }
    return Array.from(map.values()).sort((a, b) => b.total_due - a.total_due)
  }, [bills, customers])

  const grandTotal = groups.reduce((s, g) => s + g.total_due, 0)

  if (loading) return <TableSkeleton />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Pending Dues</h1>
        <div className="card border-2 border-red-100 bg-red-50 py-2 px-4">
          <p className="text-xs text-gray-500 font-medium">Total Outstanding</p>
          <p className="text-lg font-bold text-red-600">{formatCurrency(grandTotal)}</p>
        </div>
      </div>

      {error ? (
        <div className="card text-center py-10 text-gray-500">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-400" /> {error}
        </div>
      ) : groups.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          <IndianRupee className="w-10 h-10 mx-auto mb-3 text-green-400" />
          <p className="font-semibold text-gray-600">All clear! 🎉</p>
          <p className="text-sm mt-1">No customer has any pending dues.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {groups.map(g => {
            const msg = encodeURIComponent(
              `Namaste ${g.customer_name} ji, your pending balance with EMTA TRADERS is ${formatCurrency(g.total_due)}. Kindly arrange the payment. Thank you!`
            )
            return (
              <div key={g.customer_id || g.customer_name} className="card py-4">
                <div className="flex items-center justify-between gap-3">
                  <Link href={g.customer_id ? `/customers/${g.customer_id}` : '/customers'} className="flex-1 min-w-0 group">
                    <p className="font-bold text-gray-800 truncate group-hover:text-orange-600 transition-colors flex items-center gap-1">
                      {g.customer_name}
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-orange-400" />
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-2 flex-wrap">
                      {g.customer_area && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{g.customer_area}</span>}
                      <span>{g.bills.length} unpaid bill{g.bills.length !== 1 ? 's' : ''} · oldest {formatDate(g.oldest_date)}</span>
                    </p>
                  </Link>
                  <p className="font-bold text-red-600 text-lg shrink-0">{formatCurrency(g.total_due)}</p>
                </div>
                {g.phone && (
                  <div className="flex gap-2 mt-3">
                    <a href={`tel:${g.phone}`}
                      className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all">
                      <PhoneCall className="w-3.5 h-3.5" /> Call
                    </a>
                    <a href={`https://wa.me/${waNumber(g.phone)}?text=${msg}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 bg-green-50 hover:bg-green-100 text-green-600 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all">
                      <MessageCircle className="w-3.5 h-3.5" /> WhatsApp Reminder
                    </a>
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
