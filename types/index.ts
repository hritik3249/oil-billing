export type OilType = {
  id: string
  name: string
  rate: number
  unit: string
}

export type Customer = {
  id: string
  name: string
  area: string
  phone: string
  vehicle_number: string
  created_at: string
}

export type BillItem = {
  oil_type_id: string
  oil_name: string
  quantity: number
  rate: number
  total: number
}

export type Payment = {
  id: string
  date: string
  amount: number
  note?: string
}

export type Bill = {
  id: string
  bill_number: string
  customer_id: string
  customer_name: string
  customer_area: string
  vehicle_number: string
  date: string
  items: BillItem[]
  total_amount: number
  amount_paid: number
  due_amount: number
  payments: Payment[]
  notes?: string
  created_at: string
}

export type Employee = {
  id: string
  name: string
  role: string
  monthly_salary: number
  join_date: string
  active: boolean
  created_at: string
}

export type SalaryPayment = {
  id: string
  amount: number
  date: string
  note?: string
}

export type SalaryRecord = {
  id: string
  employee_id: string
  employee_name: string
  month: string        // 'YYYY-MM'
  salary_due: number
  amount_paid: number
  due_amount: number
  payments: SalaryPayment[]
  created_at: string
}

export const PURCHASE_CATEGORIES = [
  'Rice Oil Tanker',
  'Raw Material',
  'Tin',
  'Label & Branding',
  'Employee Salary',
  'Transportation & Maintenance',
  'Scent / Perfume',
  'Colour',
  'Miscellaneous',
] as const

export type PurchaseCategory = typeof PURCHASE_CATEGORIES[number]

export type Purchase = {
  id: string
  category: PurchaseCategory
  description: string
  supplier: string
  amount: number
  amount_paid: number
  due_amount: number
  date: string
  payments: Payment[]
  notes?: string
  created_at: string
}

export type StockEntry = {
  id: string
  oil_type_id: string
  oil_name: string
  quantity: number
  entry_type: 'production' | 'adjustment'
  date: string
  notes: string
  created_at: string
}

export type OilStock = {
  oil_type_id: string
  oil_name: string
  produced: number
  sold: number
  balance: number
  tracking_since: string | null
}

export type DashboardStats = {
  total_sales: number
  total_purchases: number
  gross_profit: number
  pending_dues: number
  purchase_dues: number
  oil_wise_sales: { oil_name: string; total: number; quantity: number }[]
  category_wise_purchases: { category: string; total: number }[]
  recent_bills: Bill[]
  daily_chart: { date: string; sales: number; purchases: number }[]
}

