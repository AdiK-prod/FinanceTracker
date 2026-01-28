import { useState } from 'react'
import { CheckCircle2, Star, ArrowUpDown, ArrowUp, ArrowDown, Trash2, Check, X, Edit2 } from 'lucide-react'
import { formatDateDisplay } from '../utils/dateFormatters'
import { supabase } from '../lib/supabase'

const ExpenseTable = ({
  expenses,
  onUpdateExpense,
  onBulkUpdate,
  onToggleExceptional,
  onDeleteExpense,
  onBulkDelete,
  isLoading,
  mainCategories = [],
  subCategories = {},
}) => {
  const [selectedRows, setSelectedRows] = useState(new Set())
  const [bulkMainCategory, setBulkMainCategory] = useState('')
  const [bulkSubCategory, setBulkSubCategory] = useState('')
  const [editingMerchant, setEditingMerchant] = useState(null) // { id, value }
  const [sortConfig, setSortConfig] = useState({
    key: 'transaction_date',
    direction: 'desc',
  })

  const handleCategoryChange = (id, field, value) => {
    if (!onUpdateExpense) return
    if (field === 'main_category') {
      onUpdateExpense(id, { main_category: value, sub_category: '' })
      return
    }
    onUpdateExpense(id, { [field]: value })
  }

  // Update transaction type
  const handleTypeChange = async (id, newType) => {
    if (!onUpdateExpense) return
    
    const updates = {
      transaction_type: newType,
      is_auto_tagged: false
    }
    
    // If changing to income, clear categories
    if (newType === 'income') {
      updates.main_category = null
      updates.sub_category = null
    }
    
    onUpdateExpense(id, updates)
  }

  // Update merchant name
  const handleMerchantUpdate = async (id, newMerchant) => {
    if (!newMerchant || newMerchant.trim() === '') {
      alert('Merchant name cannot be empty')
      return false
    }
    
    if (!onUpdateExpense) return false
    
    onUpdateExpense(id, { merchant: newMerchant.trim() })
    setEditingMerchant(null)
    return true
  }

  // Bulk convert transaction type
  const handleBulkTypeConversion = async (newType) => {
    if (selectedRows.size === 0 || !onBulkUpdate) return
    
    const confirmMsg = `Convert ${selectedRows.size} transaction${selectedRows.size !== 1 ? 's' : ''} to ${newType === 'income' ? 'Income' : 'Expense'}?${
      newType === 'income' ? '\n\nNote: Category assignments will be removed.' : ''
    }`
    
    if (!window.confirm(confirmMsg)) return
    
    const updates = {
      transaction_type: newType,
      is_auto_tagged: false
    }
    
    // If converting to income, clear categories
    if (newType === 'income') {
      updates.main_category = null
      updates.sub_category = null
    }
    
    onBulkUpdate(Array.from(selectedRows), 'transaction_type', updates)
    setSelectedRows(new Set())
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

  const handleApplyBulkCategories = () => {
    if (selectedRows.size === 0 || !onBulkUpdate || !bulkMainCategory) return
    onBulkUpdate(Array.from(selectedRows), 'bulk', {
      main_category: bulkMainCategory,
      sub_category: bulkSubCategory,
    })
    setSelectedRows(new Set())
    setBulkMainCategory('')
    setBulkSubCategory('')
  }

  const formatAmount = (amount) =>
    `₪${amount.toLocaleString('he-IL', { minimumFractionDigits: 2 })}`

  const sortedExpenses = [...expenses].sort((a, b) => {
    if (!sortConfig.key) return 0
    const aValue = a[sortConfig.key]
    const bValue = b[sortConfig.key]

    if (aValue === null || aValue === undefined) return 1
    if (bValue === null || bValue === undefined) return -1

    let comparison = 0
    switch (sortConfig.key) {
      case 'transaction_date':
        comparison = new Date(aValue) - new Date(bValue)
        break
      case 'amount':
        comparison = parseFloat(aValue) - parseFloat(bValue)
        break
      case 'merchant':
      case 'main_category':
      case 'sub_category':
        comparison = aValue.toString().localeCompare(bValue.toString(), 'he')
        break
      default:
        comparison = 0
    }

    return sortConfig.direction === 'asc' ? comparison : -comparison
  })

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      }
      return { key, direction: key === 'transaction_date' ? 'desc' : 'asc' }
    })
  }

  const SortableHeader = ({ columnKey, children }) => {
    const isActive = sortConfig.key === columnKey
    const direction = sortConfig.direction

    return (
      <th
        onClick={() => handleSort(columnKey)}
        className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none group"
      >
        <div className="flex items-center gap-2">
          <span>{children}</span>
          {isActive ? (
            direction === 'asc' ? (
              <ArrowUp className="w-4 h-4 text-teal" />
            ) : (
              <ArrowDown className="w-4 h-4 text-teal" />
            )
          ) : (
            <ArrowUpDown className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
      </th>
    )
  }

  return (
    <div className="space-y-4">
      {/* Bulk Actions */}
      {selectedRows.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 shadow-sm">
          <span className="text-blue-800 font-medium">
            {selectedRows.size} row{selectedRows.size > 1 ? 's' : ''} selected
          </span>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <select
              value={bulkMainCategory}
              onChange={(e) => {
                setBulkMainCategory(e.target.value)
                setBulkSubCategory('')
              }}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
            >
              <option value="">Bulk set Main Category</option>
              {mainCategories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <select
              value={bulkSubCategory}
              onChange={(e) => setBulkSubCategory(e.target.value)}
              disabled={!bulkMainCategory}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white disabled:bg-gray-100"
            >
              <option value="">Bulk set Sub Category</option>
              {(subCategories[bulkMainCategory] || []).map((sub) => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
            <button
              onClick={handleApplyBulkCategories}
              disabled={!bulkMainCategory}
              className="btn-primary text-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Apply to {selectedRows.size}
            </button>
            
            {/* Type Conversion Buttons */}
            <div className="h-8 w-px bg-gray-300"></div>
            <button
              onClick={() => handleBulkTypeConversion('expense')}
              className="px-3 py-2 text-sm border-2 border-red-600 text-red-700 rounded-md hover:bg-red-50 font-semibold"
              title="Convert selected transactions to expenses"
            >
              💸 Mark as Expense
            </button>
            <button
              onClick={() => handleBulkTypeConversion('income')}
              className="px-3 py-2 text-sm border-2 border-green-600 text-green-700 rounded-md hover:bg-green-50 font-semibold"
              title="Convert selected transactions to income"
            >
              💰 Mark as Income
            </button>
            
            <div className="h-8 w-px bg-gray-300"></div>
            <button
              onClick={() => handleBulkCategoryChange('is_exceptional', true)}
              className="px-3 py-2 text-sm border border-orange-300 text-orange-700 rounded-md hover:bg-orange-50"
            >
              Mark Exceptional
            </button>
            <button
              onClick={() => handleBulkCategoryChange('is_exceptional', false)}
              className="px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Mark Regular
            </button>
            <button
              onClick={() => onBulkDelete?.(Array.from(selectedRows))}
              className="px-3 py-2 text-sm border border-red-300 text-red-700 rounded-md hover:bg-red-50 flex items-center gap-1"
            >
              <Trash2 className="w-4 h-4" />
              Delete Selected
            </button>
            <button
              onClick={() => {
                setSelectedRows(new Set())
                setBulkMainCategory('')
                setBulkSubCategory('')
              }}
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
                <SortableHeader columnKey="transaction_date">Date</SortableHeader>
                <SortableHeader columnKey="merchant">Merchant</SortableHeader>
                <SortableHeader columnKey="amount">Amount</SortableHeader>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Type
                </th>
                <SortableHeader columnKey="main_category">Main Category</SortableHeader>
                <SortableHeader columnKey="sub_category">Sub Category</SortableHeader>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Exceptional
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12">
                    <div className="h-8 w-full rounded bg-gray-100 animate-pulse" />
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12">
                    <p className="text-sm text-gray-500">No expenses found.</p>
                  </td>
                </tr>
              ) : (
                sortedExpenses.map((expense, index) => {
                const isIncome = expense.transaction_type === 'income'
                const isEditing = editingMerchant?.id === expense.id
                const needsAttention = !expense.main_category && !isIncome
                const rowBackground = isIncome 
                  ? 'bg-green-50/30' 
                  : needsAttention 
                    ? 'bg-yellow-50' 
                    : (index % 2 === 1 ? 'bg-gray-50/50' : '')
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
                      {formatDateDisplay(expense.transaction_date)}
                    </td>
                    
                    {/* Merchant - Editable */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editingMerchant.value}
                            onChange={(e) => setEditingMerchant({ ...editingMerchant, value: e.target.value })}
                            className="px-2 py-1 border-2 border-teal-500 rounded text-sm w-full focus:outline-none focus:ring-2 focus:ring-teal"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleMerchantUpdate(expense.id, editingMerchant.value)
                              } else if (e.key === 'Escape') {
                                setEditingMerchant(null)
                              }
                            }}
                          />
                          <button
                            onClick={() => handleMerchantUpdate(expense.id, editingMerchant.value)}
                            className="p-1 text-green-600 hover:text-green-700"
                            title="Save"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingMerchant(null)}
                            className="p-1 text-gray-600 hover:text-gray-700"
                            title="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 group">
                          <span className="text-sm font-medium text-gray-900">
                            {expense.merchant}
                          </span>
                          <button
                            onClick={() => setEditingMerchant({ id: expense.id, value: expense.merchant })}
                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-teal-600 transition-opacity"
                            title="Edit merchant name"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </td>
                    
                    {/* Amount */}
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className={`text-sm font-semibold ${
                        isIncome ? 'text-green-600' : 'text-gray-900'
                      }`}>
                        {isIncome ? '+' : ''}₪{expense.amount.toLocaleString('he-IL', { 
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2 
                        })}
                      </span>
                    </td>
                    
                    {/* Type - Toggle Button */}
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => handleTypeChange(expense.id, isIncome ? 'expense' : 'income')}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                          isIncome
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-red-100 text-red-700 hover:bg-red-200'
                        }`}
                        title={`Change to ${isIncome ? 'Expense' : 'Income'}`}
                      >
                        {isIncome ? '💰 Income' : '💸 Expense'}
                      </button>
                    </td>
                    
                    {/* Main Category */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isIncome ? (
                        <span className="text-xs text-gray-400 italic">N/A</span>
                      ) : (
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
                      )}
                    </td>
                    
                    {/* Sub Category */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isIncome ? (
                        <span className="text-xs text-gray-400 italic">N/A</span>
                      ) : (
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
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => onToggleExceptional?.(expense.id, !expense.is_exceptional)}
                        className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full transition-colors ${
                          expense.is_exceptional
                            ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                        title={expense.is_exceptional ? 'Mark as regular' : 'Mark as exceptional'}
                      >
                        {expense.is_exceptional ? (
                          <>
                            <Star className="w-3 h-3 inline mr-1" />
                            Exceptional
                          </>
                        ) : (
                          'Regular'
                        )}
                      </button>
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
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => onDeleteExpense?.(expense.id, expense.merchant)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete expense"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                )
              }))}
            </tbody>
          </table>
        </div>
      </div>
      {sortConfig.key && (
        <div className="text-sm text-gray-600 flex items-center gap-2">
          <span>
            Sorted by: <span className="font-semibold text-gray-800">{sortConfig.key.replace('_', ' ')}</span>
          </span>
          <span className="text-gray-400">•</span>
          <span>{sortConfig.direction === 'asc' ? 'Ascending' : 'Descending'}</span>
        </div>
      )}
    </div>
  )
}

export default ExpenseTable
