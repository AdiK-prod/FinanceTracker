-- Migration: Add transaction_type column for income tracking
-- Date: 2026-01-28
-- Description: Adds transaction_type column to expenses table to support both income and expense tracking
--              Keeps is_exceptional flag for both transaction types

-- Step 1: Add transaction_type column with default value
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS transaction_type TEXT DEFAULT 'expense';

-- Step 2: Add check constraint to ensure valid values
ALTER TABLE expenses 
ADD CONSTRAINT check_transaction_type 
CHECK (transaction_type IN ('expense', 'income'));

-- Step 3: Update existing records to have 'expense' as transaction_type
UPDATE expenses 
SET transaction_type = 'expense' 
WHERE transaction_type IS NULL;

-- Step 4: Make the column NOT NULL now that all existing records have a value
ALTER TABLE expenses 
ALTER COLUMN transaction_type SET NOT NULL;

-- Step 5: Create index for performance on user_id + transaction_type queries
CREATE INDEX IF NOT EXISTS idx_expenses_transaction_type 
ON expenses(user_id, transaction_type);

-- Step 6: Create composite index for balance and date range queries
CREATE INDEX IF NOT EXISTS idx_expenses_type_date 
ON expenses(user_id, transaction_type, transaction_date DESC);

-- Step 7: Create index for exceptional transactions by type
CREATE INDEX IF NOT EXISTS idx_expenses_type_exceptional 
ON expenses(user_id, transaction_type, is_exceptional);

-- Verification queries (run these after migration):
-- 
-- 1. Check column was added:
-- SELECT column_name, data_type, column_default, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'expenses' AND column_name = 'transaction_type';
--
-- 2. Check all existing records have 'expense':
-- SELECT transaction_type, COUNT(*) 
-- FROM expenses 
-- GROUP BY transaction_type;
--
-- 3. Check indexes were created:
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'expenses' 
-- AND indexname LIKE 'idx_expenses_%type%';
