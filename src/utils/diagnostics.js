import { supabase } from '../lib/supabase'
import { fetchAllExpenses } from './fetchAllRows'

export async function diagnoseIncomeData() {
  const { data: user } = await supabase.auth.getUser()
  
  if (!user?.user?.id) {
    console.error('No user logged in')
    return null
  }
  
  // Get ALL income transactions (no filters) using pagination
  let allIncome = []
  try {
    let from = 0
    const pageSize = 1000
    let hasMore = true
    
    while (hasMore) {
      const to = from + pageSize - 1
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.user.id)
        .eq('transaction_type', 'income')
        .order('transaction_date', { ascending: true })
        .range(from, to)
      
      if (error) {
        console.error('Error fetching income:', error)
        return null
      }
      
      if (data && data.length > 0) {
        allIncome = [...allIncome, ...data]
        if (data.length < pageSize) {
          hasMore = false
        } else {
          from += pageSize
        }
      } else {
        hasMore = false
      }
    }
  } catch (error) {
    console.error('Error fetching income:', error)
    return null
  }
  
  console.log('=== INCOME DIAGNOSTIC REPORT ===')
  console.log(`Total income transactions in DB: ${allIncome.length}`)
  console.log('')
  
  if (allIncome.length === 0) {
    console.log('⚠️ NO INCOME TRANSACTIONS FOUND')
    console.log('Possible reasons:')
    console.log('1. No income has been added yet')
    console.log('2. Database migration not run (transaction_type column missing)')
    console.log('3. All transactions are marked as "expense"')
    console.log('')
    return {
      totalIncome: 0,
      byMonth: {},
      inDefaultRange: 0,
      needsDateRangeAdjustment: false,
      noIncomeFound: true
    }
  }
  
  // Group by month
  const byMonth = {}
  allIncome.forEach(income => {
    const month = income.transaction_date.substring(0, 7) // "2025-01"
    if (!byMonth[month]) {
      byMonth[month] = {
        count: 0,
        total: 0,
        transactions: []
      }
    }
    byMonth[month].count++
    byMonth[month].total += income.amount
    byMonth[month].transactions.push({
      date: income.transaction_date,
      merchant: income.merchant,
      amount: income.amount,
      id: income.id
    })
  })
  
  // Sort by month
  const sortedMonths = Object.keys(byMonth).sort()
  
  console.log('Income by month:')
  sortedMonths.forEach(month => {
    const data = byMonth[month]
    console.log(`${month}: ${data.count} transactions, ₪${data.total.toFixed(2)}`)
    data.transactions.forEach(t => {
      console.log(`  - ${t.date}: ${t.merchant} ₪${t.amount.toFixed(2)} (ID: ${t.id})`)
    })
  })
  
  console.log('')
  console.log('=== DATE RANGE CHECK ===')
  console.log(`Earliest income: ${allIncome[0]?.transaction_date}`)
  console.log(`Latest income: ${allIncome[allIncome.length - 1]?.transaction_date}`)
  console.log('')
  
  // Check current date range in Dashboard
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()
  
  const defaultStart = new Date(currentYear, currentMonth, 1)
  const defaultEnd = new Date()
  
  console.log('Default Dashboard date range:')
  console.log(`Start: ${defaultStart.toISOString().split('T')[0]}`)
  console.log(`End: ${defaultEnd.toISOString().split('T')[0]}`)
  console.log('')
  
  // Check if income falls within default range
  const incomeInRange = allIncome.filter(income => {
    const date = income.transaction_date
    const start = defaultStart.toISOString().split('T')[0]
    const end = defaultEnd.toISOString().split('T')[0]
    return date >= start && date <= end
  })
  
  console.log(`Income transactions in default date range: ${incomeInRange.length}`)
  
  if (incomeInRange.length > 0) {
    console.log('Income in current month:')
    incomeInRange.forEach(income => {
      console.log(`  - ${income.transaction_date}: ${income.merchant} ₪${income.amount.toFixed(2)}`)
    })
  }
  
  console.log('')
  
  if (incomeInRange.length === 0 && allIncome.length > 0) {
    console.log('⚠️ ISSUE FOUND: No income in default date range!')
    console.log('Your income is from earlier months, but Dashboard defaults to current month.')
    console.log('')
    console.log('SOLUTIONS:')
    console.log('1. Change Dashboard default date range to "Year to Date" or "All Time"')
    console.log('2. Use date picker to select the correct date range')
    console.log('3. Update Dashboard.jsx default date range initialization')
    console.log('')
    console.log('Suggested date range to see your income:')
    console.log(`  From: ${allIncome[0].transaction_date}`)
    console.log(`  To: ${allIncome[allIncome.length - 1].transaction_date}`)
  } else if (incomeInRange.length > 0) {
    console.log('✅ Income found in default date range')
    console.log('If income still not showing, check:')
    console.log('1. Browser console for any errors')
    console.log('2. Network tab to verify API calls')
    console.log('3. React DevTools to check component state')
  }
  
  console.log('')
  console.log('=== EXPENSE CHECK (for comparison) ===')
  
  // Quick check on expenses using pagination
  let allExpenses = []
  try {
    let from = 0
    const pageSize = 1000
    let hasMore = true
    
    while (hasMore) {
      const to = from + pageSize - 1
      const { data } = await supabase
        .from('expenses')
        .select('transaction_type')
        .eq('user_id', user.user.id)
        .range(from, to)
      
      if (data && data.length > 0) {
        allExpenses = [...allExpenses, ...data]
        if (data.length < pageSize) {
          hasMore = false
        } else {
          from += pageSize
        }
      } else {
        hasMore = false
      }
    }
  } catch (error) {
    console.error('Error fetching expense count:', error)
  }
  
  const expenseCount = allExpenses?.filter(e => e.transaction_type === 'expense').length || 0
  const nullTypeCount = allExpenses?.filter(e => !e.transaction_type || e.transaction_type === null).length || 0
  
  console.log(`Total expenses: ${expenseCount}`)
  console.log(`Transactions with NULL type: ${nullTypeCount}`)
  
  if (nullTypeCount > 0) {
    console.log('')
    console.log('⚠️ WARNING: Found transactions with NULL transaction_type')
    console.log('Run the database migration to fix this:')
    console.log('See: supabase/MIGRATION_INSTRUCTIONS.md')
  }
  
  console.log('')
  console.log('=== END DIAGNOSTIC REPORT ===')
  
  return {
    totalIncome: allIncome.length,
    byMonth,
    inDefaultRange: incomeInRange.length,
    needsDateRangeAdjustment: incomeInRange.length === 0 && allIncome.length > 0,
    earliestDate: allIncome[0]?.transaction_date,
    latestDate: allIncome[allIncome.length - 1]?.transaction_date,
    nullTypeCount
  }
}

export async function diagnoseExpenseQuery(dateRange) {
  const { data: user } = await supabase.auth.getUser()
  
  if (!user?.user?.id) {
    console.error('No user logged in')
    return null
  }
  
  console.log('=== EXPENSE QUERY DIAGNOSTIC ===')
  console.log('Testing query with date range:', dateRange)
  
  try {
    // Use paginated fetch to bypass Supabase 1000 row limit
    const data = await fetchAllExpenses(supabase, user.user.id, {
      dateFrom: dateRange.from.toISOString().split('T')[0],
      dateTo: dateRange.to.toISOString().split('T')[0],
      includeExceptional: true
    })
    
    console.log(`Total transactions returned: ${data.length} (paginated fetch)`)
    
    const income = data.filter(e => e.transaction_type === 'income')
    const expenses = data.filter(e => e.transaction_type === 'expense')
    const nullType = data.filter(e => !e.transaction_type)
    
    console.log(`- Income: ${income.length}`)
    console.log(`- Expenses: ${expenses.length}`)
    console.log(`- NULL type: ${nullType.length}`)
    
    if (income.length > 0) {
      console.log('')
      console.log('Income transactions found:')
      income.forEach(i => {
        console.log(`  ${i.transaction_date}: ${i.merchant} ₪${i.amount.toFixed(2)}`)
      })
    }
    
    console.log('=== END QUERY DIAGNOSTIC ===')
    
    return {
      total: data.length,
      income: income.length,
      expenses: expenses.length,
      nullType: nullType.length,
      data
    }
  } catch (error) {
    console.error('Query error:', error)
    return null
  }
}
