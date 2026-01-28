# Diagnostic Tool Guide

## Overview
The diagnostic tool helps identify issues with income data visibility, date filtering problems, and database state. Use this when income transactions aren't showing up as expected in the Dashboard or Balance Analysis views.

## Quick Start

### How to Run Diagnostics

1. **Open Dashboard** - Navigate to the Dashboard page
2. **Click "🔍 Diagnose Data"** button in the top right
3. **Open Browser Console** - Press F12 and click "Console" tab
4. **Review Results** - Read the detailed diagnostic report

## What the Diagnostic Checks

### 1. Income Transaction Count
- Total number of income transactions in database
- Grouped by month with transaction details
- Individual transaction breakdown

### 2. Date Range Analysis
- Earliest and latest income transaction dates
- Current Dashboard default date range
- Count of income transactions within default range

### 3. Date Range Mismatch Detection
**Common Issue**: Income exists but is from previous months while Dashboard shows current month only.

**Example:**
```
Income transactions: 5 (all from Dec 2025)
Default date range: Jan 1-28, 2026
Income in range: 0
→ Issue detected!
```

### 4. Database Schema Check
- Verifies `transaction_type` column exists
- Counts transactions with NULL type
- Identifies migration issues

### 5. Query Verification
- Tests actual query used by Dashboard
- Shows what data is returned
- Breaks down by type (income/expense/null)

## Understanding the Report

### Sample Output

```
=== INCOME DIAGNOSTIC REPORT ===
Total income transactions in DB: 5

Income by month:
2025-12: 2 transactions, ₪15,000.00
  - 2025-12-05: Salary ₪12,000.00 (ID: 123)
  - 2025-12-20: Bonus ₪3,000.00 (ID: 124)
2026-01: 3 transactions, ₪18,000.00
  - 2026-01-05: Salary ₪12,000.00 (ID: 125)
  - 2026-01-15: Freelance ₪5,000.00 (ID: 126)
  - 2026-01-25: Refund ₪1,000.00 (ID: 127)

=== DATE RANGE CHECK ===
Earliest income: 2025-12-05
Latest income: 2026-01-25

Default Dashboard date range:
Start: 2026-01-01
End: 2026-01-28

Income transactions in default date range: 3
Income in current month:
  - 2026-01-05: Salary ₪12,000.00
  - 2026-01-15: Freelance ₪5,000.00
  - 2026-01-25: Refund ₪1,000.00

✅ Income found in default date range

=== EXPENSE CHECK (for comparison) ===
Total expenses: 45
Transactions with NULL type: 0

=== END DIAGNOSTIC REPORT ===
```

## Common Issues & Solutions

### Issue 1: "No income in default date range!"

**Symptom:**
```
⚠️ ISSUE FOUND: No income in default date range!
Your income is from earlier months, but Dashboard defaults to current month.
```

**Cause**: Income transactions exist but are outside the current month range.

**Solutions:**

**Option A: Change Date Range** (Quickest)
1. Click date picker in Dashboard
2. Select "Year to Date" or "All Time" preset
3. Or manually select range that includes your income dates

**Option B: Update Default Date Range** (Permanent)
1. Open `src/pages/Dashboard.jsx`
2. Find `getCurrentMonthRange` function (around line 19)
3. Change to year-to-date:
```javascript
const getCurrentMonthRange = () => {
  const now = new Date()
  const year = now.getFullYear()
  return {
    from: new Date(year, 0, 1),  // January 1st
    to: new Date(),              // Today
  }
}
```

### Issue 2: "NO INCOME TRANSACTIONS FOUND"

**Symptom:**
```
⚠️ NO INCOME TRANSACTIONS FOUND
Possible reasons:
1. No income has been added yet
2. Database migration not run
3. All transactions are marked as "expense"
```

**Solutions:**

**Check 1: Add Income**
- Go to Dashboard or Tagging page
- Click "Add Manually"
- Select "💰 Income" as transaction type
- Fill in details and save

**Check 2: Run Migration**
```bash
# Check if migration ran
cd supabase
cat migrations/20260128_add_transaction_type.sql

# If not run, follow instructions in:
# supabase/MIGRATION_INSTRUCTIONS.md
```

**Check 3: Convert Existing Transactions**
- Go to Tagging page
- Filter for income-related merchants (salary, bonus, etc.)
- Select transactions
- Click "💰 Mark as Income" in bulk panel

### Issue 3: "Transactions with NULL transaction_type"

**Symptom:**
```
⚠️ WARNING: Found transactions with NULL transaction_type
Run the database migration to fix this
```

**Cause**: Database migration hasn't been run yet.

**Solution**: Follow migration instructions:
1. Open `supabase/MIGRATION_INSTRUCTIONS.md`
2. Choose Dashboard or CLI method
3. Run the SQL migration script
4. Verify with diagnostic tool

### Issue 4: Query Returns Data but Dashboard Shows 0

**Symptom**: Diagnostic shows income in range, but Dashboard cards show ₪0.00

**Possible Causes:**

**A. React State Issue**
1. Open React DevTools
2. Find Dashboard component
3. Check `expenses` state
4. Verify it contains income transactions

**B. Calculation Logic Error**
1. Check browser console for JavaScript errors
2. Verify `incomeTotal` calculation in Dashboard.jsx
3. Look for filter that excludes income

**C. Component Not Re-rendering**
1. Force refresh with Ctrl+F5 (Cmd+Shift+R on Mac)
2. Clear browser cache
3. Check for stale state

**Debug Steps:**
```javascript
// Add temporary logging in Dashboard.jsx
console.log('All expenses:', expenses)
console.log('Income total:', incomeTotal)
console.log('Income transactions:', expenses.filter(e => e.transaction_type === 'income'))
```

## Advanced Diagnostics

### Manual Database Query

Test directly in Supabase Dashboard:

```sql
-- Get all income for current user
SELECT 
  transaction_date,
  merchant,
  amount,
  transaction_type,
  main_category,
  sub_category
FROM expenses
WHERE user_id = '[YOUR_USER_ID]'
  AND transaction_type = 'income'
ORDER BY transaction_date DESC;

-- Check for NULL types
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN transaction_type IS NULL THEN 1 END) as null_type,
  COUNT(CASE WHEN transaction_type = 'income' THEN 1 END) as income,
  COUNT(CASE WHEN transaction_type = 'expense' THEN 1 END) as expense
FROM expenses
WHERE user_id = '[YOUR_USER_ID]';
```

### Network Tab Check

1. Open DevTools → Network tab
2. Filter: Fetch/XHR
3. Refresh Dashboard
4. Find "expenses" API call
5. Check:
   - Request: Date range parameters
   - Response: Returned data
   - Preview: Income transactions present?

### React Component State

Using React DevTools:
1. Install React Developer Tools extension
2. Open DevTools → Components tab
3. Find `Dashboard` component
4. Inspect state:
   - `expenses` array
   - `dateRange` object
   - `incomeTotal`, `expenseTotal`, `netBalance`

## Diagnostic Functions API

### `diagnoseIncomeData()`

**Purpose**: Analyzes all income transactions in database

**Returns:**
```javascript
{
  totalIncome: 5,
  byMonth: {
    "2026-01": {
      count: 3,
      total: 18000,
      transactions: [...]
    }
  },
  inDefaultRange: 3,
  needsDateRangeAdjustment: false,
  earliestDate: "2025-12-05",
  latestDate: "2026-01-25",
  nullTypeCount: 0
}
```

### `diagnoseExpenseQuery(dateRange)`

**Purpose**: Tests the actual query used by Dashboard with specific date range

**Parameters:**
```javascript
{
  from: Date,  // Start date
  to: Date     // End date
}
```

**Returns:**
```javascript
{
  total: 48,      // Total transactions
  income: 3,      // Income count
  expenses: 45,   // Expense count
  nullType: 0,    // NULL type count
  data: [...]     // Full transaction array
}
```

## Custom Diagnostics

### Add Custom Checks

Edit `src/utils/diagnostics.js`:

```javascript
// Example: Check for specific merchant
export async function diagnoseSpecificMerchant(merchantName) {
  const { data: user } = await supabase.auth.getUser()
  
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('user_id', user.user.id)
    .ilike('merchant', `%${merchantName}%`)
  
  console.log(`Found ${data.length} transactions for ${merchantName}:`)
  data.forEach(t => {
    console.log(`  ${t.transaction_date}: ₪${t.amount} (${t.transaction_type})`)
  })
  
  return data
}
```

### Run from Browser Console

```javascript
// Import and run diagnostics manually
import { diagnoseIncomeData } from './utils/diagnostics'

// Run diagnostic
const report = await diagnoseIncomeData()

// Custom query
const { supabase } = await import('./lib/supabase')
const { data } = await supabase
  .from('expenses')
  .select('*')
  .eq('transaction_type', 'income')

console.log('Income transactions:', data)
```

## Interpretation Guide

### Healthy System
```
✅ Total income: 10+
✅ Income in default range: 5+
✅ NULL types: 0
✅ No date range warnings
```

### Needs Attention
```
⚠️ Total income: 0 (no income added)
⚠️ Income in range: 0 (wrong date range)
⚠️ NULL types: 50+ (migration needed)
```

### Critical Issues
```
❌ Query errors
❌ User not authenticated
❌ Database connection failed
```

## Performance Notes

- Diagnostic queries fetch ALL data (no pagination)
- Safe for personal finance (< 10K transactions)
- Run when troubleshooting, not continuously
- Results logged to console, not stored

## Removing the Diagnostic Button

Once issues are resolved, you can remove the diagnostic button:

1. Open `src/pages/Dashboard.jsx`
2. Remove the import:
   ```javascript
   // Remove this line
   import { diagnoseIncomeData, diagnoseExpenseQuery } from '../utils/diagnostics'
   ```
3. Remove the `runDiagnostics` function (lines ~35-60)
4. Remove the "Diagnose Data" button from the UI (lines ~195-202)
5. Keep `src/utils/diagnostics.js` for future use

## Troubleshooting the Diagnostic Tool

### "Cannot read property 'user' of null"
**Cause**: Not logged in  
**Solution**: Log in first, then run diagnostic

### "Column transaction_type does not exist"
**Cause**: Migration not run  
**Solution**: Run database migration (see MIGRATION_INSTRUCTIONS.md)

### Console shows nothing
**Cause**: Browser console might be filtered  
**Solution**: 
- Clear console filters (show all levels)
- Look for red error messages
- Check Network tab for failed requests

### Diagnostic button not visible
**Cause**: Button might be off-screen on small displays  
**Solution**: Scroll horizontally or zoom out

## Related Documentation

- `INCOME_TRACKING_GUIDE.md` - Overview of income features
- `BALANCE_ANALYSIS_FEATURE.md` - Balance reporting details
- `supabase/MIGRATION_INSTRUCTIONS.md` - Database setup
- `TAGGING_ENHANCEMENTS.md` - Transaction type management

## Support Checklist

When asking for help, provide:
- [ ] Full diagnostic console output (copy/paste)
- [ ] Screenshot of Dashboard showing issue
- [ ] Date range currently selected
- [ ] Number of income transactions expected
- [ ] Database migration status (run/not run)
- [ ] Browser console errors (if any)
- [ ] Network tab screenshot (expenses API call)

## Future Enhancements

Potential diagnostic additions:
- Category assignment validation
- Duplicate transaction detection
- Date format consistency checks
- Amount validation (negative income, etc.)
- Merchant name typo detection
- Auto-fix common issues
- Export diagnostic report to file
- Scheduled health checks
