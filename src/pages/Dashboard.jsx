import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, X, Wallet, Receipt, TrendingUp, Star } from 'lucide-react'
import PieChartComponent from '../components/PieChart'
import DateRangePicker from '../components/DateRangePicker'
import UploadZone from '../components/UploadZone'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { formatDateDisplay, formatDateRangeDisplay, formatDateForDB } from '../utils/dateFormatters'

const Dashboard = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [isUploadOpen, setIsUploadOpen] = useState(false)
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

  useEffect(() => {
    const fetchExpenses = async () => {
      setIsLoading(true)
      setError('')
      const from = dateRange?.from ? formatDateForDB(dateRange.from) : null
      const to = dateRange?.to ? formatDateForDB(dateRange.to) : null

      let query = supabase
        .from('expenses')
        .select('id, transaction_date, merchant, amount, main_category, sub_category, user_id, is_auto_tagged, is_exceptional')
        .order('transaction_date', { ascending: false })

      if (from) query = query.gte('transaction_date', from)
      if (to) query = query.lte('transaction_date', to)
      if (!includeExceptional) query = query.eq('is_exceptional', false)

      const { data, error: fetchError } = await query
      if (fetchError) {
        setError(fetchError.message)
        setExpenses([])
      } else {
        setExpenses(data || [])
      }
      setIsLoading(false)
    }

    fetchExpenses()
  }, [dateRange, includeExceptional])

  // Calculate total spending
  const totalSpending = useMemo(() => {
    return expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0)
  }, [expenses])

  const formatAmount = (amount) =>
    `₪${amount.toLocaleString('he-IL', { minimumFractionDigits: 2 })}`

  const transactionCount = expenses.length
  const averageAmount = transactionCount ? totalSpending / transactionCount : 0

  // Group expenses by category for pie chart
  const categoryData = useMemo(() => {
    const grouped = {}
    expenses.forEach(exp => {
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

  const handleUpload = async (rows) => {
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
            onClick={() => setIsUploadOpen(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Upload size={24} />
            Upload Expenses
          </button>
        </div>
      </div>

      {!includeExceptional && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-center gap-3">
          <Star className="w-5 h-5 text-orange-600" />
          <p className="text-sm text-orange-900">
            Exceptional expenses are excluded from totals and charts.
          </p>
        </div>
      )}

      {/* Stats Cards */}
      {isLoading ? (
        <div className="animate-pulse grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-28 bg-gray-200 rounded-xl" />
          <div className="h-28 bg-gray-200 rounded-xl" />
          <div className="h-28 bg-gray-200 rounded-xl" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Total Spending</span>
              <Wallet className="w-5 h-5 text-teal" />
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {formatAmount(totalSpending)}
            </div>
            <div className="text-sm text-gray-500">
              {formatDateRangeDisplay(dateRange?.from, dateRange?.to)}
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Transactions</span>
              <Receipt className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {transactionCount}
            </div>
            <div className="text-sm text-gray-500">Total expenses tracked</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Average</span>
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {formatAmount(averageAmount)}
            </div>
            <div className="text-sm text-gray-500">Per transaction</div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && expenses.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
          <Wallet className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No expenses yet</h3>
          <p className="text-gray-600 mb-4">Upload your first CSV to get started</p>
          <button onClick={() => setIsUploadOpen(true)} className="btn-primary">
            Upload Expenses
          </button>
        </div>
      )}

      {/* Category Filter Pills */}
      {expenses.length > 0 && (
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
                      {/* Merchant Name - RTL for Hebrew */}
                      <div className="text-sm font-medium text-gray-900 truncate" dir="rtl">
                        {expense.merchant}
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
                      <div className="text-sm font-semibold text-gray-900">
                        ₪{expense.amount.toLocaleString('he-IL', { 
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
    </div>
  )
}

export default Dashboard
