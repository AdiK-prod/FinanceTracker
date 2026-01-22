import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { mainCategories, subCategories } from '../data/sampleExpenses'

const ExpenseTable = ({ expenses, onUpdateExpense, onBulkUpdate, isLoading }) => {
  const [selectedRows, setSelectedRows] = useState(new Set())

  const handleCategoryChange = (id, field, value) => {
    if (!onUpdateExpense) return
    if (field === 'main_category') {
      onUpdateExpense(id, { main_category: value, sub_category: '' })
      return
    }
    onUpdateExpense(id, { [field]: value })
  }

  const toggleRowSelection = (id) => {
    const newSelected = new Set(selectedRows)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedRows(newSelected)
  }

  const handleBulkCategoryChange = (field, value) => {
    if (selectedRows.size === 0 || !onBulkUpdate) return
    onBulkUpdate(Array.from(selectedRows), field, value)
    setSelectedRows(new Set())
  }

  return (
    <div className="space-y-4">
      {/* Bulk Actions */}
      {selectedRows.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between shadow-sm">
          <span className="text-blue-800 font-medium">
            {selectedRows.size} row{selectedRows.size > 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
            <select
              onChange={(e) => handleBulkCategoryChange('main_category', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
            >
              <option value="">Bulk set Main Category</option>
              {mainCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <button
              onClick={() => setSelectedRows(new Set())}
              className="btn-secondary text-sm"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card card-hover overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === expenses.length && expenses.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedRows(new Set(expenses.map(e => e.id)))
                      } else {
                        setSelectedRows(new Set())
                      }
                    }}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Merchant
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Main Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Sub Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12">
                    <div className="h-8 w-full rounded bg-gray-100 animate-pulse" />
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12">
                    <p className="text-sm text-gray-500">No expenses found.</p>
                  </td>
                </tr>
              ) : (
                expenses.map((expense, index) => {
                const needsAttention = !expense.main_category
                const rowBackground = needsAttention ? 'bg-yellow-50' : (index % 2 === 1 ? 'bg-gray-50/50' : '')
                return (
                  <tr
                    key={expense.id}
                    className={`transition-all duration-300 ease-in-out hover:bg-gray-50 ${rowBackground}`}
                  >
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(expense.id)}
                        onChange={() => toggleRowSelection(expense.id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(expense.transaction_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {expense.merchant}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${expense.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={expense.main_category || ''}
                        onChange={(e) => handleCategoryChange(expense.id, 'main_category', e.target.value)}
                        className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
                      >
                        <option value="">Select...</option>
                        {mainCategories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={expense.sub_category || ''}
                        onChange={(e) => handleCategoryChange(expense.id, 'sub_category', e.target.value)}
                        disabled={!expense.main_category}
                        className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent disabled:bg-gray-100 disabled:text-gray-400"
                      >
                        <option value="">Select...</option>
                        {expense.main_category && subCategories[expense.main_category]?.map(sub => (
                          <option key={sub} value={sub}>{sub}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {expense.is_auto_tagged ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-medium">
                          <CheckCircle2 size={14} />
                          Auto-tagged
                        </span>
                      ) : expense.main_category ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-800 rounded-full text-xs font-medium">
                          <CheckCircle2 size={14} />
                          Tagged
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                          Needs Input
                        </span>
                      )}
                    </td>
                  </tr>
                )
              }))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default ExpenseTable
