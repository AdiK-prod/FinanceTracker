import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Download, Search, Filter } from 'lucide-react'
import BarChartComponent from '../components/BarChart'
import { supabase } from '../lib/supabase'

const Detailed = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const selectedCategory = location.state?.category || 'Groceries'

  const [searchQuery, setSearchQuery] = useState('')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [amountRange, setAmountRange] = useState({ min: 0, max: 1000 })
  const [expenses, setExpenses] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchExpenses = async () => {
      setIsLoading(true)
      setError('')
      const { data, error: fetchError } = await supabase
        .from('expenses')
        .select('id, transaction_date, merchant, amount, main_category, sub_category, profiles(full_name, email)')
        .eq('main_category', selectedCategory)
        .order('transaction_date', { ascending: false })

      if (fetchError) {
        setError(fetchError.message)
        setExpenses([])
      } else {
        setExpenses(data || [])
      }
      setIsLoading(false)
    }

    fetchExpenses()
  }, [selectedCategory])

  // Group by sub-category for bar chart
  const subCategoryData = useMemo(() => {
    const grouped = {}
    expenses.forEach(exp => {
      const subCat = exp.sub_category || 'Uncategorized'
      grouped[subCat] = (grouped[subCat] || 0) + exp.amount
    })
    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [expenses])

  // Filter transactions based on search, date range, and amount range
  const filteredTransactions = useMemo(() => {
    let filtered = [...expenses]

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(exp =>
        exp.merchant.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Date range filter
    if (dateRange.start) {
      filtered = filtered.filter(exp => new Date(exp.transaction_date) >= new Date(dateRange.start))
    }
    if (dateRange.end) {
      filtered = filtered.filter(exp => new Date(exp.transaction_date) <= new Date(dateRange.end))
    }

    // Amount range filter
    filtered = filtered.filter(exp =>
      exp.amount >= amountRange.min && exp.amount <= amountRange.max
    )

    // Sort by date (most recent first)
    return filtered.sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date))
  }, [expenses, searchQuery, dateRange, amountRange])

  const totalAmount = useMemo(() => {
    return filteredTransactions.reduce((sum, exp) => sum + exp.amount, 0)
  }, [filteredTransactions])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-gray-100 rounded-md transition-all duration-300 ease-in-out"
          >
            <ArrowLeft size={20} className="text-gray-700" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{selectedCategory}</h1>
            <p className="text-sm font-medium text-gray-600 mt-1">
              {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''} • ${totalAmount.toFixed(2)} total
            </p>
          </div>
        </div>
        <button
          onClick={(e) => e.preventDefault()}
          className="btn-secondary flex items-center gap-2"
        >
          <Download size={24} />
          Export CSV
        </button>
      </div>

      {/* Bar Chart */}
      {isLoading ? (
        <div className="card animate-pulse h-[360px]" />
      ) : (
        <BarChartComponent data={subCategoryData} />
      )}

      {/* Filters */}
      <div className="card card-hover">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-50">
            <Filter size={24} className="text-teal-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">Refine Results</p>
            <h3 className="text-xl font-semibold text-gray-900">Filters</h3>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">
              Search Merchant
            </label>
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search transactions..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
              />
            </div>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
            />
          </div>
        </div>

        {/* Amount Range Slider */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-600 mb-2">
            Amount Range: ${amountRange.min} - ${amountRange.max}
          </label>
          <div className="flex gap-4 items-center">
            <input
              type="range"
              min="0"
              max="1000"
              step="10"
              value={amountRange.max}
              onChange={(e) => setAmountRange({ ...amountRange, max: parseInt(e.target.value) })}
              className="flex-1 accent-teal"
            />
            <div className="flex gap-2">
              <input
                type="number"
                value={amountRange.min}
                onChange={(e) => setAmountRange({ ...amountRange, min: parseInt(e.target.value) || 0 })}
                className="w-24 px-3 py-1 border border-gray-300 rounded-md text-sm"
                placeholder="Min"
              />
              <input
                type="number"
                value={amountRange.max}
                onChange={(e) => setAmountRange({ ...amountRange, max: parseInt(e.target.value) || 1000 })}
                className="w-24 px-3 py-1 border border-gray-300 rounded-md text-sm"
                placeholder="Max"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Transaction List */}
      <div className="card card-hover overflow-hidden p-0">
        <div className="px-6 py-4 border-b border-gray-200 bg-white">
          <h3 className="text-xl font-semibold text-gray-900">All Transactions</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {isLoading ? (
            <div className="px-6 py-6">
              <div className="h-6 w-full rounded bg-gray-100 animate-pulse" />
            </div>
          ) : filteredTransactions.length > 0 ? (
            filteredTransactions.map((transaction, index) => {
              const addedBy = transaction.profiles?.full_name || transaction.profiles?.email || 'Unknown'
              return (
              <div
                key={transaction.id}
                className={`px-6 py-4 transition-all duration-300 ease-in-out hover:bg-gray-50 ${
                  index % 2 === 1 ? 'bg-gray-50/50' : 'bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <p className="font-medium text-gray-900">{transaction.merchant}</p>
                      {transaction.sub_category && (
                        <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                          {transaction.sub_category}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {new Date(transaction.transaction_date).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Added by {addedBy}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">${transaction.amount.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            )})
          ) : (
            <div className="px-6 py-12 text-center text-gray-500">
              No transactions found matching your filters.
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="border border-red-200 bg-red-50 rounded-lg p-4 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  )
}

export default Detailed
