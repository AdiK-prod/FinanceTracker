import { useState, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Download, Search } from 'lucide-react'
import BarChartComponent from '../components/BarChart'
import { sampleExpenses } from '../data/sampleExpenses'

const Detailed = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const selectedCategory = location.state?.category || 'Groceries'

  const [searchQuery, setSearchQuery] = useState('')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [amountRange, setAmountRange] = useState({ min: 0, max: 1000 })

  // Filter expenses by selected category
  const categoryExpenses = useMemo(() => {
    return sampleExpenses.filter(exp => exp.mainCategory === selectedCategory)
  }, [selectedCategory])

  // Group by sub-category for bar chart
  const subCategoryData = useMemo(() => {
    const grouped = {}
    categoryExpenses.forEach(exp => {
      const subCat = exp.subCategory || 'Uncategorized'
      grouped[subCat] = (grouped[subCat] || 0) + exp.amount
    })
    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [categoryExpenses])

  // Filter transactions based on search, date range, and amount range
  const filteredTransactions = useMemo(() => {
    let filtered = [...categoryExpenses]

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(exp =>
        exp.merchant.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Date range filter
    if (dateRange.start) {
      filtered = filtered.filter(exp => new Date(exp.date) >= new Date(dateRange.start))
    }
    if (dateRange.end) {
      filtered = filtered.filter(exp => new Date(exp.date) <= new Date(dateRange.end))
    }

    // Amount range filter
    filtered = filtered.filter(exp =>
      exp.amount >= amountRange.min && exp.amount <= amountRange.max
    )

    // Sort by date (most recent first)
    return filtered.sort((a, b) => new Date(b.date) - new Date(a.date))
  }, [categoryExpenses, searchQuery, dateRange, amountRange])

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
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-700" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{selectedCategory}</h1>
            <p className="text-gray-600 mt-1">
              {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''} • ${totalAmount.toFixed(2)} total
            </p>
          </div>
        </div>
        <button
          onClick={(e) => e.preventDefault()}
          className="px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2 text-gray-700 transition-all duration-200"
        >
          <Download size={18} />
          Export CSV
        </button>
      </div>

      {/* Bar Chart */}
      <BarChartComponent data={subCategoryData} />

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
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
          <label className="block text-sm font-medium text-gray-700 mb-2">
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
              className="flex-1"
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
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">All Transactions</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {filteredTransactions.length > 0 ? (
            filteredTransactions.map((transaction) => (
              <div key={transaction.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <p className="font-medium text-gray-900">{transaction.merchant}</p>
                      {transaction.subCategory && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                          {transaction.subCategory}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {new Date(transaction.date).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">${transaction.amount.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="px-6 py-12 text-center text-gray-500">
              No transactions found matching your filters.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Detailed
