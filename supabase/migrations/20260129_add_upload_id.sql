-- Migration: Add upload_id column to expenses table
-- Date: 2026-01-29
-- Purpose: Tag each uploaded transaction with the source file name so batches
--          can be recognized, filtered, and reverted (e.g. delete all from one upload).

-- Step 1: Add upload_id column (nullable: manual entries have no upload)
ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS upload_id TEXT;

-- Step 2: Add index for filtering and bulk operations by upload_id
CREATE INDEX IF NOT EXISTS idx_expenses_upload_id
ON expenses(user_id, upload_id)
WHERE upload_id IS NOT NULL;

-- Optional: Add comment for documentation
COMMENT ON COLUMN expenses.upload_id IS 'Source file name for uploaded transactions; NULL for manual entries. Used to filter/delete by upload batch.';
