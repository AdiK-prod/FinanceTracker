# Database Migration: Add transaction_type Column

## Purpose
Add `transaction_type` column to the `expenses` table to support income tracking alongside expenses.

## What This Changes
- Adds `transaction_type` column (values: 'expense' or 'income')
- Default value is 'expense' for all existing and new records
- Creates performance indexes for queries
- Maintains `is_exceptional` flag for both income and expenses

## How to Run Migration

### Option 1: Supabase Dashboard (Recommended)

1. **Log in to Supabase**
   - Go to https://supabase.com
   - Open your FinanceTracker project

2. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New query"

3. **Copy and Execute SQL**
   - Open file: `supabase/migrations/20260128_add_transaction_type.sql`
   - Copy the entire SQL content
   - Paste it into the SQL Editor
   - Click "Run" or press Cmd/Ctrl + Enter

4. **Verify Success**
   - Check for "Success. No rows returned" message
   - Run verification queries (see below)

### Option 2: Supabase CLI (Advanced)

```bash
# Make sure Supabase CLI is installed
npm install -g supabase

# Link to your project (if not already linked)
supabase link --project-ref your-project-ref

# Run the migration
supabase db push
```

## Verification Steps

### 1. Check Column Exists

Run this in SQL Editor:
```sql
SELECT column_name, data_type, column_default, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'expenses' 
  AND column_name = 'transaction_type';
```

**Expected Result:**
- column_name: transaction_type
- data_type: text
- column_default: 'expense'::text
- is_nullable: NO

### 2. Check Existing Data

```sql
SELECT transaction_type, COUNT(*) as count
FROM expenses 
GROUP BY transaction_type;
```

**Expected Result:**
- All existing records should show `transaction_type = 'expense'`

### 3. Check Indexes Created

```sql
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'expenses' 
  AND indexname LIKE '%transaction_type%';
```

**Expected Result:**
- idx_expenses_transaction_type
- idx_expenses_type_date
- idx_expenses_type_exceptional

### 4. Test Insert Income Transaction

```sql
-- Replace 'your-user-id' with an actual user_id from your users table
INSERT INTO expenses (
  user_id, 
  transaction_date, 
  merchant, 
  amount, 
  transaction_type,
  is_exceptional
) VALUES (
  'your-user-id',
  '2026-01-28',
  'Monthly Salary',
  12000.00,
  'income',
  false
);
```

### 5. Test Query Both Types

```sql
-- Get balance: Income - Expenses
SELECT 
  transaction_type,
  SUM(amount) as total
FROM expenses
WHERE user_id = 'your-user-id'
GROUP BY transaction_type;
```

## Rollback (If Needed)

If you need to undo this migration:

```sql
-- Remove indexes
DROP INDEX IF EXISTS idx_expenses_transaction_type;
DROP INDEX IF EXISTS idx_expenses_type_date;
DROP INDEX IF EXISTS idx_expenses_type_exceptional;

-- Remove column
ALTER TABLE expenses DROP COLUMN IF EXISTS transaction_type;
```

## Next Steps After Migration

1. Update frontend components to:
   - Show transaction type selector in AddTransactionModal
   - Display income vs expenses differently in tables
   - Calculate net balance (income - expenses)
   - Filter by transaction type

2. Update queries in:
   - Dashboard.jsx (show income, expenses, and net balance)
   - Tagging.jsx (add transaction type filter)
   - Detailed.jsx (separate income and expense reports)

## Notes

- ✅ All existing records automatically get `transaction_type = 'expense'`
- ✅ `is_exceptional` flag works for both income and expenses
- ✅ RLS policies remain unchanged (they filter by user_id)
- ✅ Performance indexes added for common queries
- ✅ Column has NOT NULL constraint with default value
