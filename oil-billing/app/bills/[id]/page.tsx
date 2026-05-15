'use client'
import { useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { Bill, BillItem, Payment } from '@/types'
import { formatCurrency, formatDate } from '@/lib/constants'
import Invoice from '@/components/invoice/Invoice'
import {
  Printer, Download, ArrowLeft, CheckCircle, AlertCircle,
  User, MapPin, Car, Calendar, Hash, CreditCard,
  Save, X, Plus, Trash2, Edit3, IndianRupee, ChevronDown
} from 'lucide-react'

export default function BillDetailPage() {
  const { id }       = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const router       = useRouter()
  const printRef     = useRef<HTMLDivElement>(null)

  const [bill, setBill]       = useState<Bill | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [toast, setToast]     = useState('')

  // Payment installment form
  const [showAddPayment, setShowAddPayment] = useState(false)
  const [payAmount, setPayAmount]           = useState<number | ''>('')
  const [payDate, setPayDate]               = useState(new Date().toISOString().split('T')[0])
  const [payNote, setPayNote]               = useState('')

  // Edit bill mode
  const [editMode, setEditMode]   = useState(false)
  const [editItems, setEditItems] = useState<BillItem[]>([])

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3200) }

  const fetchBill = async () => {
    const res  = await fetch(`/api/bills?id=${id}`)
    const data = await res.json()
    if (data.id) { setBill({ ...data, payments: data.payments || [] }); setLoading(false) }
  }

  useEffect(() => { fetchBill() }, [id])

  useEffect(() => {
    if (searchParams.get('print') === '1' && bill)
      setTimeout(() => window.print(), 600)
  }, [bill, searchParams])

  // ── PDF ──
  const handlePDF = async () => {
    if (!bill) return
    const invoiceEl = document.getElementById('print-invoice')
    if (!invoiceEl) { showToast('❌ Invoice not found on page'); return }

    showToast('⏳ Generating PDF...')

    try {
      const html2canvas = (await import('html2canvas')).default
      const { default: jsPDF } = await import('jspdf')

      // Temporarily make the invoice element visible at exact A5 px size
      const prevStyle = invoiceEl.getAttribute('style') || ''
      invoiceEl.style.width    = '559px'   // 148mm @ 96dpi
      invoiceEl.style.height   = '794px'   // 210mm @ 96dpi
      invoiceEl.style.overflow = 'hidden'
      invoiceEl.style.position = 'relative'

      const canvas = await html2canvas(invoiceEl, {
        scale:           3,          // 3× = 1677×2382px → crisp
        useCORS:         true,
        backgroundColor: '#ffffff',
        logging:         false,
        width:           559,
        height:          794,
        foreignObjectRendering: false,
      })

      // Restore original styles
      invoiceEl.setAttribute('style', prevStyle)

      const imgData = canvas.toDataURL('image/png', 1.0)
      const doc = new jsPDF({ unit: 'mm', format: 'a5', orientation: 'portrait' })

      // Page 1 — invoice screenshot (exact match to print)
      doc.addImage(imgData, 'PNG', 0, 0, 148, 210)

      // Page 2 — payment records (only if payments exist)
      const payments = bill.payments || []
      if (payments.length > 0) {
        doc.addPage('a5', 'portrait')
        const m = 12
        let y = 16

        doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(17)
        doc.text('EMTA TRADERS', m, y); y += 7

        doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(100)
        doc.text('65/J, Ram Krishna Road, Rishra, Hooghly - 712248  |  Mob: 7003868243', m, y); y += 5
        doc.text('GST: 19AGMPR8914Q1Z7', m, y); y += 7

        doc.setLineWidth(0.6); doc.setDrawColor(17)
        doc.line(m, y, 148 - m, y); y += 7

        doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(17)
        doc.text('Payment Records', m, y); y += 5
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(80)
        doc.text(`Invoice: ${bill.bill_number}   |   Customer: ${bill.customer_name}`, m, y); y += 9

        // Table header
        doc.setLineWidth(0.5); doc.setDrawColor(17)
        doc.line(m, y - 1, 148 - m, y - 1)
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(17)
        doc.text('#',      m,       y + 4)
        doc.text('Date',   m + 8,   y + 4)
        doc.text('Note',   m + 40,  y + 4)
        doc.text('Amount', 148 - m, y + 4, { align: 'right' })
        y += 7
        doc.line(m, y, 148 - m, y); y += 6

        // Rows
        payments.forEach((p, i) => {
          doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(60)
          doc.text(String(i + 1),      m,       y)
          doc.text(formatDate(p.date), m + 8,   y)
          doc.text(p.note || '-',      m + 40,  y, { maxWidth: 46 })
          doc.setFont('helvetica', 'bold'); doc.setTextColor(17)
          doc.text(`Rs.${p.amount}`,   148 - m, y, { align: 'right' })
          doc.setDrawColor(220); doc.setLineWidth(0.2)
          y += 6; doc.line(m, y, 148 - m, y); y += 4
        })

        y += 4
        doc.setLineWidth(0.5); doc.setDrawColor(17)
        doc.line(m, y, 148 - m, y); y += 7

        // Summary
        const rows = [
          { label: 'Total Bill Amount', val: bill.total_amount, bold: false },
          { label: 'Total Paid',        val: bill.amount_paid,  bold: false },
          { label: 'Balance Due',       val: bill.due_amount,   bold: true  },
        ]
        rows.forEach(({ label, val, bold }) => {
          doc.setFont('helvetica', bold ? 'bold' : 'normal')
          doc.setFontSize(bold ? 11 : 9)
          doc.setTextColor(bold ? 17 : 80)
          doc.text(label,           m,       y)
          doc.setFont('helvetica', 'bold'); doc.setTextColor(17)
          doc.text(`Rs.${val}`,     148 - m, y, { align: 'right' })
          y += 7
        })

        doc.setLineWidth(0.5); doc.setDrawColor(17)
        doc.line(m, 200, 148 - m, 200)
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(120)
        doc.text('EMTA TRADERS  —  Mob: 7003868243  —  GST: 19AGMPR8914Q1Z7', 74, 206, { align: 'center' })
      }

      doc.save(`${bill.bill_number}.pdf`)
      showToast('✅ PDF downloaded!')
    } catch (err) {
      console.error('PDF error:', err)
      showToast('❌ PDF failed. Try again.')
    }
  }

  // ── Add Payment ──
  const addPayment = async () => {
    if (!payAmount || Number(payAmount) <= 0) { showToast('⚠️ Enter a valid amount'); return }
    setSaving(true)
    const res  = await fetch('/api/bills', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id, action: 'add_payment',
        payment: { date: payDate, amount: Number(payAmount), note: payNote },
      }),
    })
    const data = await res.json()
    if (data.id) {
      setBill({ ...data, payments: data.payments || [] })
      setShowAddPayment(false); setPayAmount(''); setPayNote('')
      setPayDate(new Date().toISOString().split('T')[0])
      showToast('✅ Payment recorded!')
    } else { showToast('❌ Error: ' + (data.error || 'Unknown')) }
    setSaving(false)
  }

  // ── Delete Payment ──
  const deletePayment = async (paymentId: string) => {
    if (!confirm('Remove this payment?')) return
    const res  = await fetch('/api/bills', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'delete_payment', payment_id: paymentId }),
    })
    const data = await res.json()
    if (data.id) { setBill({ ...data, payments: data.payments || [] }); showToast('🗑 Payment removed') }
  }

  // ── Edit Bill ──
  const openEdit = () => { setEditItems(JSON.parse(JSON.stringify(bill!.items))); setEditMode(true) }
  const cancelEdit = () => setEditMode(false)

  const updateEditItem = (idx: number, field: keyof BillItem, val: string | number) => {
    setEditItems(prev => prev.map((item, i) => {
      if (i !== idx) return item
      const updated = { ...item, [field]: val }
      if (field === 'rate' || field === 'quantity') {
        const rate = field === 'rate' ? Number(val) : updated.rate
        const qty  = field === 'quantity' ? Number(val) : updated.quantity
        updated.total = rate * qty
      }
      return updated
    }))
  }

  const saveEdit = async () => {
    setSaving(true)
    const res  = await fetch('/api/bills', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'edit_bill', items: editItems }),
    })
    const data = await res.json()
    if (data.id) { setBill({ ...data, payments: data.payments || [] }); setEditMode(false); showToast('✅ Bill updated!') }
    else { showToast('❌ Error saving') }
    setSaving(false)
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-orange-500 animate-pulse text-lg">Loading...</div>
  if (!bill)   return <div className="text-center py-20 text-gray-400">Bill not found.</div>

  const isPaid   = bill.due_amount === 0
  const payments: Payment[] = bill.payments || []
  const editTotal = editItems.reduce((s, i) => s + i.total, 0)

  return (
    <div className="max-w-2xl mx-auto space-y-4">

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-2 font-semibold text-sm whitespace-nowrap">
          <CheckCircle className="w-5 h-5 text-green-400 shrink-0" /> {toast}
        </div>
      )}

      {/* Top bar */}
      <div className="flex items-center justify-between no-print">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 font-semibold transition-colors">
          <ArrowLeft className="w-5 h-5" /> Back
        </button>
        <div className="flex gap-2">
          <button onClick={handlePDF} className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2.5 px-4 rounded-xl transition-all text-sm">
            <Download className="w-4 h-4" /> PDF
          </button>
          <button onClick={() => window.print()} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 px-4 rounded-xl transition-all text-sm">
            <Printer className="w-4 h-4" /> Print
          </button>
        </div>
      </div>

      {/* Status banner */}
      <div className={`no-print rounded-2xl px-5 py-4 flex items-center gap-3 ${isPaid ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'}`}>
        {isPaid ? <CheckCircle className="w-6 h-6 text-green-500 shrink-0" /> : <AlertCircle className="w-6 h-6 text-red-500 shrink-0" />}
        <div className="flex-1">
          <p className={`font-bold ${isPaid ? 'text-green-700' : 'text-red-700'}`}>
            {isPaid ? 'Fully Paid ✓' : `Due: ${formatCurrency(bill.due_amount)}`}
          </p>
          <p className="text-sm text-gray-500">
            Total: {formatCurrency(bill.total_amount)} &nbsp;·&nbsp; Paid: {formatCurrency(bill.amount_paid)}
          </p>
        </div>
        {!editMode && (
          <button onClick={openEdit} className="flex items-center gap-1.5 bg-gray-700 hover:bg-gray-800 text-white px-3 py-2 rounded-xl text-sm font-bold no-print">
            <Edit3 className="w-4 h-4" /> Edit Bill
          </button>
        )}
      </div>

      {/* ── EDIT BILL MODE ── */}
      {editMode && (
        <div className="card border-2 border-gray-700 no-print">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800 flex items-center gap-2"><Edit3 className="w-5 h-5" /> Edit Bill Items</h3>
            <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
          </div>
          <div className="space-y-3">
            {editItems.map((item, idx) => (
              <div key={idx} className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2">
                <div>
                  <label className="label text-xs">Oil / Product Name</label>
                  <input className="input-field font-semibold" value={item.oil_name}
                    onChange={e => updateEditItem(idx, 'oil_name', e.target.value)} />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="label text-xs">Qty</label>
                    <input type="number" min="1" className="input-field text-center font-bold"
                      value={item.quantity}
                      onChange={e => updateEditItem(idx, 'quantity', Math.max(1, Number(e.target.value)))}
                      onFocus={e => e.target.select()} />
                  </div>
                  <div>
                    <label className="label text-xs">Rate (₹)</label>
                    <input type="number" min="0" className="input-field text-center"
                      value={item.rate}
                      onChange={e => updateEditItem(idx, 'rate', Number(e.target.value))}
                      onFocus={e => e.target.select()} />
                  </div>
                  <div>
                    <label className="label text-xs">Total</label>
                    <div className="input-field bg-amber-50 font-bold text-orange-700 text-center">{formatCurrency(item.total)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
            <div>
              <span className="text-sm text-gray-500">New Total: </span>
              <span className="font-bold text-lg text-gray-800">{formatCurrency(editTotal)}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={saveEdit} disabled={saving} className="btn-primary flex items-center gap-2 py-2.5">
                <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button onClick={cancelEdit} className="btn-secondary py-2.5"><X className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      )}

      {/* Bill details */}
      <div className="card no-print">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 text-sm">
          {[
            { icon: Hash,       label: 'Bill No.',  val: bill.bill_number,    mono: true },
            { icon: Calendar,   label: 'Date',      val: formatDate(bill.date) },
            { icon: User,       label: 'Customer',  val: bill.customer_name },
            ...(bill.customer_area  ? [{ icon: MapPin, label: 'Area',    val: bill.customer_area }]  : []),
            ...(bill.vehicle_number ? [{ icon: Car,    label: 'Vehicle', val: bill.vehicle_number }] : []),
            { icon: CreditCard, label: 'Total',     val: formatCurrency(bill.total_amount), highlight: true },
          ].map(({ icon: Icon, label, val, mono, highlight }) => (
            <div key={label} className="flex items-start gap-2">
              <Icon className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-gray-400 text-xs">{label}</p>
                <p className={`font-bold ${mono ? 'font-mono' : ''} ${highlight ? 'text-orange-600 text-base' : 'text-gray-700'}`}>{val}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Items table */}
      <div className="card no-print overflow-x-auto">
        <h2 className="font-bold text-gray-700 mb-3">Oil Items</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-100">
              <th className="text-left py-2 font-semibold text-gray-500">Item</th>
              <th className="text-center py-2 font-semibold text-gray-500">Qty</th>
              <th className="text-right py-2 font-semibold text-gray-500">Rate</th>
              <th className="text-right py-2 font-semibold text-gray-500">Total</th>
            </tr>
          </thead>
          <tbody>
            {bill.items?.map((item, i) => (
              <tr key={i} className="border-b border-gray-50">
                <td className="py-3 font-semibold text-gray-800">{item.oil_name}</td>
                <td className="py-3 text-center text-gray-600">{item.quantity}</td>
                <td className="py-3 text-right text-gray-600">{formatCurrency(item.rate)}</td>
                <td className="py-3 text-right font-bold text-gray-800">{formatCurrency(item.total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-200 bg-amber-50">
              <td colSpan={3} className="py-3 font-bold text-gray-700 text-right pr-4">Grand Total</td>
              <td className="py-3 text-right font-bold text-orange-600 text-lg">{formatCurrency(bill.total_amount)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ── PAYMENT HISTORY ── */}
      <div className="card no-print">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-700 flex items-center gap-2">
            <IndianRupee className="w-5 h-5 text-orange-500" /> Payment History
          </h2>
          {!isPaid && (
            <button onClick={() => setShowAddPayment(!showAddPayment)}
              className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-sm font-bold px-3 py-2 rounded-xl transition-all">
              <Plus className="w-4 h-4" /> Add Payment
            </button>
          )}
        </div>

        {/* Add payment form */}
        {showAddPayment && (
          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 mb-4 space-y-3">
            <h3 className="font-bold text-green-800 text-sm">Record New Payment</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label text-xs">Amount (₹) *</label>
                <input type="number" min="1" className="input-field font-bold text-lg"
                  placeholder="0"
                  value={payAmount}
                  onChange={e => setPayAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  onFocus={e => e.target.select()}
                  autoFocus />
              </div>
              <div>
                <label className="label text-xs">Date *</label>
                <input type="date" className="input-field"
                  value={payDate} onChange={e => setPayDate(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="label text-xs">Note (optional)</label>
              <input className="input-field" placeholder="e.g. Cash, UPI, Cheque..."
                value={payNote} onChange={e => setPayNote(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <button onClick={addPayment} disabled={saving || !payAmount}
                className="btn-success flex items-center gap-2 flex-1 justify-center py-3 disabled:opacity-50">
                <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Record Payment'}
              </button>
              <button onClick={() => setShowAddPayment(false)} className="btn-secondary px-4">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Payment list */}
        {payments.length === 0 ? (
          <div className="text-center py-6 text-gray-400 text-sm">
            {isPaid ? 'No payment history recorded.' : 'No payments recorded yet.'}
          </div>
        ) : (
          <div className="space-y-2">
            {payments.map((p, i) => (
              <div key={p.id} className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-xl flex items-center justify-center text-green-600 font-bold text-sm shrink-0">
                    {i + 1}
                  </div>
                  <div>
                    <p className="font-bold text-gray-800">{formatCurrency(p.amount)}</p>
                    <p className="text-xs text-gray-400">{formatDate(p.date)}{p.note ? ` · ${p.note}` : ''}</p>
                  </div>
                </div>
                <button onClick={() => deletePayment(p.id)}
                  className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Summary */}
        {payments.length > 0 && (
          <div className="mt-4 pt-4 border-t-2 border-gray-100 space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Total Bill Amount</span>
              <span className="font-semibold">{formatCurrency(bill.total_amount)}</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>Total Paid ({payments.length} payment{payments.length > 1 ? 's' : ''})</span>
              <span className="font-bold">{formatCurrency(bill.amount_paid)}</span>
            </div>
            <div className={`flex justify-between font-bold text-base pt-1 border-t border-gray-100 ${isPaid ? 'text-green-600' : 'text-red-600'}`}>
              <span>{isPaid ? 'Fully Paid ✓' : 'Balance Due'}</span>
              <span>{isPaid ? formatCurrency(0) : formatCurrency(bill.due_amount)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Notes */}
      {bill.notes && (
        <div className="card no-print">
          <p className="text-sm text-gray-500 font-medium">Notes</p>
          <p className="text-gray-700 mt-1">{bill.notes}</p>
        </div>
      )}

      {/* Printable invoice */}
      <Invoice bill={bill} />
    </div>
  )
}
