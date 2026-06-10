-- Migration: customer phone + stock tracking
-- Run this once in Supabase SQL Editor (paste entire file, click Run).

-- 1. Phone number on customers (used for call / WhatsApp reminders on the Dues page)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone text NOT NULL DEFAULT '';

-- 2. Stock entries: jars produced (or corrections) per oil type.
--    Current stock = sum of entries - jars sold on bills dated on/after your
--    first stock entry for that oil type.
CREATE TABLE IF NOT EXISTS stock_entries (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oil_type_id text NOT NULL,
  oil_name    text NOT NULL,
  quantity    numeric NOT NULL,          -- jars added (can be negative for corrections)
  entry_type  text NOT NULL DEFAULT 'production' CHECK (entry_type IN ('production', 'adjustment')),
  date        date NOT NULL DEFAULT CURRENT_DATE,
  notes       text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_entries_oil_type ON stock_entries (oil_type_id, date);

ALTER TABLE stock_entries ENABLE ROW LEVEL SECURITY;
