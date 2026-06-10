-- Migration: query indexes (applied 2026-06-10)
-- Note: bill_number uniqueness already exists via the original schema's
-- bills_bill_number_key constraint — no extra index needed.

-- Indexes for the most common filters (cheap now, prevents slowdown as data grows)
CREATE INDEX IF NOT EXISTS idx_bills_date        ON bills (date);
CREATE INDEX IF NOT EXISTS idx_bills_customer_id ON bills (customer_id);
CREATE INDEX IF NOT EXISTS idx_bills_due         ON bills (due_amount) WHERE due_amount > 0;
CREATE INDEX IF NOT EXISTS idx_purchases_date    ON purchases (date);
