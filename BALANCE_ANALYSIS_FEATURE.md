# Balance Analysis Feature - Detailed Reports

## Overview
Added comprehensive balance reporting to the Detailed Reports page with a new "Balance Analysis" view mode that provides monthly income/expense tracking, running balance calculations, and visualization.

## New Features

### 1. View Mode Toggle
Switch between two analysis modes:
- **📊 Category Breakdown** (existing): Analyze expenses by category, merchant, or time period
- **💰 Balance Analysis** (new): Track income vs expenses with monthly breakdown

### 2. Monthly Balance Calculation
Automatically groups all transactions by month and calculates:
- Monthly income total
- Monthly expense total
- Monthly net balance (income - expenses)
- Running balance total across all months
- Transaction counts for each type

### 3. Summary Cards (4 cards)

#### Income Card (Green)
- Total income for the selected period
- Green border and theme

#### Expenses Card (Red)
- Total expenses for the selected period
- Red border and theme

#### Net Balance Card (Dynamic)
- **Positive**: Blue theme, shows +₪amount
- **Negative**: Orange theme, shows -₪amount
- Displays current net position

#### Average Monthly Balance Card
- Average balance per month
- Shows how many months were positive vs total
- Example: "8 of 12 months positive"

### 4. Income vs Expenses Line Chart

**Three lines displayed:**
- **Green line**: Income over time
- **Red line**: Expenses over time
- **Blue line**: Net balance (income - expenses)

**Features:**
- Interactive tooltips with formatted amounts
- Angled x-axis labels for readability
- Large dots on data points for clarity
- Legend for all three metrics

### 5. Monthly Balance Breakdown Table

**Columns:**
1. **Month**: Formatted as "Jan 2026", "Feb 2026", etc.
2. **Income**: 
   - Amount in green with + prefix
   - Transaction count below
3. **Expenses**:
   - Amount in red with - prefix
   - Transaction count below
4. **Balance**:
   - Monthly net (income - expenses)
   - Blue for positive, orange for negative
5. **Running Total**:
   - Cumulative balance across all months
   - Darker blue/orange for emphasis
6. **Trend**:
   - 📈 emoji for positive months
   - 📉 emoji for negative months

**Footer Row:**
- Bold TOTAL row with aggregated amounts
- Shows grand totals for income, expenses, and balance

## Data Calculations

### Monthly Grouping
```javascript
// Groups transactions by month key: "2026-01", "2026-02", etc.
expenses.forEach(exp => {
  const monthKey = exp.transaction_date.substring(0, 7)
  // Aggregate by income vs expense type
})
```

### Running Balance Algorithm
```javascript
let runningBalance = 0
sortedMonths.forEach(month => {
  month.balance = month.income - month.expenses
  runningBalance += month.balance
  month.runningBalance = runningBalance
})
```

### Positive Months Calculation
```javascript
const positiveMonths = monthlyBalanceData.filter(m => m.balance >= 0).length
```

## UI/UX Design

### Color Scheme
- **Income**: Green (#10b981)
- **Expenses**: Red (#ef4444)
- **Net Balance**: Blue (#3b82f6)
- **Positive Balance**: Blue theme
- **Negative Balance**: Orange theme

### Typography
- Summary cards: 2xl font size, bold
- Table headers: Uppercase, bold, xs font
- Table data: Right-aligned numbers, left-aligned labels
- Running total: Darker colors for emphasis

### Responsive Design
- 4 cards on desktop, stacked on mobile
- Chart scales to container width
- Table scrolls horizontally on small screens
- X-axis labels angled for readability

## Usage Examples

### Scenario 1: Tracking Monthly Savings
```
Month       Income    Expenses  Balance    Running Total
Jan 2026    ₪15,000   ₪12,000   +₪3,000    +₪3,000
Feb 2026    ₪15,000   ₪13,500   +₪1,500    +₪4,500
Mar 2026    ₪16,000   ₪14,000   +₪2,000    +₪6,500
```
Result: Steady positive growth, ₪6,500 saved over 3 months

### Scenario 2: Identifying Problem Months
```
Month       Income    Expenses  Balance    Running Total
Oct 2025    ₪12,000   ₪11,000   +₪1,000    +₪10,000
Nov 2025    ₪12,000   ₪15,000   -₪3,000    +₪7,000   📉
Dec 2025    ₪14,000   ₪18,000   -₪4,000    +₪3,000   📉
```
Result: November and December overspending identified with red flags

### Scenario 3: Income Variations
```
Month       Income    Expenses  Balance
Jan 2026    ₪20,000   ₪12,000   +₪8,000   (bonus month)
Feb 2026    ₪12,000   ₪12,000   ₪0        (break even)
Mar 2026    ₪12,000   ₪13,000   -₪1,000   (overspent)
```
Result: Chart clearly shows income spike in January

## Integration

### Files Modified
- `src/pages/Detailed.jsx`
  - Added `viewMode` state
  - Added `monthlyBalanceData` calculation
  - Added `balanceSummary` statistics
  - Added view mode toggle UI
  - Added complete balance analysis view

### Dependencies
- Recharts (already installed)
  - `LineChart`, `Line` components
  - `XAxis`, `YAxis`, `CartesianGrid`
  - `Tooltip`, `Legend`, `ResponsiveContainer`

### Data Requirements
- `transaction_type` column must exist in expenses table
- Values: 'income' or 'expense'
- Run migration first (see `supabase/MIGRATION_INSTRUCTIONS.md`)

## Technical Details

### Performance
- Uses React `useMemo` for calculations
- Efficient date grouping with substring extraction
- Single pass for monthly aggregation
- Sorted chronologically for running balance

### State Management
- `viewMode`: Controls which view is displayed
- Shares date range and filters with breakdown view
- Independent calculations for each mode

### Empty States
- Shows "No transaction data" message when empty
- Hides table footer when no data
- Chart handles empty data gracefully

## Future Enhancements

1. **Export to PDF**
   - Generate monthly balance report
   - Include charts and tables
   - Formatted for printing

2. **Year-over-Year Comparison**
   - Compare current year to previous year
   - Show growth/decline percentages
   - Highlight seasonal patterns

3. **Budget Goals**
   - Set monthly income/expense targets
   - Visual indicators for over/under budget
   - Progress bars in table rows

4. **Savings Rate Metric**
   - Calculate % of income saved each month
   - Show trend line
   - Highlight best/worst months

5. **Category Breakdown by Month**
   - Combine balance and category analysis
   - Show which categories varied each month
   - Identify spending pattern changes

## Testing Checklist

- [ ] View mode toggle switches correctly
- [ ] Summary cards show correct totals
- [ ] Line chart displays all three metrics
- [ ] Monthly table shows correct calculations
- [ ] Running balance accumulates properly
- [ ] Positive/negative styling works
- [ ] Trend emojis display correctly
- [ ] Empty state shows when no data
- [ ] Totals row calculates correctly
- [ ] Transaction counts are accurate
- [ ] Date range filter applies correctly
- [ ] Responsive design works on mobile
- [ ] Chart tooltip shows formatted amounts
- [ ] Table scrolls horizontally on small screens

## Common Questions

**Q: Why are my totals showing 0?**
A: Make sure you've run the database migration to add the `transaction_type` column. All existing records should have this field.

**Q: Can I filter by income or expense only?**
A: Currently, the balance view shows both. Use the filters in the breakdown view to filter by transaction type.

**Q: How is running balance calculated?**
A: It's the cumulative sum of monthly balances from the first month to the current month in chronological order.

**Q: What if I have no income transactions?**
A: The view will still work, showing ₪0 income and negative balances equal to your expenses.

**Q: Can I see daily balance?**
A: Currently grouped by month only. Daily granularity can be added in a future update.

## Documentation

Related documentation:
- `INCOME_TRACKING_GUIDE.md` - General income tracking feature
- `DASHBOARD_INCOME_TRACKING.md` - Dashboard income cards
- `supabase/MIGRATION_INSTRUCTIONS.md` - Database setup

## Support

If balance calculations seem incorrect:
1. Verify migration ran successfully
2. Check all transactions have `transaction_type` field
3. Ensure date format is YYYY-MM-DD
4. Check for NULL amounts in database
5. Verify date range includes transaction dates
