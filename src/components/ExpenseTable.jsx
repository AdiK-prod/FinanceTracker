import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { sampleExpenses, mainCategories, subCategories } from '../data/sampleExpenses'

const ExpenseTable = () => {
  const [expenses, setExpenses] = useState(sampleExpenses)
  const [selectedRows, setSelectedRows] = useState(new Set())

  const handleCategoryChange = (id, field, value) => {
    setExpenses(expenses.map(exp => {
      if (exp.id === id) {
        // If main category changes, reset sub-category
        if (field === 'mainCategory') {
          return { ...exp, [field]: value, subCategory: '' }
        }
        return { ...exp, [field]: value }
      }
      return exp
    }))
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
    if (selectedRows.size === 0) return
    setExpenses(expenses.map(exp => 
      selectedRows.has(exp.id)
        ? field === 'mainCategory'
          ? { ...exp, [field]: value, subCategory: '' }
          : { ...exp, [field]: value }
        : exp
    ))
    setSelectedRows(new Set())
  }

  return (
    <div className="space-y-4">
      {/* Bulk Actions */}
      {selectedRows.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <span className="text-blue-800 font-medium">
            {selectedRows.size} row{selectedRows.size > 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
            <select
              onChange={(e) => handleBulkCategoryChange('mainCategory', e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            >
              <option value="">Bulk set Main Category</option>
              {mainCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <button
              onClick={() => setSelectedRows(new Set())}
              className="px-4 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm transition-all duration-200"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
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
              {expenses.map((expense) => {
                const needsAttention = !expense.autoTagged || !expense.mainCategory
                return (
                  <tr
                    key={expense.id}
                    className={`hover:bg-gray-50 transition-colors ${
                      needsAttention ? 'bg-yellow-50' : ''
                    }`}
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
                      {new Date(expense.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {expense.merchant}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${expense.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={expense.mainCategory || ''}
                        onChange={(e) => handleCategoryChange(expense.id, 'mainCategory', e.target.value)}
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
                        value={expense.subCategory || ''}
                        onChange={(e) => handleCategoryChange(expense.id, 'subCategory', e.target.value)}
                        disabled={!expense.mainCategory}
                        className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent disabled:bg-gray-100 disabled:text-gray-400"
                      >
                        <option value="">Select...</option>
                        {expense.mainCategory && subCategories[expense.mainCategory]?.map(sub => (
                          <option key={sub} value={sub}>{sub}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {expense.autoTagged ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                          <CheckCircle2 size={14} />
                          Auto-tagged
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                          Needs Input
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default ExpenseTable
