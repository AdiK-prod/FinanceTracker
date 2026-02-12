-- Migration: Add amortization columns to expenses table
-- Date: 2026-01-29
-- Purpose: Support spreading large upfront payments across multiple months for accurate monthly reporting.

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS is_amortized BOOLEAN DEFAULT FALSE;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS amortization_months INTEGER;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS amortization_adjusted_months INTEGER;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS amortization_start_date DATE;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS amortization_monthly_amount DECIMAL(10,2);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS amortization_status TEXT DEFAULT NULL
  CHECK (amortization_status IS NULL OR amortization_status IN ('active', 'adjusted', 'cancelled'));
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS amortization_adjusted_at TIMESTAMPTZ;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS excluded_from_totals BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_expenses_amortized ON expenses(is_amortized, amortization_start_date)
WHERE is_amortized = TRUE;

COMMENT ON COLUMN expenses.is_amortized IS 'When true, amount is spread across months; use amortization_* fields and exclude from direct totals.';
COMMENT ON COLUMN expenses.excluded_from_totals IS 'When true, do not include this row in aggregate totals (amortized parent; use virtual allocations instead).';
