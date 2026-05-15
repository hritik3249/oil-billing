-- ============================================
-- OIL BILLING SYSTEM - Supabase Database Setup
-- Run this in your Supabase SQL Editor
-- ============================================

-- 1. Customers table
CREATE TABLE IF NOT EXISTS customers (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  area           TEXT DEFAULT '',
  vehicle_number TEXT DEFAULT '',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Bills table
CREATE TABLE IF NOT EXISTS bills (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_number    TEXT NOT NULL UNIQUE,
  customer_id    UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name  TEXT NOT NULL,
  customer_area  TEXT DEFAULT '',
  vehicle_number TEXT DEFAULT '',
  date           DATE NOT NULL DEFAULT CURRENT_DATE,
  items          JSONB NOT NULL DEFAULT '[]',
  payments       JSONB NOT NULL DEFAULT '[]',
  total_amount   NUMERIC(10,2) NOT NULL DEFAULT 0,
  amount_paid    NUMERIC(10,2) NOT NULL DEFAULT 0,
  due_amount     NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes          TEXT DEFAULT '',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 2b. Add payments column if upgrading existing database
ALTER TABLE bills ADD COLUMN IF NOT EXISTS payments JSONB NOT NULL DEFAULT '[]';

-- 3. Employees table
CREATE TABLE IF NOT EXISTS employees (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  role           TEXT DEFAULT 'Worker',
  monthly_salary NUMERIC(10,2) NOT NULL DEFAULT 0,
  join_date      DATE DEFAULT CURRENT_DATE,
  active         BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Salary records table (monthly, per employee, with installments)
CREATE TABLE IF NOT EXISTS salary_records (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id    UUID REFERENCES employees(id) ON DELETE CASCADE,
  employee_name  TEXT NOT NULL,
  month          TEXT NOT NULL,        -- format: YYYY-MM
  salary_due     NUMERIC(10,2) NOT NULL DEFAULT 0,
  amount_paid    NUMERIC(10,2) NOT NULL DEFAULT 0,
  due_amount     NUMERIC(10,2) NOT NULL DEFAULT 0,
  payments       JSONB NOT NULL DEFAULT '[]',
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, month)
);

-- 5. Purchases table
CREATE TABLE IF NOT EXISTS purchases (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category       TEXT NOT NULL,
  description    TEXT DEFAULT '',
  supplier       TEXT DEFAULT '',
  amount         NUMERIC(10,2) NOT NULL DEFAULT 0,
  amount_paid    NUMERIC(10,2) NOT NULL DEFAULT 0,
  due_amount     NUMERIC(10,2) NOT NULL DEFAULT 0,
  date           DATE NOT NULL DEFAULT CURRENT_DATE,
  payments       JSONB NOT NULL DEFAULT '[]',
  notes          TEXT DEFAULT '',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bills_date           ON bills(date);
CREATE INDEX IF NOT EXISTS idx_bills_customer_id    ON bills(customer_id);
CREATE INDEX IF NOT EXISTS idx_bills_customer_name  ON bills(customer_name);
CREATE INDEX IF NOT EXISTS idx_bills_due_amount     ON bills(due_amount);
CREATE INDEX IF NOT EXISTS idx_customers_name       ON customers(name);
CREATE INDEX IF NOT EXISTS idx_salary_employee      ON salary_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_salary_month         ON salary_records(month);
CREATE INDEX IF NOT EXISTS idx_purchases_date       ON purchases(date);
CREATE INDEX IF NOT EXISTS idx_purchases_category   ON purchases(category);

-- 7. Disable Row Level Security (using server-side service key)
ALTER TABLE customers      DISABLE ROW LEVEL SECURITY;
ALTER TABLE bills          DISABLE ROW LEVEL SECURITY;
ALTER TABLE employees      DISABLE ROW LEVEL SECURITY;
ALTER TABLE salary_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE purchases      DISABLE ROW LEVEL SECURITY;

-- 8. Grant access
GRANT ALL ON customers      TO anon, service_role;
GRANT ALL ON bills          TO anon, service_role;
GRANT ALL ON employees      TO anon, service_role;
GRANT ALL ON salary_records TO anon, service_role;
GRANT ALL ON purchases      TO anon, service_role;

-- ============================================
-- VERIFICATION
-- ============================================
-- SELECT * FROM customers;
-- SELECT * FROM bills;
-- SELECT * FROM employees;
-- SELECT * FROM salary_records;
-- SELECT * FROM purchases;

