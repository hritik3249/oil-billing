'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { DashboardStats } from '@/types'
import { formatCurrency, formatDate } from '@/lib/constants'
import { TrendingUp, TrendingDown, AlertCircle, ShoppingCart, ArrowRight, PlusCircle, ArrowUpDown, RefreshCw } from 'lucide-react'
import { DashboardSkeleton } from '@/components/ui/Skeletons'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, Tooltip as PieTooltip
} from 'recharts'

const PIE_COLORS = ['#111', '#555', '#888', '#aaa', '#333', '#666', '#999', '#ccc']

// Append a timestamp so the browser never serves a cached response
function dashboardUrl() {
  return `/api/dashboard?t=${Date.now()}`
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchStats = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true)
    try {
      const res = await fetch(dashboardUrl(), {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
      })
      const d = await res.json()
      if (!d.error) {
        setStats(d)
        setLastUpdated(new Date())
      }
    } catch (e) {
      console.error('Dashboard fetch error:', e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  // Initial load
  useEffect(() => { fetchStats() }, [fetchStats])

  // Refresh whenever the tab becomes visible again
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchStats(true)
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [fetchStats])

  // Refresh on window focus
  useEffect(() => {
    const handleFocus = () => fetchStats(true)
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [fetchStats])

  // Polling every 30 seconds
  useEffect(() => {
    const id = setInterval(() => fetchStats(true), 30_000)
    return () => clearInterval(id)
  }, [fetchStats])

  if (loading) return <DashboardSkeleton />
  if (!stats) return null

  const profitPositive = stats.gross_profit >= 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          {lastUpdated && (
            <p className="text-xs text-gray-400 mt-0.5">
              Updated {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchStats(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-gray-500 hover:text-orange-500 bg-white border-2 border-gray-100 hover:border-orange-200 px-3 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <Link href="/bills/new" className="btn-primary flex items-center gap-2 py-2 px-4 text-base">
            <PlusCircle className="w-5 h-5" /> New Bill
          </Link>
        </div>
      </div>

      {/* ── STAT CARDS ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="card border-2 border-green-100 bg-green-50">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-5 h-5 text-green-500" />
            <p className="text-xs text-gray-500 font-medium">Sales (30d)</p>
          </div>
          <p className="text-xl font-bold text-gray-800">{formatCurrency(stats.total_sales)}</p>
        </div>

        <div className="card border-2 border-red-100 bg-red-50">
          <div className="flex items-center gap-2 mb-1">
            <ShoppingCart className="w-5 h-5 text-red-500" />
            <p className="text-xs text-gray-500 font-medium">Purchases (30d)</p>
          </div>
          <p className="text-xl font-bold text-gray-800">{formatCurrency(stats.total_purchases)}</p>
        </div>

        <div className={`card border-2 col-span-2 sm:col-span-1 ${profitPositive ? 'border-blue-100 bg-blue-50' : 'border-orange-100 bg-orange-50'}`}>
          <div className="flex items-center gap-2 mb-1">
            <ArrowUpDown className={`w-5 h-5 ${profitPositive ? 'text-blue-500' : 'text-orange-500'}`} />
            <p className="text-xs text-gray-500 font-medium">Gross Profit</p>
          </div>
          <p className={`text-xl font-bold ${profitPositive ? 'text-blue-700' : 'text-red-600'}`}>
            {profitPositive ? '' : '-'}{formatCurrency(Math.abs(stats.gross_profit))}
          </p>
        </div>

        <div className="card border-2 border-amber-100 bg-amber-50">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            <p className="text-xs text-gray-500 font-medium">Customer Dues</p>
          </div>
          <p className="text-xl font-bold text-red-600">{formatCurrency(stats.pending_dues)}</p>
        </div>

        <div className="card border-2 border-purple-100 bg-purple-50">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="w-5 h-5 text-purple-500" />
            <p className="text-xs text-gray-500 font-medium">Purchase Dues</p>
          </div>
          <p className="text-xl font-bold text-purple-700">{formatCurrency(stats.purchase_dues)}</p>
        </div>
      </div>

      {/* ── COMBINED DAILY CHART ── */}
      <div className="card">
        <h2 className="font-bold text-gray-700 mb-4">Daily Sales vs Purchases (Last 10 Days)</h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={stats.daily_chart} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <XAxis dataKey="date" tickFormatter={d => d.slice(5)} tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip
              formatter={(v: number, name: string) => [formatCurrency(v), name === 'sales' ? 'Sales' : 'Purchases']}
              labelFormatter={l => formatDate(l)}
            />
            <Legend formatter={v => v === 'sales' ? 'Sales' : 'Purchases'} />
            <Bar dataKey="sales"     fill="#111"  radius={[4,4,0,0]} />
            <Bar dataKey="purchases" fill="#aaa"  radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── CATEGORY-WISE PURCHASES ── */}
      {stats.category_wise_purchases.length > 0 && (
        <div className="card">
          <h2 className="font-bold text-gray-700 mb-4">Spend by Category (30d)</h2>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={stats.category_wise_purchases} dataKey="total" nameKey="category"
                  cx="50%" cy="50%" outerRadius={75} innerRadius={35}>
                  {stats.category_wise_purchases.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <PieTooltip formatter={(v: number) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="w-full space-y-1.5">
              {stats.category_wise_purchases.map((c, i) => (
                <div key={c.category} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-gray-600 truncate max-w-[140px]">{c.category}</span>
                  </div>
                  <span className="font-semibold text-gray-800">{formatCurrency(c.total)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── OIL-WISE SALES ── */}
      {stats.oil_wise_sales.length > 0 && (
        <div className="card">
          <h2 className="font-bold text-gray-700 mb-3">Oil-wise Sales (30d)</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.oil_wise_sales.map(oil => (
              <div key={oil.oil_name} className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-500 font-medium truncate">{oil.oil_name}</p>
                <p className="text-base font-bold text-orange-600 mt-1">{formatCurrency(oil.total)}</p>
                <p className="text-xs text-gray-400">{oil.quantity} jars</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── RECENT BILLS ── */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-700">Recent Bills</h2>
          <Link href="/bills" className="text-orange-500 text-sm font-semibold flex items-center gap-1">
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="space-y-2">
          {(!stats.recent_bills || stats.recent_bills.length === 0) ? (
            <p className="text-gray-400 text-sm">No bills yet. <Link href="/bills/new" className="text-orange-500 font-semibold">Create first bill →</Link></p>
          ) : stats.recent_bills.map(bill => (
            <Link key={bill.id} href={`/bills/${bill.id}`}
              className="flex items-center justify-between p-3 rounded-xl hover:bg-amber-50 border border-transparent hover:border-amber-100 transition-all">
              <div>
                <p className="font-semibold text-gray-800">{bill.customer_name}</p>
                <p className="text-xs text-gray-400">{bill.bill_number} · {formatDate(bill.date)}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-800">{formatCurrency(bill.total_amount)}</p>
                {bill.due_amount > 0 && <p className="text-xs text-red-500 font-medium">Due: {formatCurrency(bill.due_amount)}</p>}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
