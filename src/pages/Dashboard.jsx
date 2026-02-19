import { useEffect, useMemo, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Upload, X, Wallet, Receipt, TrendingUp, TrendingDown, ArrowUpRight, Star, Plus, Search } from 'lucide-react'
import PieChartComponent from '../components/PieChart'
import DateRangePicker from '../components/DateRangePicker'
import UploadZone from '../components/UploadZone'
import AddTransactionModal from '../components/AddTransactionModal'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { formatDateDisplay, formatDateRangeDisplay, formatDateForDB } from '../utils/dateFormatters'
import { diagnoseIncomeData, diagnoseExpenseQuery } from '../utils/diagnostics'
import { fetchAllExpenses } from '../utils/fetchAllRows'
import { getTransactionsForRangeWithAmortization } from '../utils/amortization'
import { parseDashboardStateFromUrl, buildDashboardUrlParams } from '../utils/viewStateUrl'

const Dashboard = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [successToast, setSuccessToast] = useState(null)
  const toastTimeoutRef = useRef(null)
  const getCurrentMonthRange = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    return {
      from: new Date(year, month, 1),
      to: new Date(year, month + 1, 0),
    }
  }

  const [dateRange, setDateRange] = useState(getCurrentMonthRange())
  const [expenses, setExpenses] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [includeExceptional, setIncludeExceptional] = useState(true)

  const [searchParams, setSearchParams] = useSearchParams()
  const hasRestoredDashboardFromUrl = useRef(false)

  useEffect(() => {
    if (hasRestoredDashboardFromUrl.current) return
    hasRestoredDashboardFromUrl.current = true
    const restored = parseDashboardStateFromUrl(searchParams)
    if (!restored) return
    setDateRange(restored.dateRange)
    setIncludeExceptional(restored.includeExceptional)
  }, [])

  useEffect(() => {
    const params = buildDashboardUrlParams({ dateRange, includeExceptional })
    const str = params.toString()
    if (str === searchParams.toString()) return
    setSearchParams(params, { replace: true })
  }, [dateRange, includeExceptional, searchParams])

  // Diagnostic function
  const runDiagnostics = async () => {
    console.clear()
    console.log('🔍 Running diagnostics...')
    console.log('')
    
    // Run income diagnostic
    const incomeReport = await diagnoseIncomeData()
    
    // Run query diagnostic with current date range
    console.log('')
    await diagnoseExpenseQuery(dateRange)
    
    console.log('')
    console.log('💡 TIP: Check the console output above for detailed analysis')
    
    // Show alert with summary
    if (incomeReport) {
      const summary = `
Diagnostic Results:
━━━━━━━━━━━━━━━━━━━━━
Total Income: ${incomeReport.totalIncome}
In Current Range: ${incomeReport.inDefaultRange}
${incomeReport.needsDateRangeAdjustment ? '\n⚠️ ISSUE: Income exists but not in current date range' : ''}
${incomeReport.noIncomeFound ? '\n⚠️ WARNING: No income transactions found' : ''}

Check browser console (F12) for full details.
      `
      alert(summary.trim())
    }
  }

  useEffect(() => {
    const fetchExpenses = async () => {
      if (!user) return
      
      setIsLoading(true)
      setError('')
      const from = dateRange?.from ? formatDateForDB(dateRange.from) : null
      const to = dateRange?.to ? formatDateForDB(dateRange.to) : null
      if (!from || !to) {
        setExpenses([])
        setIsLoading(false)
        return
      }

      try {
        // Use amortization-aware fetch so monthly totals include virtual allocations (not full amortized amount)
        const data = await getTransactionsForRangeWithAmortization(supabase, user.id, from, to, {
          includeExceptional: includeExceptional,
        })
        console.log(`✅ Dashboard fetched ${data.length} transactions (with amortization)`)
        setExpenses(data || [])
      } catch (fetchError) {
        console.error('Error fetching expenses:', fetchError)
        setError(fetchError.message || 'Failed to fetch expenses')
        setExpenses([])
      }
      
      setIsLoading(false)
    }

    fetchExpenses()
  }, [user, dateRange, includeExceptional])

  // Calculate income, expenses, and net balance
  const incomeTotal = useMemo(() => {
    return expenses
      .filter(exp => exp.transaction_type === 'income')
      .reduce((sum, exp) => sum + (exp.amount || 0), 0)
  }, [expenses])

  const expenseTotal = useMemo(() => {
    return expenses
      .filter(exp => exp.transaction_type === 'expense')
      .reduce((sum, exp) => sum + (exp.amount || 0), 0)
  }, [expenses])

  const netBalance = useMemo(() => {
    return incomeTotal - expenseTotal
  }, [incomeTotal, expenseTotal])

  const formatAmount = (amount) =>
    `₪${amount.toLocaleString('he-IL', { minimumFractionDigits: 2 })}`

  const incomeCount = expenses.filter(e => e.transaction_type === 'income').length
  const expenseCount = expenses.filter(e => e.transaction_type === 'expense').length

  // Group expenses by category for pie chart (expenses only)
  const categoryData = useMemo(() => {
    const grouped = {}
    expenses
      .filter(exp => exp.transaction_type === 'expense')
      .forEach(exp => {
        const category = exp.main_category || 'Uncategorized'
        grouped[category] = (grouped[category] || 0) + exp.amount
      })
    return Object.entries(grouped).map(([name, value]) => ({ name, value }))
  }, [expenses])

  // Sort transactions by date (most recent first)
  const sortedTransactions = useMemo(() => {
    return [...expenses].sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date))
  }, [expenses])

  const handleCategoryClick = (categoryName) => {
    setSelectedCategory(selectedCategory === categoryName ? null : categoryName)
  }

  const handleCategoryPillClick = (categoryName) => {
    navigate('/detailed', { state: { category: categoryName } })
  }

  const handleUpload = async (rows, uploadId = null) => {
    if (!user) return
    setError('')

    const payload = rows.map((row) => ({
      transaction_date: row.date,
      merchant: row.merchant,
      amount: row.amount,
      main_category: row.main_category || null,
      sub_category: row.sub_category || null,
      is_auto_tagged: row.is_auto_tagged || false,
      is_exceptional: row.is_exceptional || false,
      currency: 'ILS',
      user_id: user.id,
      transaction_type: 'expense',
      upload_id: uploadId || null,
    }))

    const { error: insertError } = await supabase.from('expenses').insert(payload)

    if (insertError) {
      setError(insertError.message)
      return false
    }

    setIsUploadOpen(false)
    navigate('/tagging')
    return true
  }

  return (
    <div className="space-y-6">
      {/* Success Toast */}
      {successToast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white px-5 py-3.5 rounded-xl shadow-2xl flex items-start gap-3 animate-slide-in border border-white/10">
          <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
            <Receipt className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-sm">
              {successToast.total} transaction{successToast.total !== 1 ? 's' : ''} added
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {successToast.expense > 0 && `${successToast.expense} expense${successToast.expense !== 1 ? 's' : ''}`}
              {successToast.income > 0 && successToast.expense > 0 && ' · '}
              {successToast.income > 0 && `${successToast.income} income`}
            </p>
          </div>
          <button
            onClick={() => setSuccessToast(null)}
            className="ml-2 text-gray-500 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">Household spending overview</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 cursor-pointer bg-white px-3 py-2 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors text-sm font-medium text-gray-600 select-none">
            <input
              type="checkbox"
              checked={includeExceptional}
              onChange={(e) => setIncludeExceptional(e.target.checked)}
              className="w-3.5 h-3.5 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
            />
            <Star className="w-3.5 h-3.5 text-amber-400" />
            <span className="whitespace-nowrap">Exceptional</span>
          </label>
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
            baseDate={new Date()}
          />
          {import.meta.env.DEV && (
            <button
              onClick={runDiagnostics}
              className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium transition-colors"
              title="Run diagnostic"
            >
              <Search size={14} />
              Diagnose
            </button>
          )}
          <button
            onClick={() => setIsUploadOpen(true)}
            className="btn-primary flex items-center gap-1.5"
          >
            <Upload size={14} />
            Upload
          </button>
        </div>
      </div>

      {!includeExceptional && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center gap-3">
          <Star className="w-4 h-4 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-800">
            <span className="font-semibold">Exceptional transactions excluded.</span>{' '}
            Toggle above to include one-time transactions.
          </p>
        </div>
      )}

      {/* Summary Cards */}
      {isLoading ? (
        <div className="animate-pulse grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="h-24 bg-gray-200 rounded-xl" />
          <div className="h-24 bg-gray-200 rounded-xl" />
          <div className="h-24 bg-gray-200 rounded-xl" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Income */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4 relative overflow-hidden" style={{boxShadow:'0 1px 3px 0 rgb(0 0 0/0.06)'}}>
            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 rounded-l-xl" aria-hidden="true" />
            <div className="pl-2 flex items-center gap-4 min-w-0 w-full">
              <div className="p-2.5 bg-emerald-50 rounded-lg shrink-0">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Income</p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5 truncate leading-none">{formatAmount(incomeTotal)}</p>
                <p className="text-xs text-gray-400 mt-1">{incomeCount} transaction{incomeCount !== 1 ? 's' : ''}</p>
              </div>
            </div>
          </div>

          {/* Expenses */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4 relative overflow-hidden" style={{boxShadow:'0 1px 3px 0 rgb(0 0 0/0.06)'}}>
            <div className="absolute top-0 left-0 w-1 h-full bg-red-400 rounded-l-xl" aria-hidden="true" />
            <div className="pl-2 flex items-center gap-4 min-w-0 w-full">
              <div className="p-2.5 bg-red-50 rounded-lg shrink-0">
                <TrendingDown className="w-4 h-4 text-red-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Expenses</p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5 truncate leading-none">{formatAmount(expenseTotal)}</p>
                <p className="text-xs text-gray-400 mt-1">{expenseCount} transaction{expenseCount !== 1 ? 's' : ''}</p>
              </div>
            </div>
          </div>

          {/* Net Balance */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4 relative overflow-hidden" style={{boxShadow:'0 1px 3px 0 rgb(0 0 0/0.06)'}}>
            <div className={`absolute top-0 left-0 w-1 h-full rounded-l-xl ${netBalance >= 0 ? 'bg-teal-500' : 'bg-amber-400'}`} aria-hidden="true" />
            <div className="pl-2 flex items-center gap-4 min-w-0 w-full">
              <div className={`p-2.5 rounded-lg shrink-0 ${netBalance >= 0 ? 'bg-teal-50' : 'bg-amber-50'}`}>
                <ArrowUpRight className={`w-4 h-4 ${netBalance >= 0 ? 'text-teal-600' : 'text-amber-500 rotate-90'}`} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Net Balance</p>
                <p className={`text-2xl font-bold mt-0.5 truncate leading-none ${netBalance >= 0 ? 'text-teal-600' : 'text-amber-600'}`}>
                  {netBalance >= 0 ? '+' : ''}{formatAmount(Math.abs(netBalance))}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {netBalance >= 0
                    ? `${((netBalance / (incomeTotal || 1)) * 100).toFixed(1)}% saved`
                    : `${Math.abs((netBalance / (incomeTotal || 1)) * 100).toFixed(1)}% overspent`}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && expenses.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 text-center py-14 px-6" style={{boxShadow:'0 1px 3px 0 rgb(0 0 0/0.06)'}}>
          <Wallet className="w-10 h-10 text-gray-200 mx-auto mb-4" />
          <h3 className="text-base font-semibold text-gray-900 mb-1">No transactions found</h3>
          <p className="text-sm text-gray-500 mb-5">Upload a CSV file to populate your dashboard.</p>
          <button onClick={() => setIsUploadOpen(true)} className="btn-primary inline-flex items-center gap-2">
            <Upload size={14} />
            Upload File
          </button>
        </div>
      )}

      {/* Category pills */}
      {expenses.length > 0 && categoryData.length > 0 && (
        <div>
          <p className="section-heading">Expense Breakdown</p>
          <div className="flex flex-wrap gap-2">
            {categoryData.map((item) => (
              <button
                key={item.name}
                onClick={() => handleCategoryPillClick(item.name)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors bg-white border border-gray-200 text-gray-600 hover:border-teal-300 hover:text-teal-700 hover:bg-teal-50/50"
                style={{boxShadow:'0 1px 2px 0 rgb(0 0 0/0.04)'}}
              >
                {item.name}
                <span className="ml-1.5 text-teal-600 font-bold">{formatAmount(item.value)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Charts and Transactions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        {isLoading ? (
          <div className="card animate-pulse h-[400px]" />
        ) : categoryData.length > 0 ? (
          <PieChartComponent
            data={categoryData}
            selectedCategory={selectedCategory}
            onCategoryClick={handleCategoryClick}
          />
        ) : (
          <div className="card flex items-center justify-center h-32">
            <p className="text-sm text-gray-400">No expenses for this range</p>
          </div>
        )}

        {/* Recent Transactions */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden" style={{boxShadow:'0 1px 3px 0 rgb(0 0 0/0.06)'}}>
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Latest Activity</h2>
            <button
              onClick={() => navigate('/tagging')}
              className="text-xs text-teal-600 hover:text-teal-700 font-semibold flex items-center gap-1 transition-colors"
            >
              View all <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-gray-50">
            {isLoading ? (
              <div className="px-5 py-10 text-center animate-pulse">
                <div className="h-3 bg-gray-200 rounded w-3/4 mx-auto mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mx-auto"></div>
              </div>
            ) : sortedTransactions.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <Receipt className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No transactions yet</p>
              </div>
            ) : (
              sortedTransactions.slice(0, 10).map((expense) => (
                <div
                  key={expense.id}
                  className="px-5 py-3 hover:bg-gray-50/70 transition-colors cursor-pointer"
                  onClick={() => navigate('/tagging')}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 truncate" dir="rtl">
                          {expense.merchant}
                        </span>
                        {expense.transaction_type === 'income' && (
                          <span className="inline-flex items-center px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded uppercase tracking-wide shrink-0">
                            Income
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs text-gray-400">
                          {formatDateDisplay(expense.transaction_date)}
                        </span>
                        {expense.main_category && (
                          <>
                            <span className="text-gray-300 text-xs">·</span>
                            <span className="text-xs text-gray-500">{expense.main_category}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className={`text-sm font-semibold tabular-nums ${
                        expense.transaction_type === 'income' ? 'text-emerald-600' : 'text-gray-900'
                      }`}>
                        {expense.transaction_type === 'income' ? '+' : ''}₪{expense.amount.toLocaleString('he-IL', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </div>
                      {expense.is_exceptional && (
                        <span className="inline-block mt-0.5 text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded font-medium">
                          Exceptional
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          {error}
        </div>
      )}

      {/* Upload Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-4xl max-h-[85vh] bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col animate-scale-in">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Upload Expenses</h2>
                <p className="text-sm text-gray-600 mt-1">Supports CSV and XLSX files</p>
              </div>
              <button
                onClick={() => setIsUploadOpen(false)}
                className="p-2 rounded-md hover:bg-gray-100 transition-all duration-300 ease-in-out"
              >
                <X size={20} className="text-gray-600" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <UploadZone onConfirmUpload={handleUpload} />
            </div>
          </div>
        </div>
      )}

      {/* Add Transaction Modal */}
      <AddTransactionModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={async (counts) => {
          // Show success toast with cleanup
          setSuccessToast(counts)
          if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
          toastTimeoutRef.current = setTimeout(() => setSuccessToast(null), 5000)
          
          // Refresh expenses by triggering a re-fetch
          if (!user) return
          
          setIsLoading(true)
          setError('')
          const from = dateRange?.from ? formatDateForDB(dateRange.from) : null
          const to = dateRange?.to ? formatDateForDB(dateRange.to) : null

          try {
            // Use paginated fetch to bypass Supabase 1000 row limit
            const data = await fetchAllExpenses(supabase, user.id, {
              dateFrom: from,
              dateTo: to,
              includeExceptional: includeExceptional
            })
            
            console.log(`✅ Dashboard refreshed ${data.length} total transactions (paginated)`)
            setExpenses(data || [])
          } catch (fetchError) {
            console.error('Error refreshing expenses:', fetchError)
            setError(fetchError.message || 'Failed to refresh expenses')
            setExpenses([])
          }
          
          setIsLoading(false)
        }}
      />
    </div>
  )
}

export default Dashboard
