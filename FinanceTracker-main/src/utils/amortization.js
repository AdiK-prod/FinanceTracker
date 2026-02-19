/**
 * Expense amortization: spread large upfront payments across months.
 * Virtual allocations are calculated on-the-fly, not stored in DB.
 */

/**
 * Calculate months difference between start date and target month (0-indexed).
 * getMonthsDifference('2026-01-15', '2026-01') => 0
 * getMonthsDifference('2026-01-15', '2026-03') => 2
 */
export function getMonthsDifference(startDate, targetMonth) {
  const start = typeof startDate === 'string' ? new Date(startDate + (startDate.length === 7 ? '-01' : '')) : new Date(startDate)
  const target = typeof targetMonth === 'string' ? new Date(targetMonth + (targetMonth.length === 7 ? '-01' : '')) : new Date(targetMonth)
  return (target.getFullYear() - start.getFullYear()) * 12 + (target.getMonth() - start.getMonth())
}

/**
 * Split total across months with remainder in first month.
 * e.g. 1000 ÷ 3 => [333.34, 333.33, 333.33]
 */
export function calculateMonthlyAmounts(total, months) {
  if (months < 1) return []
  const totalCents = Math.round(parseFloat(total) * 100)
  const baseCents = Math.floor(totalCents / months)
  const remainder = totalCents - baseCents * months
  const amounts = new Array(months).fill(baseCents / 100)
  amounts[0] = (baseCents + remainder) / 100
  return amounts
}

/**
 * Get first and last day of month for a given year-month string "YYYY-MM".
 */
export function getMonthBounds(yearMonth) {
  const [y, m] = yearMonth.split('-').map(Number)
  const from = new Date(y, m - 1, 1)
  const to = new Date(y, m, 0)
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  }
}

/**
 * Get transactions for a specific month: regular (non-amortized in range) + virtual allocations from amortized parents.
 * Used for Dashboard, Detailed, and Balance Analysis monthly views.
 * @param {object} supabase - Supabase client
 * @param {string} userId - user id
 * @param {string} targetMonth - "YYYY-MM"
 * @param {object} filters - optional: includeExceptional, minAmount, maxAmount, merchant
 * @returns {Promise<Array>} transactions for that month (regular + virtual)
 */
export async function getMonthTransactions(supabase, userId, targetMonth, filters = {}) {
  const { from: startOfMonth, to: endOfMonth } = getMonthBounds(targetMonth)

  // 1. Regular transactions in this month (non-amortized, or amortized but we still need them for list in Tagging; for reporting we exclude amortized parents)
  let regularQuery = supabase
    .from('expenses')
    .select('*')
    .eq('user_id', userId)
    .gte('transaction_date', startOfMonth)
    .lte('transaction_date', endOfMonth)
    .or('is_amortized.is.null,is_amortized.eq.false')

  if (filters.includeExceptional === false) {
    regularQuery = regularQuery.eq('is_exceptional', false)
  }
  if (filters.minAmount != null) {
    regularQuery = regularQuery.gte('amount', parseFloat(filters.minAmount))
  }
  if (filters.maxAmount != null) {
    regularQuery = regularQuery.lte('amount', parseFloat(filters.maxAmount))
  }
  if (filters.merchant) {
    regularQuery = regularQuery.ilike('merchant', `%${filters.merchant}%`)
  }

  regularQuery = regularQuery.order('transaction_date', { ascending: true })

  // Paginate to bypass Supabase row limit
  let regularData = []
  let from = 0
  const pageSize = 1000
  let hasMore = true
  while (hasMore) {
    const to = from + pageSize - 1
    const { data: page, error: regularError } = await regularQuery.range(from, to)
    if (regularError) throw regularError
    if (page?.length) {
      regularData = regularData.concat(page)
      hasMore = page.length >= pageSize
      from += pageSize
    } else {
      hasMore = false
    }
  }

  // 2. Amortized parents (all of them for this user; we'll filter by targetMonth)
  const { data: amortizedParents, error: amortizedError } = await supabase
    .from('expenses')
    .select('*')
    .eq('user_id', userId)
    .eq('is_amortized', true)

  if (amortizedError) throw amortizedError

  const virtuals = []
  const targetDate = new Date(targetMonth + '-01')

  for (const parent of amortizedParents || []) {
    const startDate = parent.amortization_start_date
    if (!startDate) continue
    const effectiveMonths = parent.amortization_adjusted_months ?? parent.amortization_months ?? 0
    const monthIndex = getMonthsDifference(startDate, targetMonth)

    if (monthIndex >= 0 && monthIndex < effectiveMonths) {
      const amounts = calculateMonthlyAmounts(parent.amount, effectiveMonths)
      const monthAmount = amounts[monthIndex] ?? parent.amortization_monthly_amount ?? 0
      virtuals.push({
        ...parent,
        id: `virtual_${parent.id}_${monthIndex}`,
        amount: monthAmount,
        transaction_date: targetDate.toISOString().slice(0, 10),
        is_virtual: true,
        amortization_index: monthIndex + 1,
        amortization_total: effectiveMonths,
      })
    }
  }

  const combined = [...(regularData || []), ...virtuals].sort(
    (a, b) => new Date(a.transaction_date) - new Date(b.transaction_date)
  )
  return combined
}

/**
 * Get transactions for a date range that may span multiple months, with amortization expanded.
 * Calls getMonthTransactions for each month in range and merges (for Dashboard/Detailed range view).
 */
export async function getTransactionsForRangeWithAmortization(supabase, userId, dateFrom, dateTo, filters = {}) {
  if (!dateFrom || !dateTo) return []
  const from = new Date(dateFrom)
  const to = new Date(dateTo)
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return []
  const months = []
  let d = new Date(from.getFullYear(), from.getMonth(), 1)
  const end = new Date(to.getFullYear(), to.getMonth(), 1)
  while (d <= end) {
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    d.setMonth(d.getMonth() + 1)
  }

  const byMonth = await Promise.all(
    months.map((ym) => getMonthTransactions(supabase, userId, ym, filters))
  )
  const merged = byMonth.flat()
  const fromStr = dateFrom.slice(0, 10)
  const toStr = dateTo.slice(0, 10)
  return merged.filter((t) => t.transaction_date >= fromStr && t.transaction_date <= toStr)
}
