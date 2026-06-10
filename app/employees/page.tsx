'use client'
import { useEffect, useState } from 'react'
import { Employee, SalaryRecord, SalaryPayment } from '@/types'
import { formatCurrency, formatDate } from '@/lib/constants'
import { TableSkeleton } from '@/components/ui/Skeletons'
import {
  UserCog, Plus, Edit2, Trash2, X, Check, CheckCircle,
  IndianRupee, ChevronDown, ChevronUp, Save,
} from 'lucide-react'

const ROLES = ['Manager', 'Worker', 'Driver', 'Helper', 'Accountant', 'Other']

const currentMonth = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const monthLabel = (m: string) => {
  const [y, mo] = m.split('-')
  return new Date(Number(y), Number(mo) - 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

export default function EmployeesPage() {
  const [employees, setEmployees]       = useState<Employee[]>([])
  const [loading, setLoading]           = useState(true)
  const [toast, setToast]               = useState('')
  const [showForm, setShowForm]         = useState(false)
  const [editEmp, setEditEmp]           = useState<Employee | null>(null)
  const [form, setForm]                 = useState({ name: '', role: 'Worker', monthly_salary: '', join_date: new Date().toISOString().split('T')[0] })
  const [saving, setSaving]             = useState(false)

  // Salary panel
  const [openEmpId, setOpenEmpId]       = useState<string | null>(null)
  const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([])
  const [salaryMonth, setSalaryMonth]   = useState(currentMonth())
  const [showPayForm, setShowPayForm]   = useState<string | null>(null) // salary_record id
  const [payAmount, setPayAmount]       = useState<number | ''>('')
  const [payDate, setPayDate]           = useState(new Date().toISOString().split('T')[0])
  const [payNote, setPayNote]           = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const fetchEmployees = async () => {
    const res = await fetch('/api/employees')
    const data = await res.json()
    setEmployees(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  const fetchSalary = async (empId: string) => {
    const res = await fetch(`/api/salary?employee_id=${empId}`)
    const data = await res.json()
    setSalaryRecords(Array.isArray(data) ? data : [])
  }

  useEffect(() => { fetchEmployees() }, [])

  const openSalary = (emp: Employee) => {
    if (openEmpId === emp.id) { setOpenEmpId(null); return }
    setOpenEmpId(emp.id)
    fetchSalary(emp.id)
  }

  const openAdd = () => { setForm({ name: '', role: 'Worker', monthly_salary: '', join_date: new Date().toISOString().split('T')[0] }); setEditEmp(null); setShowForm(true) }
  const openEdit = (e: Employee) => { setForm({ name: e.name, role: e.role, monthly_salary: String(e.monthly_salary), join_date: e.join_date }); setEditEmp(e); setShowForm(true) }

  const saveEmployee = async () => {
    if (!form.name.trim() || !form.monthly_salary) return
    setSaving(true)
    await fetch('/api/employees', {
      method: editEmp ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editEmp
        ? { id: editEmp.id, name: form.name, role: form.role, monthly_salary: Number(form.monthly_salary), active: editEmp.active }
        : { name: form.name, role: form.role, monthly_salary: Number(form.monthly_salary), join_date: form.join_date }),
    })
    setSaving(false); setShowForm(false); setEditEmp(null)
    fetchEmployees()
    showToast(editEmp ? '✅ Employee updated!' : '✅ Employee added!')
  }

  const deleteEmployee = async (id: string) => {
    if (!confirm('Delete this employee? All salary records will also be deleted.')) return
    await fetch(`/api/employees?id=${id}`, { method: 'DELETE' })
    fetchEmployees(); showToast('🗑 Employee removed')
  }

  // Create salary record for selected month
  const createSalaryRecord = async (emp: Employee) => {
    const res = await fetch('/api/salary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employee_id: emp.id, employee_name: emp.name, month: salaryMonth, salary_due: emp.monthly_salary }),
    })
    const data = await res.json()
    if (data.error) { showToast('⚠️ ' + data.error); return }
    fetchSalary(emp.id); showToast('✅ Salary record created!')
  }

  const addPayment = async (recordId: string) => {
    if (!payAmount || Number(payAmount) <= 0) return
    const res = await fetch('/api/salary', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: recordId, action: 'add_payment', payment: { date: payDate, amount: Number(payAmount), note: payNote } }),
    })
    const data = await res.json()
    if (data.id) {
      setSalaryRecords(prev => prev.map(r => r.id === data.id ? { ...data, payments: data.payments || [] } : r))
      setShowPayForm(null); setPayAmount(''); setPayNote('')
      setPayDate(new Date().toISOString().split('T')[0])
      showToast('✅ Payment recorded!')
    }
  }

  const deletePayment = async (recordId: string, paymentId: string) => {
    if (!confirm('Remove this payment?')) return
    const res = await fetch('/api/salary', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: recordId, action: 'delete_payment', payment_id: paymentId }),
    })
    const data = await res.json()
    if (data.id) setSalaryRecords(prev => prev.map(r => r.id === data.id ? { ...data, payments: data.payments || [] } : r))
  }

  const deleteSalaryRecord = async (id: string) => {
    if (!confirm('Delete this salary record?')) return
    await fetch(`/api/salary?id=${id}`, { method: 'DELETE' })
    setSalaryRecords(prev => prev.filter(r => r.id !== id))
  }

  const totalSalaryDue = employees.reduce((s, e) => s + (e.active ? e.monthly_salary : 0), 0)

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-2 font-semibold text-sm whitespace-nowrap animate-toast-in">
          <CheckCircle className="w-5 h-5 text-green-400 shrink-0" /> {toast}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Employees</h1>
          <p className="text-sm text-gray-400">Monthly payroll: {formatCurrency(totalSalaryDue)}</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2 py-2 px-4 text-base">
          <Plus className="w-5 h-5" /> Add
        </button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="card border-2 border-orange-200 bg-orange-50 space-y-3">
          <h2 className="font-bold text-gray-800">{editEmp ? 'Edit Employee' : 'Add Employee'}</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label">Full Name *</label>
              <input className="input-field" placeholder="Employee name" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
            </div>
            <div>
              <label className="label">Role</label>
              <select className="input-field" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                {ROLES.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Monthly Salary (₹)</label>
              <input type="number" inputMode="decimal" className="input-field" placeholder="0"
                value={form.monthly_salary} onChange={e => setForm(f => ({ ...f, monthly_salary: e.target.value }))}
                onFocus={e => e.target.select()} />
            </div>
            {!editEmp && (
              <div className="col-span-2">
                <label className="label">Join Date</label>
                <input type="date" className="input-field" value={form.join_date}
                  onChange={e => setForm(f => ({ ...f, join_date: e.target.value }))} />
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={saveEmployee} disabled={saving || !form.name.trim() || !form.monthly_salary}
              className="btn-primary flex items-center gap-2 flex-1 justify-center disabled:opacity-50">
              <Check className="w-4 h-4" /> {saving ? 'Saving...' : 'Save'}
            </button>
            <button onClick={() => { setShowForm(false); setEditEmp(null) }} className="btn-secondary px-4">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Employee List */}
      {loading ? (
        <TableSkeleton rows={4} />
      ) : employees.length === 0 ? (
        <div className="card text-center py-10 text-gray-400">No employees yet. Add your first one!</div>
      ) : (
        <div className="space-y-3">
          {employees.map(emp => (
            <div key={emp.id} className="card p-0 overflow-hidden">
              {/* Employee header row */}
              <div className="flex items-center gap-3 p-4">
                <div className="w-11 h-11 bg-orange-100 rounded-xl flex items-center justify-center shrink-0">
                  <UserCog className="w-6 h-6 text-orange-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800 text-base">{emp.name}</p>
                  <p className="text-sm text-gray-500">{emp.role} · {formatCurrency(emp.monthly_salary)}/mo</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => openEdit(emp)} className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteEmployee(emp.id)} className="p-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl">
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => openSalary(emp)}
                    className="flex items-center gap-1 bg-orange-50 hover:bg-orange-100 text-orange-600 px-3 py-2 rounded-xl text-sm font-semibold">
                    <IndianRupee className="w-4 h-4" />
                    {openEmpId === emp.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Salary panel */}
              {openEmpId === emp.id && (
                <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-4">
                  {/* Month selector + create */}
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="label text-xs">Select Month</label>
                      <input type="month" className="input-field" value={salaryMonth}
                        onChange={e => setSalaryMonth(e.target.value)} />
                    </div>
                    <button onClick={() => createSalaryRecord(emp)}
                      className="btn-primary py-3 px-4 flex items-center gap-1.5 text-sm whitespace-nowrap">
                      <Plus className="w-4 h-4" /> Create Record
                    </button>
                  </div>

                  {/* Salary records */}
                  {salaryRecords.length === 0 ? (
                    <p className="text-center text-gray-400 text-sm py-3">No salary records yet. Select a month and click Create Record.</p>
                  ) : (
                    salaryRecords.map(rec => (
                      <div key={rec.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                        {/* Record header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                          <div>
                            <p className="font-bold text-gray-800">{monthLabel(rec.month)}</p>
                            <p className="text-xs text-gray-400">Due: {formatCurrency(rec.salary_due)}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <p className="text-sm font-bold text-green-600">Paid: {formatCurrency(rec.amount_paid)}</p>
                              {rec.due_amount > 0
                                ? <p className="text-xs text-red-500 font-semibold">Due: {formatCurrency(rec.due_amount)}</p>
                                : <p className="text-xs text-green-500 font-semibold">Fully Paid ✓</p>}
                            </div>
                            <button onClick={() => setShowPayForm(showPayForm === rec.id ? null : rec.id)}
                              disabled={rec.due_amount === 0}
                              className="flex items-center gap-1 bg-green-500 hover:bg-green-600 disabled:opacity-40 text-white px-3 py-2 rounded-xl text-xs font-bold">
                              <Plus className="w-3.5 h-3.5" /> Pay
                            </button>
                            <button onClick={() => deleteSalaryRecord(rec.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Add payment form */}
                        {showPayForm === rec.id && (
                          <div className="px-4 py-3 bg-green-50 border-b border-green-100 space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="label text-xs">Amount (₹) *</label>
                                <input type="number" inputMode="decimal" className="input-field font-bold" placeholder="0"
                                  value={payAmount} onChange={e => setPayAmount(e.target.value === '' ? '' : Number(e.target.value))}
                                  onFocus={e => e.target.select()} autoFocus />
                              </div>
                              <div>
                                <label className="label text-xs">Date</label>
                                <input type="date" className="input-field" value={payDate}
                                  onChange={e => setPayDate(e.target.value)} />
                              </div>
                            </div>
                            <input className="input-field text-sm" placeholder="Note (Cash / UPI / Advance...)"
                              value={payNote} onChange={e => setPayNote(e.target.value)} />
                            <div className="flex gap-2">
                              <button onClick={() => addPayment(rec.id)} disabled={!payAmount}
                                className="btn-success flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm disabled:opacity-50">
                                <Save className="w-4 h-4" /> Record Payment
                              </button>
                              <button onClick={() => setShowPayForm(null)} className="btn-secondary px-3 py-2.5"><X className="w-4 h-4" /></button>
                            </div>
                          </div>
                        )}

                        {/* Payment list */}
                        {(rec.payments || []).length > 0 && (
                          <div className="px-4 py-2 space-y-1.5">
                            {(rec.payments as SalaryPayment[]).map((p, i) => (
                              <div key={p.id} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                                <div className="flex items-center gap-2">
                                  <span className="w-5 h-5 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0">{i+1}</span>
                                  <div>
                                    <span className="font-semibold text-gray-800">{formatCurrency(p.amount)}</span>
                                    <span className="text-gray-400 ml-2 text-xs">{formatDate(p.date)}{p.note ? ` · ${p.note}` : ''}</span>
                                  </div>
                                </div>
                                <button onClick={() => deletePayment(rec.id, p.id)} className="p-1.5 text-red-400 hover:text-red-600 rounded-lg">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
