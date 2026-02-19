# Upload ID Feature – Migration Instructions

## Purpose

Each transaction from a CSV/Excel upload is tagged with the **file name** (`upload_id`). You can:

- **Filter** by upload batch (e.g. show only "bank_export_jan.csv")
- **Delete** an entire upload batch in one action
- **Recognize** which rows came from which file in the Tagging table

Manual entries (Add Transaction) have `upload_id = NULL`.

## Migration: Add `upload_id` Column

**File:** `supabase/migrations/20260129_add_upload_id.sql`

### Run in Supabase SQL Editor

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project → **SQL Editor**.
2. New query, paste and run:

```sql
-- Add upload_id column (nullable: manual entries have no upload)
ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS upload_id TEXT;

-- Index for filtering and bulk delete by upload_id
CREATE INDEX IF NOT EXISTS idx_expenses_upload_id
ON expenses(user_id, upload_id)
WHERE upload_id IS NOT NULL;

COMMENT ON COLUMN expenses.upload_id IS 'Source file name for uploaded transactions; NULL for manual entries.';
```

3. Run the query. No data backfill is needed (existing rows stay `upload_id = NULL`).

## After Migration

- **New uploads:** Every inserted row gets `upload_id = <file name>` (e.g. `bank_export.csv`).
- **Tagging page:**
  - **Upload** column shows the file name or "—" for manual entries.
  - **Filter:** "Upload batch" dropdown lists distinct file names; choose one to see only that batch.
  - **Delete this upload:** When an upload is selected in the filter, "Delete this upload" removes all transactions from that file (with confirmation).
- **Manual entries:** Add Transaction flow does not set `upload_id`, so they remain NULL and still show as "—".

## Summary

| Action              | Effect |
|---------------------|--------|
| Run migration       | Add `upload_id` column and index. |
| Upload CSV/Excel    | All inserted rows get `upload_id = filename`. |
| Filter by upload    | Use "Upload batch" → choose file name. |
| Revert an upload    | Filter by that file → "Delete this upload". |
