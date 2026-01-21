import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import PieChartComponent from '../components/PieChart'
import TransactionList from '../components/TransactionList'
import { sampleExpenses } from '../data/sampleExpenses'

const Dashboard = () => {
  const navigate = useNavigate()
  const [selectedMonth, setSelectedMonth] = useState('2025-01')
  const [selectedCategory, setSelectedCategory] = useState(null)

  // Generate month options (last 6 months)
  const monthOptions = useMemo(() => {
    const months = []
    const currentDate = new Date('2025-01-15')
    for (let i = 0; i < 6; i++) {
      const date = new Date(currentDate)
      date.setMonth(currentDate.getMonth() - i)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      months.push({
        value: `${year}-${month}`,
        label: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      })
    }
    return months
  }, [])

  // Filter expenses by selected month
  const filteredExpenses = useMemo(() => {
    return sampleExpenses.filter(exp => {
      const expenseDate = new Date(exp.date)
      const expenseMonth = `${expenseDate.getFullYear()}-${String(expenseDate.getMonth() + 1).padStart(2, '0')}`
      return expenseMonth === selectedMonth
    })
  }, [selectedMonth])

  // Calculate total spending
  const totalSpending = useMemo(() => {
    return filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0)
  }, [filteredExpenses])

  // Group expenses by category for pie chart
  const categoryData = useMemo(() => {
    const grouped = {}
    filteredExpenses.forEach(exp => {
      const category = exp.mainCategory || 'Uncategorized'
      grouped[category] = (grouped[category] || 0) + exp.amount
    })
    return Object.entries(grouped).map(([name, value]) => ({ name, value }))
  }, [filteredExpenses])

  // Sort transactions by date (most recent first)
  const sortedTransactions = useMemo(() => {
    return [...filteredExpenses].sort((a, b) => new Date(b.date) - new Date(a.date))
  }, [filteredExpenses])

  const handleCategoryClick = (categoryName) => {
    setSelectedCategory(selectedCategory === categoryName ? null : categoryName)
  }

  const handleCategoryPillClick = (categoryName) => {
    navigate('/detailed', { state: { category: categoryName } })
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Overview of your household spending</p>
        </div>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
        >
          {monthOptions.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>

      {/* Hero Section - Total Monthly Spending */}
      <div className="bg-gradient-to-r from-teal to-teal/80 rounded-lg shadow-sm p-8 text-white">
        <p className="text-teal-100 mb-2">Total Spending</p>
        <p className="text-5xl font-bold">${totalSpending.toFixed(2)}</p>
        <p className="text-teal-100 mt-2">{monthOptions.find(m => m.value === selectedMonth)?.label}</p>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap gap-2">
        {categoryData.map((item) => (
          <button
            key={item.name}
            onClick={() => handleCategoryPillClick(item.name)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
              selectedCategory === item.name
                ? 'bg-teal text-white'
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
        <PieChartComponent
          data={categoryData}
          selectedCategory={selectedCategory}
          onCategoryClick={handleCategoryClick}
        />

        {/* Recent Transactions */}
        <TransactionList transactions={sortedTransactions} limit={10} />
      </div>
    </div>
  )
}

export default Dashboard
