import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, X } from 'lucide-react'
import PieChartComponent from '../components/PieChart'
import TransactionList from '../components/TransactionList'
import DateRangePicker from '../components/DateRangePicker'
import UploadZone from '../components/UploadZone'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const Dashboard = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [dateRange, setDateRange] = useState({
    from: new Date('2025-01-01'),
    to: new Date('2025-01-31'),
  })
  const [expenses, setExpenses] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchExpenses = async () => {
      setIsLoading(true)
      setError('')
      const from = dateRange?.from ? dateRange.from.toISOString().slice(0, 10) : null
      const to = dateRange?.to ? dateRange.to.toISOString().slice(0, 10) : null

      let query = supabase
        .from('expenses')
        .select('id, transaction_date, merchant, amount, main_category, sub_category, user_id, is_auto_tagged')
        .order('transaction_date', { ascending: false })

      if (from) query = query.gte('transaction_date', from)
      if (to) query = query.lte('transaction_date', to)

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
  }, [dateRange])

  // Calculate total spending
  const totalSpending = useMemo(() => {
    return expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0)
  }, [expenses])

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
      transaction_date: row.date.toISOString().slice(0, 10),
      merchant: row.merchant,
      amount: row.amount,
      main_category: row.main_category || null,
      sub_category: row.sub_category || null,
      is_auto_tagged: row.is_auto_tagged || false,
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-sm font-medium text-gray-600">Overview of your household spending</p>
        </div>
        <div className="flex items-center gap-3">
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
            baseDate={new Date('2025-01-15')}
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

      {/* Hero Section - Total Monthly Spending */}
      <div className="card card-hover bg-gradient-to-r from-teal-50 to-blue-50">
        <p className="text-sm font-medium text-gray-600 mb-2">Total Spending</p>
        <p className="text-4xl font-bold text-gray-900">${totalSpending.toFixed(2)}</p>
        <p className="text-sm font-medium text-gray-600 mt-2">
          {dateRange?.from && dateRange?.to
            ? `${dateRange.from.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${dateRange.to.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
            : 'All dates'}
        </p>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap gap-2">
        {categoryData.map((item) => (
          <button
            key={item.name}
            onClick={() => handleCategoryPillClick(item.name)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ease-in-out hover:scale-105 ${
              selectedCategory === item.name
                ? 'bg-teal text-white shadow-sm'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            {item.name} (${item.value.toFixed(2)})
          </button>
        ))}
      </div>

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
        <TransactionList transactions={sortedTransactions} limit={10} isLoading={isLoading} />
      </div>

      {error && (
        <div className="border border-red-200 bg-red-50 rounded-lg p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Upload Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
          <div className="w-full max-w-3xl card card-hover">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Upload Expenses</p>
                <h2 className="text-xl font-semibold text-gray-900">Import your latest statements</h2>
              </div>
              <button
                onClick={() => setIsUploadOpen(false)}
                className="p-2 rounded-md hover:bg-gray-100 transition-all duration-300 ease-in-out"
              >
                <X size={20} className="text-gray-600" />
              </button>
            </div>
            <UploadZone onConfirmUpload={handleUpload} />
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard
