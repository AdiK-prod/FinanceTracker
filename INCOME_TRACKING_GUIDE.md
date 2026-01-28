# Income Tracking Feature Guide

## Overview
The Finance Tracker now supports both income and expense tracking with a comprehensive manual transaction entry modal.

## Features Added

### 1. Database Migration
- Added `transaction_type` column to expenses table
- Values: 'expense' (default) or 'income'
- Maintains `is_exceptional` flag for both types
- Added performance indexes

### 2. Enhanced AddTransactionModal Component

#### Transaction Type Selector
- Radio buttons to choose between Expense (💸) and Income (💰)
- Visual differentiation:
  - Expenses: Gray borders
  - Income: Green borders and background

#### Income-Specific Fields
- **Income Source Dropdown**:
  - 💼 Salary
  - 📝 Other (with text input for custom source)

#### Expense-Specific Fields
- Merchant name (required)
- Main category (required)
- Sub category (optional)

#### Shared Fields
- Date (required)
- Amount (required)
- Notes (optional)
- Exceptional checkbox

#### Validation
- Date required for all transactions
- For expenses: Merchant and category required
- For income: Source required (Salary or Other with description)
- Amount must be positive
- Duplicate detection (same date, merchant, amount)
- Clear error messages with bullet points

#### Batch Mode
- Add multiple transactions before saving
- Each transaction can be income or expense
- Delete individual transactions (minimum 1)
- Visual counter shows total to save

### 3. Success Toast Notifications

Shows after successful save:
- Total transactions added
- Breakdown: "X expenses • Y income"
- Auto-dismisses after 5 seconds
- Manual close button
- Smooth slide-in animation

### 4. Data Refresh

After adding transactions:
- Auto-refreshes expense list
- Auto-refreshes categories
- Includes new `transaction_type` field in queries

## Usage

### Adding an Expense
1. Click "Add Manually" button
2. Keep "💸 Expense" selected (default)
3. Fill in:
   - Date
   - Merchant name
   - Amount
   - Category
   - Notes (optional)
4. Check "exceptional" if one-time expense
5. Click "Save"

### Adding Income
1. Click "Add Manually" button
2. Select "💰 Income"
3. Fill in:
   - Date
   - Income source (Salary or Other)
   - If Other: Specify source
   - Amount
   - Notes (optional)
4. Check "exceptional" if one-time income (bonus, gift, etc.)
5. Click "Save"

### Batch Entry
1. Click "Add Manually"
2. Fill in first transaction
3. Click "Add Another Transaction"
4. Fill in additional transactions (can mix income and expenses)
5. Review all transactions
6. Click "Save X Transactions"

## Database Schema

```sql
-- expenses table now includes:
transaction_type TEXT NOT NULL DEFAULT 'expense'
  CHECK (transaction_type IN ('expense', 'income'))

-- Indexes:
idx_expenses_transaction_type (user_id, transaction_type)
idx_expenses_type_date (user_id, transaction_type, transaction_date DESC)
idx_expenses_type_exceptional (user_id, transaction_type, is_exceptional)
```

## Technical Details

### Component Structure

```
AddTransactionModal
├── Transaction Type Selector (Radio buttons)
├── TransactionForm (per transaction)
│   ├── Date field
│   ├── Merchant/Income Source (conditional)
│   ├── Amount field
│   ├── Categories (expense only)
│   ├── Notes field
│   └── Exceptional checkbox
├── Add Another Button
└── Save Button (with loading state)
```

### Data Flow

1. User fills transaction form
2. Validation runs on save
3. Data transformed based on type:
   - Expenses: merchant + categories
   - Income: source → merchant, no categories
4. Batch insert to database
5. Success callback with counts
6. Toast notification appears
7. Data refreshes automatically

### Validation Rules

**Expenses:**
- Date ✓
- Merchant ✓
- Category ✓
- Amount > 0 ✓

**Income:**
- Date ✓
- Source (if Other: description) ✓
- Amount > 0 ✓

**Both:**
- Duplicate detection (warning)
- Max amount: 999,999.99
- Min amount: 0.01

## Files Modified

1. `src/components/AddTransactionModal.jsx` - Complete rewrite with income support
2. `src/pages/Dashboard.jsx` - Added success toast
3. `src/pages/Tagging.jsx` - Added success toast
4. `src/index.css` - Added slide-in animation
5. `supabase/migrations/20260128_add_transaction_type.sql` - Database migration

## Next Steps

To fully utilize income tracking:

1. **Dashboard Updates**
   - Show net balance (income - expenses)
   - Separate income and expense totals
   - Income vs expense ratio chart

2. **Tagging Page Updates**
   - Filter by transaction type
   - Different colors for income/expense rows
   - Separate income categories (optional)

3. **Reports Page Updates**
   - Income statements
   - Cash flow analysis
   - Monthly income trends

4. **Detailed View Updates**
   - Income breakdown by source
   - Expense vs income comparison
   - Balance over time chart

## Migration Required

**IMPORTANT:** Before using income tracking, run the database migration:

1. Go to Supabase Dashboard → SQL Editor
2. Open `supabase/migrations/20260128_add_transaction_type.sql`
3. Copy and run the SQL
4. Verify migration success (see MIGRATION_INSTRUCTIONS.md)

## Testing

Test scenarios:
- ✓ Add single expense
- ✓ Add single income
- ✓ Add batch with mixed types
- ✓ Validation errors display correctly
- ✓ Success toast shows correct counts
- ✓ Data refreshes after save
- ✓ Duplicate detection works
- ✓ Exceptional flag works for both types

## Support

For issues or questions:
1. Check `supabase/MIGRATION_INSTRUCTIONS.md`
2. Verify database migration ran successfully
3. Check browser console for errors
4. Verify Supabase connection in `.env` files
