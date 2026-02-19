-- Migration: Rename 'Subscription' to 'Monthly' in expenses table
-- Created: 2026-01-29
-- Purpose: Update category naming from 'Subscription' to 'Monthly'

-- Update main_category column
UPDATE expenses
SET main_category = 'Monthly'
WHERE main_category = 'Subscription';

-- Update sub_category column
UPDATE expenses
SET sub_category = 'Monthly'
WHERE sub_category = 'Subscription';

-- Verification queries (optional - run these after migration to verify)
-- SELECT COUNT(*) as remaining_subscriptions 
-- FROM expenses 
-- WHERE main_category = 'Subscription' OR sub_category = 'Subscription';
-- Should return 0

-- SELECT COUNT(*) as monthly_count 
-- FROM expenses 
-- WHERE main_category = 'Monthly' OR sub_category = 'Monthly';
-- Should return the updated count
