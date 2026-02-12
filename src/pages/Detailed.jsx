import React, { useEffect, useMemo, useState, useRef } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  PieChart,
  Pie,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { BarChart3, Download, LineChart as LineChartIcon, PieChart as PieChartIcon, Filter, ChevronDown } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import DateRangePicker from '../components/DateRangePicker'
import { getTransactionsForRangeWithAmortization } from '../utils/amortization'
import { formatDateDisplay, formatDateRangeDisplay, formatMonthYear, formatDateForDB } from '../utils/dateFormatters'
import { parseDetailedStateFromUrl, buildDetailedUrlParams } from '../utils/viewStateUrl'

const CHART_COLORS = [
  '#0d9488', '#14b8a6', '#2dd4bf', '#5eead4',
  '#f59e0b', '#fbbf24', '#fcd34d', '#fde68a',
  '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe',
  '#ef4444', '#f87171', '#fca5a5', '#fecaca',
]

// Month-specific color palette for chronological data
const MONTH_COLORS = [
  '#0ea5e9', // Sky blue - January
  '#8b5cf6', // Purple - February
  '#ec4899', // Pink - March
  '#f59e0b', // Amber - April
  '#10b981', // Emerald - May
  '#06b6d4', // Cyan - June
  '#f97316', // Orange - July
  '#84cc16', // Lime - August
  '#6366f1', // Indigo - September
  '#14b8a6', // Teal - October
  '#f43f5e', // Rose - November
  '#a855f7', // Violet - December
]

// Get color for a specific month
const getColorForMonth = (monthKey) => {
  // Extract month number from "2025-01" format
  if (monthKey && monthKey.includes('-')) {
    const monthIndex = parseInt(monthKey.split('-')[1]) - 1
    return MONTH_COLORS[monthIndex % 12]
  }
  return CHART_COLORS[0]
}

const Detailed = () => {
  const { user } = useAuth()
  const [rawExpenses, setRawExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState('')
  
  // Debounce ref for fetch
  const fetchTimeoutRef = useRef(null)

  const [dateRange, setDateRange] = useState(() => {
    const now = new Date()
    return {
      from: new Date(now.getFullYear(), now.getMonth(), 1),
      to: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
    }
  })

  const [filters, setFilters] = useState({
    minAmount: '',
    maxAmount: '',
    includeExceptional: true,
    merchant: '',
    excludeUncategorized: false,
  })

  const [selectedMainCategories, setSelectedMainCategories] = useState([])
  /** Selected sub-categories per main: { [mainCategory]: string[] } so the same sub name under different mains is independent */
  const [selectedSubCategories, setSelectedSubCategories] = useState({})
  const [showCategoryFilter, setShowCategoryFilter] = useState(false)

  const [groupBy, setGroupBy] = useState('main_category')
  const [secondaryGroupBy, setSecondaryGroupBy] = useState(null)
  const [chartType, setChartType] = useState('pie')
  const [showPercentages, setShowPercentages] = useState(true)
  const [categories, setCategories] = useState({ mains: [], subs: {} })
  const [viewMode, setViewMode] = useState('breakdown') // 'breakdown' or 'balance'
  const [exportToast, setExportToast] = useState(false)

  const [searchParams, setSearchParams] = useSearchParams()
  const hasRestoredFromUrl = useRef(false)
  const hasInitializedCategorySelection = useRef(false)

  // Restore view state from URL on mount (e.g. when user clicks Back)
  useEffect(() => {
    if (hasRestoredFromUrl.current) return
    hasRestoredFromUrl.current = true
    const restored = parseDetailedStateFromUrl(searchParams)
    if (!restored) return
    setDateRange(restored.dateRange)
    setViewMode(restored.viewMode)
    setFilters((prev) => ({ ...prev, ...restored.filters }))
    setGroupBy(restored.groupBy)
    setSecondaryGroupBy(restored.secondaryGroupBy)
    setChartType(restored.chartType)
    setShowPercentages(restored.showPercentages)
  }, [])

  // Persist view state to URL when params change (so Back/refresh restores same view)
  useEffect(() => {
    const params = buildDetailedUrlParams({
      dateRange,
      viewMode,
      filters,
      groupBy,
      secondaryGroupBy,
      chartType,
      showPercentages,
    })
    const str = params.toString()
    const current = searchParams.toString()
    if (str === current) return
    setSearchParams(params, { replace: true })
  }, [dateRange, viewMode, filters, groupBy, secondaryGroupBy, chartType, showPercentages])

  useEffect(() => {
    const fetchCategories = async () => {
      if (!user) return
      const { data, error: fetchError } = await supabase
        .from('expense_categories')
        .select('main_category, sub_category')
        .eq('user_id', user.id)
        .order('main_category', { ascending: true })
        .order('sub_category', { ascending: true })

      if (fetchError) {
        setError(fetchError.message)
        return
      }

      const mains = Array.from(new Set((data || []).map((row) => row.main_category)))
      const subs = (data || []).reduce((acc, row) => {
        if (!row.sub_category) return acc
        if (!acc[row.main_category]) acc[row.main_category] = []
        acc[row.main_category].push(row.sub_category)
        return acc
      }, {})

      setCategories({ mains, subs })
    }

    fetchCategories()
  }, [user])

  // Initialize all categories as selected once when categories first load (not when user clicks Deselect All)
  useEffect(() => {
    if (categories.mains.length === 0 || hasInitializedCategorySelection.current) return
    if (selectedMainCategories.length === 0) {
      hasInitializedCategorySelection.current = true
      setSelectedMainCategories(categories.mains)
      setSelectedSubCategories(
        Object.fromEntries(
          categories.mains.map((m) => [m, [...(categories.subs[m] || [])]])
        )
      )
    }
  }, [categories, selectedMainCategories.length])

  useEffect(() => {
    // Clear existing timeout
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current)
    }
    
    // Set new timeout (300ms delay for debouncing)
    fetchTimeoutRef.current = setTimeout(() => {
      fetchExpenses()
    }, 300)
    
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current)
      }
    }
  }, [user, dateRange, filters, categories])

  const fetchExpenses = async () => {
    if (!user) return
    if (categories.mains.length === 0) {
      setRawExpenses([])
      setLoading(false)
      setIsRefreshing(false)
      return
    }

    if (rawExpenses.length > 0) {
      setIsRefreshing(true)
    } else {
      setLoading(true)
    }
    setError('')

    try {
      const dateFrom = dateRange?.from ? formatDateForDB(dateRange.from) : null
      const dateTo = dateRange?.to ? formatDateForDB(dateRange.to) : null
      const data = await getTransactionsForRangeWithAmortization(supabase, user.id, dateFrom, dateTo, {
        includeExceptional: filters.includeExceptional,
        minAmount: filters.minAmount ? parseFloat(filters.minAmount) : null,
        maxAmount: filters.maxAmount ? parseFloat(filters.maxAmount) : null,
        merchant: filters.merchant || null,
      })
      console.log(`✅ Fetched ${data.length} transactions (with amortization)`)
      setRawExpenses(data || [])
    } catch (fetchError) {
      console.error('Error fetching expenses:', fetchError)
      setError(fetchError.message || 'Failed to fetch expenses')
      setRawExpenses([])
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  // Apply category filter client-side so toggling categories does not refetch
  const expenses = useMemo(() => {
    if (selectedMainCategories.length === 0) return []
    const allCategoriesSelected = selectedMainCategories.length === categories.mains.length
    let filtered = rawExpenses

    if (!allCategoriesSelected && selectedMainCategories.length > 0) {
      filtered = filtered.filter((exp) =>
        exp.transaction_type === 'income' ||
        selectedMainCategories.includes(exp.main_category)
      )
    }

    filtered = filtered.filter((exp) => {
      if (exp.transaction_type === 'income') return true
      if (!exp.main_category) return true
      if (!exp.sub_category) return true
      const selectedForMain = selectedSubCategories[exp.main_category]
      if (selectedForMain === undefined) return true
      return selectedForMain.includes(exp.sub_category)
    })

    if (filters.excludeUncategorized) {
      filtered = filtered.filter((exp) =>
        exp.transaction_type === 'income' || (exp.main_category != null && exp.main_category !== '')
      )
    }
    return filtered
  }, [rawExpenses, selectedMainCategories, selectedSubCategories, categories.mains.length, filters.excludeUncategorized])

  const formatAmount = (amount) =>
    `₪${Number(amount || 0).toLocaleString('he-IL', { minimumFractionDigits: 2 })}`

  const toggleMainCategory = (category) => {
    if (selectedMainCategories.includes(category)) {
      setSelectedMainCategories((prev) => prev.filter((c) => c !== category))
      setSelectedSubCategories((prev) => {
        const next = { ...prev }
        delete next[category]
        return next
      })
    } else {
      setSelectedMainCategories((prev) => [...prev, category])
      setSelectedSubCategories((prev) => ({
        ...prev,
        [category]: [...(categories.subs[category] || [])],
      }))
    }
  }

  const toggleSubCategory = (mainCat, subCat) => {
    setSelectedSubCategories((prev) => {
      const list = prev[mainCat] ?? []
      if (list.includes(subCat)) {
        const nextList = list.filter((s) => s !== subCat)
        return { ...prev, [mainCat]: nextList }
      }
      return { ...prev, [mainCat]: [...list, subCat] }
    })
  }

  const selectAllCategories = () => {
    setSelectedMainCategories(categories.mains)
    setSelectedSubCategories(
      Object.fromEntries(
        categories.mains.map((m) => [m, [...(categories.subs[m] || [])]])
      )
    )
  }

  const deselectAllCategories = () => {
    setSelectedMainCategories([])
    setSelectedSubCategories({})
  }

  const allCategoriesSelected = selectedMainCategories.length === categories.mains.length

  const getActiveFilterCount = () => {
    let count = 0
    
    // Category filters
    if (!allCategoriesSelected) count++
    
    // Other filters
    if (filters.minAmount && filters.minAmount !== '') count++
    if (filters.maxAmount && filters.maxAmount !== '') count++
    if (filters.merchant && filters.merchant.trim() !== '') count++
    if (!filters.includeExceptional) count++
    if (filters.excludeUncategorized) count++
    
    return count
  }

  const activeFilterCount = getActiveFilterCount()
  const hasActiveFilters = activeFilterCount > 0

  // Category Breakdown: only expenses (exclude income; include legacy null as expense)
  const isExpense = (exp) => {
    const t = exp.transaction_type
    if (t === null || t === undefined || t === '') return true
    return String(t).toLowerCase() === 'expense'
  }
  const expensesForBreakdown = useMemo(
    () => expenses.filter(isExpense),
    [expenses]
  )

  const totalSpending = useMemo(
    () => expensesForBreakdown.reduce((sum, exp) => sum + (exp.amount || 0), 0),
    [expensesForBreakdown]
  )

  const averageExpense = useMemo(
    () => (expensesForBreakdown.length > 0 ? totalSpending / expensesForBreakdown.length : 0),
    [expensesForBreakdown, totalSpending]
  )

  const getGroupKey = (expense, groupType) => {
    switch (groupType) {
      case 'main_category':
        return expense.main_category || 'Uncategorized'
      case 'sub_category':
        return expense.sub_category || 'Uncategorized'
      case 'merchant':
        return expense.merchant
      case 'date': {
        const date = new Date(`${expense.transaction_date}T00:00:00`)
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      }
      default:
        return 'Other'
    }
  }

  const getGroupLabel = (key, groupType) => {
    if (groupType === 'date') {
      const [year, month] = key.split('-')
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      return `${monthNames[parseInt(month) - 1]} ${year}`
    }
    return key
  }

  const aggregatedData = useMemo(() => {
    // Category Breakdown: use only expenses (income excluded)
    if (!expensesForBreakdown.length) return []
    
    // If secondary grouping is enabled
    if (secondaryGroupBy) {
      const primaryGroups = {}
      
      expensesForBreakdown.forEach((expense) => {
        const primaryKey = getGroupKey(expense, groupBy)
        const secondaryKey = getGroupKey(expense, secondaryGroupBy)
        
        if (!primaryGroups[primaryKey]) {
          primaryGroups[primaryKey] = {
            name: getGroupLabel(primaryKey, groupBy),
            sortKey: primaryKey,
            total: 0,
            count: 0,
            children: {}
          }
        }
        
        if (!primaryGroups[primaryKey].children[secondaryKey]) {
          primaryGroups[primaryKey].children[secondaryKey] = {
            name: getGroupLabel(secondaryKey, secondaryGroupBy),
            sortKey: secondaryKey,
            total: 0,
            count: 0
          }
        }
        
        primaryGroups[primaryKey].total += expense.amount || 0
        primaryGroups[primaryKey].count += 1
        primaryGroups[primaryKey].children[secondaryKey].total += expense.amount || 0
        primaryGroups[primaryKey].children[secondaryKey].count += 1
      })
      
      let result = Object.values(primaryGroups)
      
      // Sort based on primary groupBy type
      if (groupBy === 'date') {
        result.sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      } else {
        result.sort((a, b) => b.total - a.total)
      }
      
      // Convert children to arrays and sort
      result = result.map(item => ({
        ...item,
        children: Object.values(item.children).sort((a, b) => 
          secondaryGroupBy === 'date' 
            ? a.sortKey.localeCompare(b.sortKey)
            : b.total - a.total
        ).map(child => ({
          ...child,
          total: Math.round(child.total * 100) / 100,
          percentage: item.total ? Math.round((child.total / item.total) * 100) : 0
        })),
        total: Math.round(item.total * 100) / 100,
        percentage: totalSpending ? Math.round((item.total / totalSpending) * 100) : 0
      }))
      
      return result
    }
    
    // Standard single-level grouping
    const grouped = {}

    expensesForBreakdown.forEach((expense) => {
      const key = getGroupKey(expense, groupBy)
      const label = getGroupLabel(key, groupBy)

      if (!grouped[key]) {
        grouped[key] = {
          name: label,
          sortKey: key,
          total: 0,
          count: 0,
        }
      }

      grouped[key].total += expense.amount || 0
      grouped[key].count += 1
    })

    let result = Object.values(grouped)
    
    // SMART SORTING: Chronological for dates, by amount for categories
    if (groupBy === 'date') {
      result.sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    } else {
      result.sort((a, b) => b.total - a.total)
    }

    return result.map((item) => ({
      ...item,
      total: Math.round(item.total * 100) / 100,
      percentage: totalSpending ? Math.round((item.total / totalSpending) * 100) : 0,
    }))
  }, [expensesForBreakdown, groupBy, secondaryGroupBy, totalSpending])

  // Calculate monthly balance data for Balance Analysis view
  const monthlyBalanceData = useMemo(() => {
    const grouped = {}
    
    expenses.forEach(exp => {
      // Group by month: "2026-01"
      const monthKey = exp.transaction_date.substring(0, 7)
      
      if (!grouped[monthKey]) {
        grouped[monthKey] = {
          month: monthKey,
          income: 0,
          expenses: 0,
          balance: 0,
          incomeCount: 0,
          expenseCount: 0
        }
      }
      
      if (exp.transaction_type === 'income') {
        grouped[monthKey].income += exp.amount
        grouped[monthKey].incomeCount += 1
      } else {
        grouped[monthKey].expenses += exp.amount
        grouped[monthKey].expenseCount += 1
      }
    })
    
    // Sort by month chronologically
    const sorted = Object.values(grouped).sort((a, b) => a.month.localeCompare(b.month))
    
    // Calculate balance and running total
    let runningBalance = 0
    
    sorted.forEach(month => {
      month.balance = month.income - month.expenses
      runningBalance += month.balance
      month.runningBalance = runningBalance
      
      // Format display name: "2026-01" → "Jan 2026"
      const [year, monthNum] = month.month.split('-')
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      month.displayName = `${monthNames[parseInt(monthNum) - 1]} ${year}`
    })
    
    return sorted
  }, [expenses])

  // Balance summary statistics
  const balanceSummary = useMemo(() => {
    const totalIncome = monthlyBalanceData.reduce((sum, m) => sum + m.income, 0)
    const totalExpenses = monthlyBalanceData.reduce((sum, m) => sum + m.expenses, 0)
    const totalBalance = totalIncome - totalExpenses
    const avgMonthlyBalance = monthlyBalanceData.length > 0 
      ? totalBalance / monthlyBalanceData.length 
      : 0
    const positiveMonths = monthlyBalanceData.filter(m => m.balance >= 0).length
    
    return {
      totalIncome,
      totalExpenses,
      totalBalance,
      avgMonthlyBalance,
      positiveMonths
    }
  }, [monthlyBalanceData])

  const exportToCSV = () => {
    const headers = ['Date', 'Merchant', 'Amount', 'Main Category', 'Sub Category', 'Notes', 'Exceptional']
    const rows = expenses.map((exp) => [
      formatDateDisplay(exp.transaction_date),
      exp.merchant,
      exp.amount,
      exp.main_category || '',
      exp.sub_category || '',
      exp.notes || '',
      exp.is_exceptional ? 'Yes' : 'No',
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `expenses_${formatDateForDB(dateRange.from)}_to_${formatDateForDB(dateRange.to)}.csv`
    link.click()
    // Clean up the object URL to prevent memory leak
    window.URL.revokeObjectURL(url)
    setExportToast(true)
    setTimeout(() => setExportToast(false), 2500)
  }

  const renderChart = () => {
    if (aggregatedData.length === 0) {
      return (
        <div className="h-96 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <PieChartIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-lg font-medium">No data to display</p>
            <p className="text-sm">Try adjusting your filters</p>
          </div>
        </div>
      )
    }
    
    // Use month colors when grouping by date, otherwise use standard colors
    const colors = groupBy === 'date' 
      ? aggregatedData.map(item => getColorForMonth(item.sortKey))
      : CHART_COLORS

    // For secondary grouping: pie/bar use flattened; line uses one series per secondary (multiple lines)
    const chartData = secondaryGroupBy 
      ? (chartType === 'line'
          ? aggregatedData.map((item) => ({
              name: item.name,
              ...Object.fromEntries((item.children || []).map((c) => [c.sortKey, c.total])),
            }))
          : aggregatedData.flatMap((item) => item.children || []))
      : aggregatedData

    const secondaryKeys = chartType === 'line' && secondaryGroupBy
      ? [...new Set(aggregatedData.flatMap((item) => (item.children || []).map((c) => c.sortKey)))]
      : []

    switch (chartType) {
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={chartData}
                dataKey="total"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={150}
                label={({ name, percentage }) => (showPercentages ? `${name}: ${percentage}%` : name)}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatAmount(value)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45} 
                textAnchor="end" 
                height={100}
                interval={0}
                tick={{ fontSize: 11 }}
              />
              <YAxis />
              <Tooltip formatter={(value) => formatAmount(value)} />
              <Legend />
              <Bar dataKey="total" name="Total Spending">
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45} 
                textAnchor="end" 
                height={100}
                interval={0}
                tick={{ fontSize: 11 }}
              />
              <YAxis />
              <Tooltip formatter={(value) => formatAmount(value)} />
              <Legend />
              {secondaryGroupBy && secondaryKeys.length > 0 ? (
                secondaryKeys.map((key, idx) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    name={key}
                  />
                ))
              ) : (
                <Line 
                  type="monotone" 
                  dataKey="total" 
                  stroke="#0d9488" 
                  strokeWidth={3}
                  dot={{ fill: '#0d9488', r: 5 }}
                  name="Total Spending" 
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        )
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-600">Loading reports...</div>
      </div>
    )
  }

  if (!loading && categories.mains.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Detailed Reports</h1>
          <p className="text-gray-600 mt-1">Advanced analytics and breakdowns</p>
        </div>
        <div className="card text-center py-12">
          <Filter className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No categories yet</h3>
          <p className="text-gray-600 mb-4">Add categories in the Categories page to see breakdowns and balance analysis here.</p>
          <Link to="/categories" className="btn-primary inline-flex items-center gap-2">
            Go to Categories
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8">
      {/* Export success toast */}
      {exportToast && (
        <div className="fixed top-4 right-4 z-50 bg-teal-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-slide-in">
          <Download className="w-5 h-5" />
          <span className="text-sm font-medium">Export downloaded</span>
        </div>
      )}
      {/* Subtle refreshing indicator */}
      {isRefreshing && (
        <div className="fixed top-4 right-4 bg-teal-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2 animate-fade-in">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium">Updating...</span>
        </div>
      )}
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Detailed Reports</h1>
        <p className="text-gray-600 mt-1">Advanced analytics and breakdowns</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        {/* View Mode Toggle */}
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-200">
          <span className="text-sm font-semibold text-gray-700">View:</span>
          <div className="flex flex-wrap gap-4">
            <div>
              <button
                onClick={() => setViewMode('breakdown')}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-teal focus:ring-offset-2 ${
                  viewMode === 'breakdown'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                📊 Category Breakdown
              </button>
              <p className="text-xs text-gray-500 mt-1">Spending by category, merchant, or month</p>
            </div>
            <div>
              <button
                onClick={() => setViewMode('balance')}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-teal focus:ring-offset-2 ${
                  viewMode === 'balance'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                💰 Balance Analysis
              </button>
              <p className="text-xs text-gray-500 mt-1">Income vs expenses and running balance</p>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <DateRangePicker value={dateRange} onChange={setDateRange} />

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCategoryFilter(!showCategoryFilter)}
              className={`flex items-center gap-2 px-4 py-2 border-2 rounded-lg transition-colors font-medium ${
                hasActiveFilters
                  ? 'border-teal-600 bg-teal-50 text-teal-700 shadow-sm'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span className="text-sm">Filters</span>
              {hasActiveFilters && (
                <span className="px-2 py-0.5 bg-teal-600 text-white text-xs font-bold rounded-full min-w-[20px] text-center">
                  {activeFilterCount}
                </span>
              )}
              <ChevronDown className={`w-4 h-4 transition-transform ${showCategoryFilter ? 'rotate-180' : ''}`} />
            </button>

            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Category Filter Panel */}
        {showCategoryFilter && (
          <div className="border-t border-gray-200 pt-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Filter by Categories</h3>
              <div className="flex gap-2">
                <button
                  onClick={selectAllCategories}
                  className="text-xs text-teal hover:text-teal/80 font-medium"
                >
                  Select All
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={deselectAllCategories}
                  className="text-xs text-gray-600 hover:text-gray-700 font-medium"
                >
                  Deselect All
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.mains.map((mainCat) => {
                const isMainSelected = selectedMainCategories.includes(mainCat)
                const subs = categories.subs[mainCat] || []
                const selectedSubsCount = (selectedSubCategories[mainCat] ?? []).length

                return (
                  <div
                    key={mainCat}
                    className={`border rounded-lg p-3 transition-all ${
                      isMainSelected 
                        ? 'border-teal-300 bg-teal-50/30' 
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <label className="flex items-center gap-2 cursor-pointer mb-2">
                      <input
                        type="checkbox"
                        checked={isMainSelected}
                        onChange={() => toggleMainCategory(mainCat)}
                        className="w-4 h-4 text-teal border-gray-300 rounded focus:ring-teal"
                      />
                      <span className={`font-semibold flex-1 ${
                        isMainSelected ? 'text-gray-900' : 'text-gray-400'
                      }`}>
                        {mainCat}
                      </span>
                      {subs.length > 0 && (
                        <span className={`text-xs ${
                          isMainSelected ? 'text-teal-600' : 'text-gray-400'
                        }`}>
                          {selectedSubsCount}/{subs.length}
                        </span>
                      )}
                    </label>

                    {/* ALWAYS SHOW SUB-CATEGORIES, even when main unchecked */}
                    {subs.length > 0 && (
                      <div className="ml-6 space-y-1 mt-2 pt-2 border-t border-gray-100">
                        {subs.map((subCat) => {
                          const isSubSelected = (selectedSubCategories[mainCat] ?? []).includes(subCat)
                          
                          return (
                            <label 
                              key={`${mainCat}-${subCat}`}
                              className={`flex items-center gap-2 cursor-pointer transition-opacity ${
                                !isMainSelected ? 'opacity-40' : 'opacity-100'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSubSelected}
                                onChange={() => toggleSubCategory(mainCat, subCat)}
                                disabled={!isMainSelected}
                                className="w-3 h-3 text-teal border-gray-300 rounded focus:ring-teal disabled:cursor-not-allowed"
                              />
                              <span className={`text-sm ${
                                isSubSelected && isMainSelected ? 'text-gray-700' : 'text-gray-400'
                              }`}>
                                {subCat}
                              </span>
                            </label>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Active Filter Banner */}
        {!allCategoriesSelected && (
          <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-teal" />
              <span className="text-sm text-teal-900">
                Filtering by {selectedMainCategories.length} of {categories.mains.length} categories
              </span>
            </div>
            <button
              onClick={selectAllCategories}
              className="text-sm text-teal hover:text-teal/80 underline"
            >
              Clear filter
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Min Amount</label>
            <input
              type="number"
              value={filters.minAmount}
              onChange={(e) => setFilters({ ...filters, minAmount: e.target.value })}
              placeholder="₪0"
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Amount</label>
            <input
              type="number"
              value={filters.maxAmount}
              onChange={(e) => setFilters({ ...filters, maxAmount: e.target.value })}
              placeholder="₪1000"
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Merchant Search</label>
            <input
              type="text"
              value={filters.merchant}
              onChange={(e) => setFilters({ ...filters, merchant: e.target.value })}
              placeholder="Search merchant..."
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.includeExceptional}
                onChange={(e) => setFilters({ ...filters, includeExceptional: e.target.checked })}
                className="w-4 h-4 text-teal border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">Include exceptional</span>
            </label>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.excludeUncategorized}
                onChange={(e) => setFilters({ ...filters, excludeUncategorized: e.target.checked })}
                className="w-4 h-4 text-teal border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">Exclude uncategorized</span>
            </label>
          </div>
        </div>

        {/* Only show breakdown controls when in breakdown view */}
        {viewMode === 'breakdown' && (
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pt-4 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Group by:</span>
              <select
                value={groupBy}
                onChange={(e) => {
                  setGroupBy(e.target.value)
                  // Reset secondary grouping if same as primary
                  if (secondaryGroupBy === e.target.value) {
                    setSecondaryGroupBy(null)
                  }
                }}
                className="px-3 py-2 border-2 border-gray-300 rounded-lg text-sm font-medium"
              >
                <option value="main_category">Main Category</option>
                <option value="sub_category">Sub Category</option>
                <option value="merchant">Merchant</option>
                <option value="date">Month</option>
              </select>
            </div>

            {/* Secondary Grouping */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">then by:</span>
              <select
                value={secondaryGroupBy || ''}
                onChange={(e) => setSecondaryGroupBy(e.target.value || null)}
                className="px-3 py-2 border-2 border-gray-300 rounded-lg text-sm font-medium"
              >
                <option value="">None</option>
                <option value="main_category" disabled={groupBy === 'main_category'}>Main Category</option>
                <option value="sub_category" disabled={groupBy === 'sub_category'}>Sub Category</option>
                <option value="merchant" disabled={groupBy === 'merchant'}>Merchant</option>
                <option value="date" disabled={groupBy === 'date'}>Month</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setChartType('pie')}
              className={`p-2 rounded-lg transition-colors ${
                chartType === 'pie' ? 'bg-teal-100 text-teal-700' : 'hover:bg-gray-100'
              }`}
              title="Pie Chart"
            >
              <PieChartIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => setChartType('bar')}
              className={`p-2 rounded-lg transition-colors ${
                chartType === 'bar' ? 'bg-teal-100 text-teal-700' : 'hover:bg-gray-100'
              }`}
              title="Bar Chart"
            >
              <BarChart3 className="w-5 h-5" />
            </button>
            <button
              onClick={() => setChartType('line')}
              className={`p-2 rounded-lg transition-colors ${
                chartType === 'line' ? 'bg-teal-100 text-teal-700' : 'hover:bg-gray-100'
              }`}
              title="Line Chart"
            >
              <LineChartIcon className="w-5 h-5" />
            </button>

            <div className="ml-2 pl-2 border-l border-gray-300">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPercentages}
                  onChange={(e) => setShowPercentages(e.target.checked)}
                  className="w-4 h-4 text-teal border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Show %</span>
              </label>
            </div>
          </div>
        </div>
        )}
      </div>

      {/* Conditional Content Based on View Mode */}
      {viewMode === 'breakdown' ? (
        // EXISTING BREAKDOWN VIEW
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-sm text-gray-600 mb-1">Total Spending</div>
          <div className="text-3xl font-bold text-gray-900">{formatAmount(totalSpending)}</div>
          <div className="text-sm text-gray-500 mt-1">
            {formatDateRangeDisplay(dateRange.from, dateRange.to)}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-sm text-gray-600 mb-1">Expense Transactions</div>
          <div className="text-3xl font-bold text-gray-900">{expensesForBreakdown.length}</div>
          <div className="text-sm text-gray-500 mt-1">
            {aggregatedData.length} unique {groupBy.replace('_', ' ')}s
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-sm text-gray-600 mb-1">Average Expense</div>
          <div className="text-3xl font-bold text-gray-900">{formatAmount(averageExpense)}</div>
          <div className="text-sm text-gray-500 mt-1">per transaction</div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Spending by {groupBy.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
        </h2>
        {renderChart()}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Detailed Breakdown
            {secondaryGroupBy && (
              <span className="text-sm font-normal text-gray-600 ml-2">
                (Grouped by {groupBy.replace('_', ' ')} → {secondaryGroupBy.replace('_', ' ')})
              </span>
            )}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  {secondaryGroupBy ? `${groupBy.replace('_', ' ')} / ${secondaryGroupBy.replace('_', ' ')}` : groupBy.replace('_', ' ')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">
                  Total
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">
                  % of Total
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase">
                  Count
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">
                  Average
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {aggregatedData.map((item, idx) => (
                <React.Fragment key={item.sortKey ?? `${item.name}-${idx}`}>
                  {/* Primary row */}
                  <tr className={`hover:bg-gray-50 ${secondaryGroupBy ? 'bg-gray-50 font-semibold' : ''}`}>
                    <td className={`px-6 py-4 text-sm ${secondaryGroupBy ? 'font-bold' : 'font-medium'} text-gray-900`}>
                      {item.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-semibold text-gray-900">
                      {formatAmount(item.total)}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-gray-600">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-teal h-2 rounded-full"
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                        <span>{item.percentage}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-center text-gray-600">{item.count}</td>
                    <td className="px-6 py-4 text-sm text-right text-gray-600">
                      {formatAmount(item.total / item.count)}
                    </td>
                  </tr>
                  
                  {/* Secondary rows (if nested grouping) */}
                  {secondaryGroupBy && item.children && item.children.map((child, childIdx) => (
                    <tr key={`${item.name}-${child.name}-${childIdx}`} className="hover:bg-gray-50">
                      <td className="px-6 py-3 text-sm text-gray-700 pl-12">
                        <span className="text-gray-400 mr-2">└</span>
                        {child.name}
                      </td>
                      <td className="px-6 py-3 text-sm text-right text-gray-700">
                        {formatAmount(child.total)}
                      </td>
                      <td className="px-6 py-3 text-sm text-right text-gray-500">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-teal-400 h-2 rounded-full"
                              style={{ width: `${child.percentage}%` }}
                            />
                          </div>
                          <span className="text-xs">{child.percentage}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-sm text-center text-gray-500">{child.count}</td>
                      <td className="px-6 py-3 text-sm text-right text-gray-500">
                        {formatAmount(child.total / child.count)}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

          {error && (
            <div className="error-banner mt-6">
              {error}
            </div>
          )}
        </>
      ) : (
        // NEW BALANCE ANALYSIS VIEW
        <div>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-xl p-6 border-2 border-green-300 shadow-sm">
              <p className="text-sm font-semibold text-green-700 mb-1">Total Income</p>
              <p className="text-2xl font-bold text-green-900">
                {formatAmount(balanceSummary.totalIncome)}
              </p>
            </div>
            
            <div className="bg-white rounded-xl p-6 border-2 border-red-300 shadow-sm">
              <p className="text-sm font-semibold text-red-700 mb-1">Total Expenses</p>
              <p className="text-2xl font-bold text-red-900">
                {formatAmount(balanceSummary.totalExpenses)}
              </p>
            </div>
            
            <div className={`rounded-xl p-6 border-2 shadow-sm ${
              balanceSummary.totalBalance >= 0
                ? 'bg-white border-blue-300'
                : 'bg-white border-orange-300'
            }`}>
              <p className={`text-sm font-semibold mb-1 ${
                balanceSummary.totalBalance >= 0 ? 'text-blue-700' : 'text-orange-700'
              }`}>
                Net Balance
              </p>
              <p className={`text-2xl font-bold ${
                balanceSummary.totalBalance >= 0 ? 'text-blue-900' : 'text-orange-900'
              }`}>
                {balanceSummary.totalBalance >= 0 ? '+' : ''}{formatAmount(Math.abs(balanceSummary.totalBalance))}
              </p>
            </div>
            
            <div className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-sm">
              <p className="text-sm font-semibold text-gray-700 mb-1">Avg Monthly Balance</p>
              <p className={`text-2xl font-bold ${
                balanceSummary.avgMonthlyBalance >= 0 ? 'text-green-900' : 'text-orange-900'
              }`}>
                {balanceSummary.avgMonthlyBalance >= 0 ? '+' : ''}{formatAmount(Math.abs(balanceSummary.avgMonthlyBalance))}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {balanceSummary.positiveMonths} of {monthlyBalanceData.length} months positive
              </p>
            </div>
          </div>
          
          {/* Income vs Expenses Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Income vs Expenses Over Time</h3>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={monthlyBalanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="displayName" 
                  angle={-45} 
                  textAnchor="end" 
                  height={100}
                  tick={{ fontSize: 11 }}
                />
                <YAxis />
                <Tooltip
                  formatter={(value) => formatAmount(value)}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="income" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  name="Income"
                  dot={{ fill: '#10b981', r: 5 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="expenses" 
                  stroke="#ef4444" 
                  strokeWidth={3}
                  name="Expenses"
                  dot={{ fill: '#ef4444', r: 5 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="balance" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  name="Net Balance"
                  dot={{ fill: '#3b82f6', r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          {/* Monthly Balance Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Monthly Balance Breakdown</h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Month
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Income
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Expenses
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Balance
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Running Total
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Trend
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {monthlyBalanceData.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                        No transaction data for the selected period
                      </td>
                    </tr>
                  ) : (
                    monthlyBalanceData.map((month) => (
                      <tr key={month.month} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          {month.displayName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                          <span className="font-semibold text-green-600">
                            +{formatAmount(month.income)}
                          </span>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {month.incomeCount} transaction{month.incomeCount !== 1 ? 's' : ''}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                          <span className="font-semibold text-red-600">
                            -{formatAmount(month.expenses)}
                          </span>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {month.expenseCount} transaction{month.expenseCount !== 1 ? 's' : ''}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                          <span className={`font-bold ${
                            month.balance >= 0 ? 'text-blue-600' : 'text-orange-600'
                          }`}>
                            {month.balance >= 0 ? '+' : ''}{formatAmount(Math.abs(month.balance))}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                          <span className={`font-bold ${
                            month.runningBalance >= 0 ? 'text-blue-900' : 'text-orange-900'
                          }`}>
                            {month.runningBalance >= 0 ? '+' : ''}{formatAmount(Math.abs(month.runningBalance))}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-2xl">
                          {month.balance >= 0 ? '📈' : '📉'}
                        </td>
                      </tr>
                    ))
                  )}
                  
                  {/* Totals Row */}
                  {monthlyBalanceData.length > 0 && (
                    <tr className="bg-gray-100 font-bold">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        TOTAL
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-700">
                        +{formatAmount(balanceSummary.totalIncome)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-700">
                        -{formatAmount(balanceSummary.totalExpenses)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        <span className={balanceSummary.totalBalance >= 0 ? 'text-blue-700' : 'text-orange-700'}>
                          {balanceSummary.totalBalance >= 0 ? '+' : ''}{formatAmount(Math.abs(balanceSummary.totalBalance))}
                        </span>
                      </td>
                      <td colSpan="2"></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Detailed
