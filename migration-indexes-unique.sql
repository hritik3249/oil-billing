-- Migration: bill number uniqueness + query indexes
-- Run once in Supabase SQL Editor.

-- Two devices billing at the same moment can no longer create the same number;
-- the New Bill form already refetches the next number on a duplicate error.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_bills_bill_number ON bills (bill_number);

-- Indexes for the most common filters (cheap now, prevents slowdown as data grows)
CREATE INDEX IF NOT EXISTS idx_bills_date        ON bills (date);
CREATE INDEX IF NOT EXISTS idx_bills_customer_id ON bills (customer_id);
CREATE INDEX IF NOT EXISTS idx_bills_due         ON bills (due_amount) WHERE due_amount > 0;
CREATE INDEX IF NOT EXISTS idx_purchases_date    ON purchases (date);
