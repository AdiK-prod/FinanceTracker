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
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSort(columnKey); } }}
        tabIndex={0}
        role="columnheader"
        aria-sort={isActive ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}
        className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none group focus:outline-none focus:ring-2 focus:ring-inset focus:ring-teal-500"
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
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl p-5 shadow-md">
          <div className="flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                  {selectedRows.size}
                </div>
                <span className="text-blue-900 font-semibold text-base">
                  {selectedRows.size} transaction{selectedRows.size > 1 ? 's' : ''} selected
                </span>
              </div>
              <button
                onClick={() => {
                  setSelectedRows(new Set())
                  setBulkMainCategory('')
                  setBulkSubCategory('')
                }}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-white/60 rounded-md transition-colors font-medium"
              >
                ✕ Clear
              </button>
            </div>

            {/* Actions Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Category Assignment */}
              <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  <span role="img" aria-hidden="true">📁</span> Assign Categories
                </div>
                <div className="space-y-2">
                  <select
                    value={bulkMainCategory}
                    onChange={(e) => {
                      setBulkMainCategory(e.target.value)
                      setBulkSubCategory('')
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Main Category</option>
                    {mainCategories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <select
                    value={bulkSubCategory}
                    onChange={(e) => setBulkSubCategory(e.target.value)}
                    disabled={!bulkMainCategory}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white disabled:bg-gray-100 disabled:cursor-not-allowed focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Sub Category</option>
                    {(subCategories[bulkMainCategory] || []).map((sub) => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleApplyBulkCategories}
                    disabled={!bulkMainCategory}
                    className="w-full px-4 py-2 bg-teal text-white rounded-md hover:bg-teal/90 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm transition-colors"
                  >
                    Apply Categories
                  </button>
                </div>
              </div>

              {/* Transaction Type */}
              <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  <span role="img" aria-hidden="true">💰</span> Transaction Type
                </div>
                <div className="space-y-2">
                  <button
                    onClick={() => handleBulkTypeConversion('expense')}
                    className="w-full px-4 py-2.5 bg-red-50 border-2 border-red-500 text-red-700 rounded-md hover:bg-red-100 font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                    title="Convert selected transactions to expenses"
                  >
                    <span role="img" aria-hidden="true">💸</span> Mark as Expense
                  </button>
                  <button
                    onClick={() => handleBulkTypeConversion('income')}
                    className="w-full px-4 py-2.5 bg-green-50 border-2 border-green-500 text-green-700 rounded-md hover:bg-green-100 font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                    title="Convert selected transactions to income"
                  >
                    <span role="img" aria-hidden="true">💰</span> Mark as Income
                  </button>
                </div>
              </div>

              {/* Other Actions */}
              <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  <span role="img" aria-hidden="true">⚡</span> Quick Actions
                </div>
                <div className="space-y-2">
                  <button
                    onClick={() => handleBulkCategoryChange('is_exceptional', true)}
                    className="w-full px-4 py-2 bg-orange-50 border border-orange-400 text-orange-700 rounded-md hover:bg-orange-100 text-sm font-medium transition-colors"
                  >
                    ⭐ Mark Exceptional
                  </button>
                  <button
                    onClick={() => handleBulkCategoryChange('is_exceptional', false)}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-400 text-gray-700 rounded-md hover:bg-gray-100 text-sm font-medium transition-colors"
                  >
                    ✓ Mark Regular
                  </button>
                  <button
                    onClick={() => onBulkDelete?.(Array.from(selectedRows))}
                    className="w-full px-4 py-2 bg-red-50 border border-red-400 text-red-700 rounded-md hover:bg-red-100 text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Selected
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card card-hover overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full" role="grid" aria-label="Expense transactions table">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
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
                    className="rounded border-gray-300 focus:ring-2 focus:ring-teal-500"
                    aria-label="Select all transactions"
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
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Upload
                </th>
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
                // Skeleton loading rows
                [...Array(8)].map((_, i) => (
                  <tr key={`skeleton-${i}`} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 w-4 bg-gray-200 rounded" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-20 bg-gray-200 rounded" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-32 bg-gray-200 rounded" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-16 bg-gray-200 rounded" /></td>
                    <td className="px-6 py-4"><div className="h-6 w-20 bg-gray-200 rounded-full" /></td>
                    <td className="px-6 py-4"><div className="h-8 w-28 bg-gray-200 rounded" /></td>
                    <td className="px-6 py-4"><div className="h-8 w-28 bg-gray-200 rounded" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-24 bg-gray-200 rounded" /></td>
                    <td className="px-6 py-4"><div className="h-6 w-20 bg-gray-200 rounded-full" /></td>
                    <td className="px-6 py-4"><div className="h-6 w-20 bg-gray-200 rounded-full" /></td>
                    <td className="px-6 py-4"><div className="h-8 w-8 bg-gray-200 rounded" /></td>
                  </tr>
                ))
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-6 py-12">
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
                    className={`transition-all duration-200 ease-in-out hover:bg-gray-100 ${rowBackground} ${
                      selectedRows.has(expense.id) ? 'ring-2 ring-inset ring-teal-500 bg-teal-50/50' : ''
                    }`}
                  >
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(expense.id)}
                        onChange={() => toggleRowSelection(expense.id)}
                        className="rounded border-gray-300 focus:ring-2 focus:ring-teal-500"
                        aria-label={`Select transaction from ${expense.merchant}`}
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
                        {isIncome ? <><span role="img" aria-hidden="true">💰</span> Income</> : <><span role="img" aria-hidden="true">💸</span> Expense</>}
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 max-w-[140px] truncate" title={expense.upload_id || ''}>
                      {expense.upload_id || '—'}
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
