/**
 * Fetch all rows from a Supabase query, bypassing the max-rows limit
 * by making multiple paginated requests
 */
export async function fetchAllRows(query, pageSize = 1000) {
  let allData = []
  let from = 0
  let hasMore = true
  
  while (hasMore) {
    const to = from + pageSize - 1
    
    // Clone the query and add range
    const { data, error } = await query.range(from, to)
    
    if (error) {
      throw error
    }
    
    if (data && data.length > 0) {
      allData = [...allData, ...data]
      
      // If we got less than pageSize, we've reached the end
      if (data.length < pageSize) {
        hasMore = false
      } else {
        from += pageSize
      }
    } else {
      hasMore = false
    }
  }
  
  return allData
}

/**
 * Fetch all expenses with proper pagination
 * Usage: const data = await fetchAllExpenses(supabase, userId, filters)
 */
export async function fetchAllExpenses(supabase, userId, filters = {}) {
  let allData = []
  let from = 0
  const pageSize = 1000
  let hasMore = true
  
  while (hasMore) {
    const to = from + pageSize - 1
    
    // Build query
    let query = supabase
      .from('expenses')
      .select('*, transaction_type')
      .eq('user_id', userId)
    
    // Apply filters
    if (filters.dateFrom) {
      query = query.gte('transaction_date', filters.dateFrom)
    }
    if (filters.dateTo) {
      query = query.lte('transaction_date', filters.dateTo)
    }
    if (filters.includeExceptional === false) {
      query = query.eq('is_exceptional', false)
    }
    if (filters.minAmount) {
      query = query.gte('amount', parseFloat(filters.minAmount))
    }
    if (filters.maxAmount) {
      query = query.lte('amount', parseFloat(filters.maxAmount))
    }
    if (filters.merchant) {
      query = query.ilike('merchant', `%${filters.merchant}%`)
    }
    
    // Add ordering and range
    query = query
      .order('transaction_date', { ascending: false })
      .range(from, to)
    
    const { data, error } = await query
    
    if (error) {
      console.error('Error fetching expenses:', error)
      throw error
    }
    
    if (data && data.length > 0) {
      allData = [...allData, ...data]
      
      // If we got less than pageSize, we've reached the end
      if (data.length < pageSize) {
        hasMore = false
      } else {
        from += pageSize
      }
    } else {
      hasMore = false
    }
  }
  
  return allData
}

/**
 * Fetch all expense_categories for a user with pagination (bypasses Supabase max-rows limit).
 * Usage: const data = await fetchAllCategories(supabase, userId)
 */
export async function fetchAllCategories(supabase, userId) {
  const pageSize = 1000
  let allData = []
  let from = 0
  let hasMore = true

  while (hasMore) {
    const to = from + pageSize - 1
    const { data, error } = await supabase
      .from('expense_categories')
      .select('id, main_category, sub_category, is_default, display_order')
      .eq('user_id', userId)
      .order('display_order', { ascending: true })
      .order('main_category', { ascending: true })
      .order('sub_category', { ascending: true })
      .range(from, to)

    if (error) {
      console.error('Error fetching categories:', error)
      throw error
    }

    if (data && data.length > 0) {
      allData = [...allData, ...data]
      if (data.length < pageSize) {
        hasMore = false
      } else {
        from += pageSize
      }
    } else {
      hasMore = false
    }
  }

  return allData
}
