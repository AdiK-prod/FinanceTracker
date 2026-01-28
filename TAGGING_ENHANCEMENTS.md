# Tagging Page Enhancements - Transaction Type & Merchant Editing

## Overview
Enhanced the Tagging page with transaction type management, inline merchant editing, bulk type conversion, and comprehensive filters for better transaction management.

## New Features

### 1. Transaction Type Column with Toggle Button

**Location**: New column in expense table between "Amount" and "Main Category"

**Functionality:**
- Click to toggle between Income (💰) and Expense (💸)
- Income: Green pill button with green background
- Expense: Red pill button with red background
- Hover shows "Change to Income/Expense" tooltip

**Auto-Clear Categories:**
- When changing Expense → Income: Categories automatically cleared (set to null)
- When changing Income → Expense: Categories become editable again
- Prevents invalid category assignments for income transactions

### 2. Inline Merchant Name Editing

**How to Edit:**
1. Hover over merchant name → Edit icon (✏️) appears
2. Click edit icon → Inline editor opens
3. Edit the text
4. Press Enter or click ✓ to save
5. Press Escape or click ✗ to cancel

**Features:**
- Real-time editing without page refresh
- Validation: Prevents empty merchant names
- Visual feedback: Green border while editing
- Keyboard shortcuts: Enter (save), Escape (cancel)
- Hover-to-reveal edit button (non-intrusive)

### 3. Bulk Transaction Type Conversion

**Location**: Bulk actions panel (appears when rows are selected)

**Two new buttons:**
- **💸 Mark as Expense** - Converts selected transactions to expenses
- **💰 Mark as Income** - Converts selected transactions to income

**Safety Features:**
- Confirmation dialog before conversion
- Shows count of transactions being converted
- Warning when converting to income (categories will be cleared)
- Clears selection after successful conversion

**Example Confirmation:**
```
Convert 5 transactions to Income?

Note: Category assignments will be removed.
```

### 4. Transaction Type Filters

**Location**: Filters panel (click "Filters" button)

**Two new filter checkboxes:**
- **💸 Expenses only** - Shows only expense transactions (red checkbox)
- **💰 Income only** - Shows only income transactions (green checkbox)

**Behavior:**
- Mutually exclusive: Selecting one automatically unchecks the other
- Can be combined with other filters (merchant search, categories, dates, etc.)
- Shows in active filter count badge
- Cleared with "Clear all filters" button

### 5. Visual Indicators for Income

**Row Background:**
- Income rows: Very light green tint (`bg-green-50/30`)
- Expense rows: Standard alternating colors
- Uncategorized expenses: Yellow highlight (existing)

**Amount Display:**
- Income: Green text with + prefix (e.g., "+₪1,500.00")
- Expense: Standard black text (e.g., "₪1,200.00")
- Right-aligned for better readability

**Category Fields:**
- Income transactions: Shows "N/A" in italics (categories not applicable)
- Expense transactions: Standard dropdown selects

## Technical Implementation

### Database Changes
**Required**: `transaction_type` column must exist in `expenses` table
- See `supabase/MIGRATION_INSTRUCTIONS.md` for setup
- Values: 'income' or 'expense'
- Default: 'expense'

### Files Modified

#### 1. `/src/pages/Tagging.jsx`
**Changes:**
- Added `showOnlyExpenses` and `showOnlyIncome` to filters state
- Updated `fetchExpenses` to select `transaction_type` column
- Updated `filteredExpenses` logic to include type filters
- Updated `getActiveFilterCount` to count type filters
- Updated `clearFilters` to reset type filters
- Updated `handleBulkUpdate` to handle `transaction_type` field with category clearing
- Added type filter checkboxes to filters UI

#### 2. `/src/components/ExpenseTable.jsx`
**Changes:**
- Added `Edit2`, `Check`, `X` icons from lucide-react
- Added `editingMerchant` state for inline editing
- Added `handleTypeChange` function for type toggle
- Added `handleMerchantUpdate` function for merchant editing
- Added `handleBulkTypeConversion` function for bulk type changes
- Added Type column header
- Updated table body to show:
  - Inline merchant editor
  - Type toggle button
  - Income-specific amount formatting (+/green)
  - N/A for categories on income rows
  - Green tint for income rows
- Added bulk type conversion buttons to bulk actions panel
- Updated colspan values (9→10) for empty/loading states

## User Workflows

### Workflow 1: Fix Misclassified Transaction
**Scenario**: Salary was marked as expense instead of income

1. Find the transaction (use filters if needed)
2. Click the "💸 Expense" button in Type column
3. Button changes to "💰 Income"
4. Categories automatically cleared
5. Amount changes to green with + prefix
6. Row gets green tint

### Workflow 2: Correct Merchant Name
**Scenario**: OCR misread "Starbucks" as "5tarbuck5"

1. Hover over merchant name "5tarbuck5"
2. Click edit icon (✏️) that appears
3. Change to "Starbucks"
4. Press Enter or click ✓
5. Name updates immediately

### Workflow 3: Bulk Convert Refunds to Income
**Scenario**: 10 refund transactions need to be marked as income

1. Check "💸 Expenses only" filter
2. Search for "refund" in merchant search
3. Select all refund transactions (checkbox)
4. Click "💰 Mark as Income" in bulk panel
5. Confirm the conversion
6. All 10 transactions convert to income
7. Categories cleared automatically

### Workflow 4: Review Income Transactions
**Scenario**: Want to see all income transactions

1. Click "Filters" button
2. Check "💰 Income only"
3. Table shows only income transactions
4. All have green row tints
5. All amounts show green with +
6. All categories show "N/A"

## Validation & Safety

### Transaction Type Conversion
✅ Confirms before bulk conversion  
✅ Shows clear message about category clearing  
✅ Prevents accidental changes with confirmation  
✅ Clears selection after conversion  

### Merchant Editing
✅ Prevents empty merchant names  
✅ Trims whitespace automatically  
✅ Shows alert if invalid  
✅ Cancels on Escape key  
✅ Saves on Enter key  

### Category Management
✅ Auto-clears categories when switching to income  
✅ Shows "N/A" for income categories (not editable)  
✅ Re-enables categories when switching back to expense  
✅ Prevents invalid category assignments  

## UI/UX Design

### Color Scheme
- **Income**: Green (#10b981, #dcfce7 for backgrounds)
- **Expense**: Red (#ef4444, #fee2e2 for backgrounds)
- **Type Toggle**: Pill-shaped buttons with emoji icons
- **Edit Icons**: Subtle gray, teal on hover

### Spacing & Layout
- Type column: Centered, compact
- Merchant editor: Full-width with inline buttons
- Bulk buttons: Grouped with visual separators (dividers)
- Filters: Wrapped, responsive grid

### Accessibility
- Clear hover states on all interactive elements
- Tooltips for button functions
- Keyboard shortcuts for merchant editing
- High contrast for income/expense indicators
- Confirmation dialogs for destructive actions

## Testing Checklist

### Transaction Type Toggle
- [ ] Click Expense → Changes to Income
- [ ] Click Income → Changes to Expense
- [ ] Categories cleared when changing to income
- [ ] Categories editable when changing to expense
- [ ] Type updates in database immediately
- [ ] Row background changes to green for income

### Merchant Editing
- [ ] Hover shows edit icon
- [ ] Click edit icon opens editor
- [ ] Can type and edit text
- [ ] Enter key saves changes
- [ ] Escape key cancels editing
- [ ] ✓ button saves changes
- [ ] ✗ button cancels editing
- [ ] Empty name shows alert and doesn't save
- [ ] Updated name persists after page refresh

### Bulk Type Conversion
- [ ] Select multiple transactions
- [ ] Click "Mark as Expense" button
- [ ] Confirmation dialog appears
- [ ] Confirm → All transactions convert
- [ ] Cancel → No changes made
- [ ] Click "Mark as Income" button
- [ ] Warning about categories in confirmation
- [ ] Categories cleared for all converted transactions
- [ ] Selection cleared after conversion

### Filters
- [ ] Check "Expenses only" → Shows only expenses
- [ ] Check "Income only" → Shows only income
- [ ] Checking one unchecks the other
- [ ] Combines with merchant search
- [ ] Combines with category filters
- [ ] Combines with date filters
- [ ] Shows in filter count badge
- [ ] Cleared with "Clear all filters"

### Visual Indicators
- [ ] Income rows have green tint
- [ ] Income amounts are green
- [ ] Income amounts have + prefix
- [ ] Expense amounts are black
- [ ] Expense amounts have no prefix
- [ ] Income categories show "N/A"
- [ ] Expense categories show dropdowns
- [ ] Type buttons have correct colors

### Edge Cases
- [ ] Empty merchant name rejected
- [ ] Whitespace-only merchant name rejected
- [ ] Very long merchant names handled
- [ ] Special characters in merchant names work
- [ ] Rapid clicking type toggle works correctly
- [ ] Editing merchant while changing type works
- [ ] Bulk convert with mixed types works
- [ ] Filter with no results shows message

## Performance Considerations

### Optimizations
- Local state updates before database calls (optimistic UI)
- Debounced merchant name updates
- Batch updates for bulk conversions
- Minimal re-renders with useState

### Database Queries
- Single query for bulk type conversion
- Transaction type filter applied client-side (already loaded data)
- No additional queries for merchant editing

## Common Issues & Solutions

**Issue**: Categories not clearing when changing to income  
**Solution**: Check that `handleBulkUpdate` properly handles `transaction_type` field with nested updates object

**Issue**: Edit icon always visible, not just on hover  
**Solution**: Verify `opacity-0 group-hover:opacity-100` classes on edit button

**Issue**: Type toggle not working  
**Solution**: Ensure `transaction_type` column exists in database and migration was run

**Issue**: Bulk conversion confirmation not showing  
**Solution**: Check browser popup blocker, verify `window.confirm` is not blocked

**Issue**: Green tint not showing for income rows  
**Solution**: Verify `bg-green-50/30` class and that transaction has `transaction_type: 'income'`

## Related Documentation
- `INCOME_TRACKING_GUIDE.md` - General income tracking feature
- `supabase/MIGRATION_INSTRUCTIONS.md` - Database setup for transaction_type
- `BALANCE_ANALYSIS_FEATURE.md` - Balance analysis using transaction types

## Future Enhancements

### Potential Additions
1. **Income Source Field**
   - Add dropdown for income sources (Salary, Bonus, Refund, etc.)
   - Replace "N/A" in category column with income source selector
   - Store in separate `income_source` column

2. **Smart Type Detection**
   - Auto-detect income keywords (refund, salary, payment received)
   - Suggest type change with one-click acceptance
   - Learn from user corrections

3. **Batch Operations History**
   - Show "Undo" button after bulk operations
   - Keep 30-second window to revert changes
   - Log bulk operations for audit trail

4. **Keyboard Shortcuts**
   - I key: Toggle Income/Expense
   - E key: Edit merchant name
   - Ctrl+S: Save merchant edit
   - Esc: Cancel any edit

5. **Quick Actions Menu**
   - Right-click context menu on rows
   - Quick access to: Edit, Delete, Change Type, Mark Exceptional
   - Keyboard accessible (Shift+F10)

6. **Type-Based Statistics**
   - Show count of income vs expense in results line
   - "Showing 45 expenses, 5 income (50 total)"
   - Quick summary above table

## Support

### Debugging
Enable console logging to debug issues:
```javascript
console.log('Transaction type:', expense.transaction_type)
console.log('Editing merchant:', editingMerchant)
console.log('Filters:', filters)
```

### Common Questions

**Q: Can I change multiple transactions to income at once?**  
A: Yes, select them and click "💰 Mark as Income" in the bulk actions panel.

**Q: Will changing to income delete my category assignments?**  
A: The categories are cleared (set to null) but not deleted from your category list. You can reassign them if you change back to expense.

**Q: Can I edit multiple merchant names at once?**  
A: No, merchant names must be edited one at a time. Use bulk operations for type and category changes.

**Q: How do I find all uncategorized expenses?**  
A: Check "Uncategorized only" filter and "💸 Expenses only" together.

**Q: Can income transactions have categories?**  
A: No, categories are for expenses only. Income transactions show "N/A" instead.
