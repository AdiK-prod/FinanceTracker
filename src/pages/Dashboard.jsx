import { useEffect, useMemo, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Upload, X, Wallet, Receipt, TrendingUp, Star, Plus, Search } from 'lucide-react'
import PieChartComponent from '../components/PieChart'
import DateRangePicker from '../components/DateRangePicker'
import UploadZone from '../components/UploadZone'
import AddTransactionModal from '../components/AddTransactionModal'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { formatDateDisplay, formatDateRangeDisplay, formatDateForDB } from '../utils/dateFormatters'
import { diagnoseIncomeData, diagnoseExpenseQuery } from '../utils/diagnostics'
import { fetchAllExpenses } from '../utils/fetchAllRows'
import { parseDashboardStateFromUrl, buildDashboardUrlParams } from '../utils/viewStateUrl'

const Dashboard = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [successToast, setSuccessToast] = useState(null)
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

      try {
        // Use paginated fetch to bypass Supabase 1000 row limit
        const data = await fetchAllExpenses(supabase, user.id, {
          dateFrom: from,
          dateTo: to,
          includeExceptional: includeExceptional
        })
        
        console.log(`✅ Dashboard fetched ${data.length} total transactions (paginated)`)
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
    <div className="space-y-8">
      {/* Success Toast */}
      {successToast && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-6 py-4 rounded-lg shadow-2xl flex items-start gap-3 animate-slide-in">
          <Receipt className="w-6 h-6 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">
              {successToast.total} transaction{successToast.total !== 1 ? 's' : ''} added successfully!
            </p>
            <p className="text-sm text-green-100 mt-1">
              {successToast.expense > 0 && `${successToast.expense} expense${successToast.expense !== 1 ? 's' : ''}`}
              {successToast.income > 0 && successToast.expense > 0 && ' • '}
              {successToast.income > 0 && `${successToast.income} income`}
            </p>
          </div>
          <button
            onClick={() => setSuccessToast(null)}
            className="ml-4 text-white hover:text-green-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
      
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Overview of your household spending</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 rounded-lg border border-gray-200 hover:border-teal transition-colors">
            <input
              type="checkbox"
              checked={includeExceptional}
              onChange={(e) => setIncludeExceptional(e.target.checked)}
              className="w-4 h-4 text-teal border-gray-300 rounded focus:ring-teal"
            />
            <Star className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-medium text-gray-700">
              Include exceptional
            </span>
          </label>
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
            baseDate={new Date()}
          />
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-teal-600 text-teal-700 rounded-lg hover:bg-teal-50 font-semibold transition-colors"
          >
            <Plus size={20} />
            Add Manually
          </button>
          {import.meta.env.DEV && (
            <button
              onClick={runDiagnostics}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold transition-colors shadow-sm"
              title="Run diagnostic to check income data and date filtering"
            >
              <Search size={20} />
              Diagnose Data
            </button>
          )}
          <button
            onClick={() => setIsUploadOpen(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Upload size={24} />
            Upload Expenses
          </button>
        </div>
      </div>

      {!includeExceptional && (
        <div className="mb-6 bg-orange-50 border-l-4 border-orange-500 p-4 rounded-r-lg">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="text-sm font-semibold text-orange-900">
                Exceptional transactions excluded
              </p>
              <p className="text-xs text-orange-700 mt-1">
                Showing only regular income and expenses. Toggle above to include one-time transactions.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Income/Expense/Balance Cards */}
      {isLoading ? (
        <div className="animate-pulse grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-40 bg-gray-200 rounded-xl" />
          <div className="h-40 bg-gray-200 rounded-xl" />
          <div className="h-40 bg-gray-200 rounded-xl" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Income Card */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border-2 border-green-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">💰</span>
                  <p className="text-sm font-semibold text-green-700 uppercase tracking-wide">
                    Total Income
                  </p>
                </div>
                <p className="text-3xl font-bold text-green-900 mb-2">
                  {formatAmount(incomeTotal)}
                </p>
                <p className="text-xs text-green-600">
                  {incomeCount} transaction{incomeCount !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center text-2xl shadow-lg">
                💵
              </div>
            </div>
          </div>
          
          {/* Expense Card */}
          <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl p-6 border-2 border-red-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">💸</span>
                  <p className="text-sm font-semibold text-red-700 uppercase tracking-wide">
                    Total Expenses
                  </p>
                </div>
                <p className="text-3xl font-bold text-red-900 mb-2">
                  {formatAmount(expenseTotal)}
                </p>
                <p className="text-xs text-red-600">
                  {expenseCount} transaction{expenseCount !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="w-14 h-14 bg-red-500 rounded-full flex items-center justify-center text-2xl shadow-lg">
                🛒
              </div>
            </div>
          </div>
          
          {/* Net Balance Card */}
          <div className={`rounded-xl p-6 border-2 shadow-sm hover:shadow-md transition-shadow ${
            netBalance >= 0 
              ? 'bg-gradient-to-br from-blue-50 to-sky-50 border-blue-200' 
              : 'bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200'
          }`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">{netBalance >= 0 ? '📈' : '📉'}</span>
                  <p className={`text-sm font-semibold uppercase tracking-wide ${
                    netBalance >= 0 ? 'text-blue-700' : 'text-orange-700'
                  }`}>
                    Net Balance
                  </p>
                </div>
                <p className={`text-3xl font-bold mb-2 ${
                  netBalance >= 0 ? 'text-blue-900' : 'text-orange-900'
                }`}>
                  {netBalance >= 0 ? '+' : ''}{formatAmount(Math.abs(netBalance))}
                </p>
                <p className={`text-xs font-medium ${
                  netBalance >= 0 ? 'text-blue-600' : 'text-orange-600'
                }`}>
                  {netBalance >= 0 
                    ? `Surplus: ${((netBalance / (incomeTotal || 1)) * 100).toFixed(1)}% saved`
                    : `Deficit: ${Math.abs((netBalance / (incomeTotal || 1)) * 100).toFixed(1)}% overspent`
                  }
                </p>
              </div>
              <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-lg ${
                netBalance >= 0 ? 'bg-blue-500' : 'bg-orange-500'
              }`}>
                {netBalance >= 0 ? '✅' : '⚠️'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && expenses.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
          <Wallet className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions yet</h3>
          <p className="text-gray-600 mb-4">Add your first transaction or upload a CSV file</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => setShowAddModal(true)} className="btn-secondary flex items-center gap-2">
              <Plus size={20} />
              Add Manually
            </button>
            <button onClick={() => setIsUploadOpen(true)} className="btn-primary flex items-center gap-2">
              <Upload size={20} />
              Upload File
            </button>
          </div>
        </div>
      )}

      {/* Category Filter Pills - Expenses Only */}
      {expenses.length > 0 && categoryData.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Expense Breakdown by Category</h2>
          <div className="flex flex-wrap gap-3">
          {categoryData.map((item) => (
            <button
              key={item.name}
              onClick={() => handleCategoryPillClick(item.name)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === item.name
                  ? 'bg-teal text-white shadow-sm'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200 hover:border-teal-300'
              }`}
            >
              <span className="font-medium">{item.name}</span>
              <span className={`ml-2 ${selectedCategory === item.name ? 'text-white' : 'text-teal-600'}`}>
                {formatAmount(item.value)}
              </span>
            </button>
          ))}
          </div>
        </div>
      )}

      {/* Charts and Transactions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        {isLoading ? (
          <div className="card animate-pulse h-[420px]" />
        ) : categoryData.length > 0 ? (
          <PieChartComponent
            data={categoryData}
            selectedCategory={selectedCategory}
            onCategoryClick={handleCategoryClick}
          />
        ) : (
          <div className="card">
            <p className="text-sm text-gray-600">No expenses found for this range.</p>
          </div>
        )}

        {/* Recent Transactions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Latest Activity</h2>
              <p className="text-sm text-gray-600">Recent transactions</p>
            </div>
            <button
              onClick={() => navigate('/tagging')}
              className="text-sm text-teal-600 hover:text-teal-700 font-medium"
            >
              View All →
            </button>
          </div>
          
          <div className="divide-y divide-gray-100">
            {isLoading ? (
              <div className="px-6 py-12 text-center">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
                </div>
              </div>
            ) : sortedTransactions.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-500">
                <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p>No transactions yet</p>
              </div>
            ) : (
              sortedTransactions.slice(0, 10).map((expense) => (
                <div
                  key={expense.id}
                  className="px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => navigate('/tagging')}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      {/* Merchant Name with Income Badge */}
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 truncate" dir="rtl">
                          {expense.merchant}
                        </span>
                        
                        {/* Income Badge */}
                        {expense.transaction_type === 'income' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                            💰 INCOME
                          </span>
                        )}
                      </div>
                      
                      {/* Date and Category */}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">
                          {formatDateDisplay(expense.transaction_date)}
                        </span>
                        
                        {expense.main_category && (
                          <>
                            <span className="text-gray-300">•</span>
                            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full">
                              {expense.main_category}
                            </span>
                          </>
                        )}
                        
                        {expense.sub_category && (
                          <span className="text-xs text-gray-500">
                            {expense.sub_category}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Amount */}
                    <div className="ml-4 flex-shrink-0 text-right">
                      <div className={`text-sm font-semibold ${
                        expense.transaction_type === 'income' ? 'text-green-600' : 'text-gray-900'
                      }`}>
                        {expense.transaction_type === 'income' ? '+' : ''}₪{expense.amount.toLocaleString('he-IL', { 
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </div>
                      
                      {/* Exceptional badge */}
                      {expense.is_exceptional && (
                        <span className="inline-block mt-1 text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">
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
        <div className="border border-red-200 bg-red-50 rounded-lg p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Upload Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-4xl max-h-[85vh] bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col">
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
          // Show success toast
          setSuccessToast(counts)
          setTimeout(() => setSuccessToast(null), 5000)
          
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
