'use client'
import { useEffect, useState } from 'react'
import { formatCurrency } from '@/lib/constants'
import {
  TrendingUp, TrendingDown, ArrowUpDown, ChevronLeft,
  ChevronRight, AlertCircle, CheckCircle, Users, Droplets
} from 'lucide-react'

type PnLData = {
  month: string
  total_billed: number
  total_collected: number
  customer_dues: number
  oil_breakdown: { name: string; quantity: number; revenue: number }[]
  expense_breakdown: { category: string; total: number; paid: number; due: number }[]
  salary_breakdown: { name: string; salary_due: number; paid: number; due: number }[]
  total_salary_due: number
  total_salary_paid: number
  total_salary_due_remaining: number
  total_expenses: number
  total_expenses_paid: number
  total_expenses_due: number
  gross_profit: number
  cash_profit: number
}

const monthLabel = (m: string) => {
  const [y, mo] = m.split('-')
  return new Date(Number(y), Number(mo) - 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

const currentMonth = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const prevMonth = (m: string) => {
  const [y, mo] = m.split('-').map(Number)
  const d = new Date(y, mo - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const nextMonth = (m: string) => {
  const [y, mo] = m.split('-').map(Number)
  const d = new Date(y, mo, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// ── Reusable row components ──
function Row({ label, value, sub, bold, indent, color }: {
  label: string; value: number; sub?: string
  bold?: boolean; indent?: boolean; color?: string
}) {
  return (
    <div className={`flex items-center justify-between py-2 ${indent ? 'pl-4' : ''} ${bold ? 'border-t border-gray-200 mt-1 pt-3' : ''}`}>
      <div>
        <span className={`${bold ? 'font-bold text-gray-800' : 'text-gray-600'} text-sm`}>{label}</span>
        {sub && <span className="text-xs text-gray-400 ml-2">{sub}</span>}
      </div>
      <span className={`font-${bold ? 'bold text-base' : 'semibold text-sm'} ${color || 'text-gray-800'}`}>
        {formatCurrency(value)}
      </span>
    </div>
  )
}

function SectionHeader({ title, icon: Icon, color }: { title: string; icon: React.ElementType; color: string }) {
  return (
    <div className={`flex items-center gap-2 mb-2 pb-2 border-b-2 ${color}`}>
      <Icon className="w-5 h-5" />
      <h2 className="font-bold text-gray-800 text-base">{title}</h2>
    </div>
  )
}

function Divider() {
  return <div className="border-t border-dashed border-gray-200 my-1" />
}

export default function PnLPage() {
  const [month, setMonth]   = useState(currentMonth())
  const [data, setData]     = useState<PnLData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')

  const fetchData = async (m: string) => {
    setLoading(true); setError(''); setData(null)
    const res = await fetch(`/api/pnl?month=${m}`)
    const json = await res.json()
    if (json.error) setError(json.error)
    else setData(json)
    setLoading(false)
  }

  useEffect(() => { fetchData(month) }, [month])

  const canGoNext = month < currentMonth()

  return (
    <div className="max-w-2xl mx-auto space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">P&L Report</h1>
          <p className="text-sm text-gray-400">Profit & Loss Statement</p>
        </div>
        {/* Month navigator */}
        <div className="flex items-center gap-1 bg-white border-2 border-amber-100 rounded-2xl px-2 py-1.5 shadow-sm">
          <button onClick={() => setMonth(prevMonth(month))}
            className="p-1.5 hover:bg-amber-50 rounded-xl transition-all">
            <ChevronLeft className="w-5 h-5 text-gray-500" />
          </button>
          <span className="font-bold text-gray-800 text-sm px-2 min-w-[110px] text-center">
            {monthLabel(month)}
          </span>
          <button onClick={() => setMonth(nextMonth(month))} disabled={!canGoNext}
            className="p-1.5 hover:bg-amber-50 rounded-xl transition-all disabled:opacity-30">
            <ChevronRight className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-amber-100 p-5 space-y-3 animate-pulse">
              <div className="h-5 bg-gray-200 rounded-xl w-32" />
              {[1,2,3].map(j => (
                <div key={j} className="flex justify-between">
                  <div className="h-4 bg-gray-100 rounded w-36" />
                  <div className="h-4 bg-gray-100 rounded w-20" />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="card border-2 border-red-200 bg-red-50 text-red-700 font-semibold text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" /> {error}
        </div>
      )}

      {/* No data */}
      {!loading && !error && data && data.total_billed === 0 && data.total_expenses === 0 && (
        <div className="card text-center py-10 text-gray-400">
          No records found for {monthLabel(month)}.
        </div>
      )}

      {data && (data.total_billed > 0 || data.total_expenses > 0) && (
        <>
          {/* ── PROFIT SUMMARY BANNER ── */}
          <div className="grid grid-cols-2 gap-3">
            <div className={`card border-2 ${data.gross_profit >= 0 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
              <div className="flex items-center gap-2 mb-1">
                <ArrowUpDown className={`w-4 h-4 ${data.gross_profit >= 0 ? 'text-green-500' : 'text-red-500'}`} />
                <p className="text-xs text-gray-500 font-medium">Gross Profit</p>
              </div>
              <p className={`text-xl font-bold ${data.gross_profit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                {data.gross_profit < 0 ? '-' : ''}{formatCurrency(Math.abs(data.gross_profit))}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Billed − All Expenses</p>
            </div>

            <div className={`card border-2 ${data.cash_profit >= 0 ? 'border-blue-200 bg-blue-50' : 'border-orange-200 bg-orange-50'}`}>
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className={`w-4 h-4 ${data.cash_profit >= 0 ? 'text-blue-500' : 'text-orange-500'}`} />
                <p className="text-xs text-gray-500 font-medium">Cash Profit</p>
              </div>
              <p className={`text-xl font-bold ${data.cash_profit >= 0 ? 'text-blue-700' : 'text-orange-600'}`}>
                {data.cash_profit < 0 ? '-' : ''}{formatCurrency(Math.abs(data.cash_profit))}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Collected − Paid Out</p>
            </div>
          </div>

          {/* ── INCOME SECTION ── */}
          <div className="card">
            <SectionHeader title="Income" icon={TrendingUp} color="border-green-400" />

            <Row label="Total Sales Billed"    value={data.total_billed}    color="text-green-700" bold />
            <Row label="Amount Collected"      value={data.total_collected} indent color="text-green-600" />
            <Row label="Customer Dues (unpaid)" value={data.customer_dues}  indent color="text-red-500" />

            {data.oil_breakdown.length > 0 && (
              <>
                <Divider />
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-2 mb-1">Oil-wise Breakdown</p>
                {data.oil_breakdown.map(o => (
                  <Row key={o.name} label={o.name} sub={`${o.quantity} jars`} value={o.revenue} indent />
                ))}
              </>
            )}
          </div>

          {/* ── EXPENSES SECTION ── */}
          <div className="card">
            <SectionHeader title="Expenses" icon={TrendingDown} color="border-red-400" />

            {/* Category expenses */}
            {data.expense_breakdown.length > 0 && (
              <>
                {data.expense_breakdown.map(e => (
                  <div key={e.category}>
                    <Row label={e.category} value={e.total} color="text-red-600" />
                    {e.due > 0 && (
                      <Row label="— Paid" value={e.paid} indent color="text-gray-500" />
                    )}
                    {e.due > 0 && (
                      <Row label="— Due" value={e.due} indent color="text-red-400" />
                    )}
                  </div>
                ))}
                <Divider />
              </>
            )}

            {/* Salary breakdown */}
            {data.salary_breakdown.length > 0 && (
              <>
                <div className="flex items-center gap-2 mt-2 mb-1">
                  <Users className="w-4 h-4 text-blue-500" />
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Employee Salaries</p>
                </div>
                {data.salary_breakdown.map(s => (
                  <div key={s.name} className="pl-2">
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-sm text-gray-700 font-medium">{s.name}</span>
                      <span className="text-sm font-semibold text-gray-800">{formatCurrency(s.salary_due)}</span>
                    </div>
                    <div className="flex gap-4 pl-3 pb-1">
                      <span className="text-xs text-green-600">Paid: {formatCurrency(s.paid)}</span>
                      {s.due > 0 && <span className="text-xs text-red-500">Due: {formatCurrency(s.due)}</span>}
                    </div>
                  </div>
                ))}
                <Row label="Total Salaries" value={data.total_salary_due} bold />
                <Row label="— Paid"         value={data.total_salary_paid}            indent color="text-gray-500" />
                {data.total_salary_due_remaining > 0 && (
                  <Row label="— Due" value={data.total_salary_due_remaining} indent color="text-red-400" />
                )}
                <Divider />
              </>
            )}

            <Row label="Total Expenses"      value={data.total_expenses}      bold color="text-red-700" />
            <Row label="— Total Paid Out"    value={data.total_expenses_paid} indent color="text-gray-500" />
            {data.total_expenses_due > 0 && (
              <Row label="— Total Due"       value={data.total_expenses_due}  indent color="text-red-400" />
            )}
          </div>

          {/* ── FINAL P&L SUMMARY ── */}
          <div className="card border-2 border-gray-800">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b-2 border-gray-800">
              <Droplets className="w-5 h-5 text-orange-500" />
              <h2 className="font-bold text-gray-800 text-base">EMTA TRADERS — {monthLabel(month)}</h2>
            </div>

            <div className="space-y-0">
              <Row label="Total Sales Billed"   value={data.total_billed}         color="text-green-700" />
              <Row label="Total Expenses"        value={data.total_expenses}        color="text-red-600" />
              <div className={`flex items-center justify-between py-3 px-4 rounded-xl mt-2 ${data.gross_profit >= 0 ? 'bg-green-50 border-2 border-green-300' : 'bg-red-50 border-2 border-red-300'}`}>
                <span className="font-bold text-gray-800">Gross Profit</span>
                <span className={`text-xl font-bold ${data.gross_profit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {data.gross_profit < 0 ? '−' : ''}{formatCurrency(Math.abs(data.gross_profit))}
                </span>
              </div>

              <div className="mt-3 pt-3 border-t border-dashed border-gray-300">
                <Row label="Actually Collected"  value={data.total_collected}       color="text-green-600" />
                <Row label="Actually Paid Out"   value={data.total_expenses_paid}   color="text-red-500" />
                <div className={`flex items-center justify-between py-3 px-4 rounded-xl mt-2 ${data.cash_profit >= 0 ? 'bg-blue-50 border-2 border-blue-300' : 'bg-orange-50 border-2 border-orange-300'}`}>
                  <div>
                    <span className="font-bold text-gray-800">Cash Profit</span>
                    <p className="text-xs text-gray-400">Money in hand</p>
                  </div>
                  <span className={`text-xl font-bold ${data.cash_profit >= 0 ? 'text-blue-700' : 'text-orange-600'}`}>
                    {data.cash_profit < 0 ? '−' : ''}{formatCurrency(Math.abs(data.cash_profit))}
                  </span>
                </div>
              </div>

              {(data.customer_dues > 0 || data.total_expenses_due > 0) && (
                <div className="mt-3 pt-3 border-t border-dashed border-gray-300 space-y-1">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Pending Amounts</p>
                  {data.customer_dues > 0 && (
                    <div className="flex justify-between items-center bg-amber-50 rounded-xl px-4 py-2.5">
                      <span className="text-sm font-medium text-gray-700">Customer dues to collect</span>
                      <span className="font-bold text-amber-700">{formatCurrency(data.customer_dues)}</span>
                    </div>
                  )}
                  {data.total_expenses_due > 0 && (
                    <div className="flex justify-between items-center bg-red-50 rounded-xl px-4 py-2.5">
                      <span className="text-sm font-medium text-gray-700">Expenses yet to pay</span>
                      <span className="font-bold text-red-600">{formatCurrency(data.total_expenses_due)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
