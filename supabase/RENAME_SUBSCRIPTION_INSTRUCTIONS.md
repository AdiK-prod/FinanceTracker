# Rename 'Subscription' to 'Monthly' Migration

## Purpose
Update all expenses with category 'Subscription' to 'Monthly' for better naming consistency.

## What This Does
- Updates `main_category` column: Changes 'Subscription' → 'Monthly'
- Updates `sub_category` column: Changes 'Subscription' → 'Monthly'

## Migration File
`supabase/migrations/20260129_rename_subscription_to_monthly.sql`

## How to Run

### Option 1: Supabase Dashboard (Recommended)

1. **Go to your Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Select your FinanceTracker project

2. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New query"

3. **Copy and paste the migration SQL**
   ```sql
   -- Update main_category column
   UPDATE expenses
   SET main_category = 'Monthly'
   WHERE main_category = 'Subscription';

   -- Update sub_category column
   UPDATE expenses
   SET sub_category = 'Monthly'
   WHERE sub_category = 'Subscription';
   ```

4. **Run the query**
   - Click "Run" or press Cmd+Enter (Mac) / Ctrl+Enter (Windows)
   - Check the success message

5. **Verify the update**
   ```sql
   -- Check for any remaining 'Subscription' entries (should return 0)
   SELECT COUNT(*) as remaining_subscriptions 
   FROM expenses 
   WHERE main_category = 'Subscription' OR sub_category = 'Subscription';

   -- Check 'Monthly' count
   SELECT COUNT(*) as monthly_count 
   FROM expenses 
   WHERE main_category = 'Monthly' OR sub_category = 'Monthly';
   ```

### Option 2: Supabase CLI (Alternative)

If you have Supabase CLI installed:

```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Run the migration
supabase db push

# Or apply directly
supabase db execute -f supabase/migrations/20260129_rename_subscription_to_monthly.sql
```

## Expected Results

### Before Migration
```
Expenses with 'Subscription' category: X transactions
Expenses with 'Monthly' category: Y transactions
```

### After Migration
```
Expenses with 'Subscription' category: 0 transactions ✅
Expenses with 'Monthly' category: X + Y transactions ✅
```

## Verification Steps

1. **Run verification query in SQL Editor**
   ```sql
   SELECT COUNT(*) as remaining_subscriptions 
   FROM expenses 
   WHERE main_category = 'Subscription' OR sub_category = 'Subscription';
   ```
   - Expected result: `0`

2. **Check in your app**
   - Refresh your Finance Tracker app
   - Go to Dashboard or Tagging page
   - Filter by 'Monthly' category
   - Should see all former 'Subscription' transactions

3. **Check Detailed Reports**
   - Category breakdown should show 'Monthly' instead of 'Subscription'

## Impact

✅ **Database:** All 'Subscription' entries updated to 'Monthly'  
✅ **Frontend:** No code changes needed (categories are dynamic)  
✅ **Existing data:** All transaction history preserved  
✅ **Backward compatible:** App works before and after migration  

## Rollback (If Needed)

If you need to revert this change:

```sql
-- Rollback: Change 'Monthly' back to 'Subscription'
UPDATE expenses
SET main_category = 'Subscription'
WHERE main_category = 'Monthly';

UPDATE expenses
SET sub_category = 'Subscription'
WHERE sub_category = 'Monthly';
```

⚠️ **Warning:** Only run rollback if you haven't created new 'Monthly' transactions after the migration!

## Safety Notes

- ✅ **Non-destructive:** Only updates values, doesn't delete data
- ✅ **Reversible:** Can rollback if needed (with caution)
- ✅ **Fast:** Usually completes in < 1 second
- ✅ **Safe:** Uses WHERE clause to target specific rows

## Common Issues

### Issue 1: "Permission denied"
**Solution:** Make sure you're logged in to Supabase and have admin access to the project.

### Issue 2: "Table 'expenses' does not exist"
**Solution:** Verify you're connected to the correct Supabase project.

### Issue 3: Migration seems to do nothing
**Cause:** No 'Subscription' entries exist in your database.
**Solution:** Run verification query to check:
```sql
SELECT main_category, sub_category, COUNT(*) 
FROM expenses 
WHERE main_category = 'Subscription' OR sub_category = 'Subscription'
GROUP BY main_category, sub_category;
```

## Timeline

1. **Backup** (optional): Export expenses table (1 minute)
2. **Run migration**: Open SQL Editor and execute (30 seconds)
3. **Verify**: Run verification queries (30 seconds)
4. **Test**: Refresh app and check (1 minute)

**Total time:** ~3 minutes

## After Migration

Once the migration is complete:
- All 'Subscription' categories are now 'Monthly'
- App automatically displays the new name
- No code deployment needed
- No cache clearing needed (database change is immediate)

## Questions?

- **Q: Will this affect my charts/reports?**
  - A: Yes - they'll now show 'Monthly' instead of 'Subscription', but the data and amounts remain the same.

- **Q: Do I need to redeploy my app?**
  - A: No - categories are loaded from the database, no code changes needed.

- **Q: Will this break anything?**
  - A: No - it's a simple rename, all functionality remains the same.

- **Q: Can I preview what will change?**
  - A: Yes, run this first:
    ```sql
    SELECT id, merchant, amount, main_category, sub_category
    FROM expenses 
    WHERE main_category = 'Subscription' OR sub_category = 'Subscription'
    LIMIT 20;
    ```

## Summary

**What:** Rename 'Subscription' → 'Monthly'  
**Where:** `expenses` table, `main_category` and `sub_category` columns  
**How:** SQL UPDATE statements via Supabase Dashboard  
**When:** Run anytime (takes ~1 minute)  
**Risk:** Very low (simple rename, reversible)  

Ready to proceed? Follow Option 1 above! ✅
