import { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Tag, Search, Filter, X, Upload, ChevronDown, Plus } from 'lucide-react'
import ExpenseTable from '../components/ExpenseTable'
import UploadModal from '../components/UploadModal'
import AddTransactionModal from '../components/AddTransactionModal'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { fetchAllExpenses } from '../utils/fetchAllRows'
import { parseTaggingStateFromUrl, buildTaggingUrlParams } from '../utils/viewStateUrl'

const Tagging = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [expenses, setExpenses] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [mainCategories, setMainCategories] = useState([])
  const [subCategories, setSubCategories] = useState({})
  const [filters, setFilters] = useState({
    searchMerchant: '',
    mainCategory: '',
    subCategory: '',
    showUncategorized: false,
    showAutoTagged: false,
    showOnlyMissingSubCategory: false,
    showExceptional: null,
    showOnlyExpenses: false,
    showOnlyIncome: false,
    dateFrom: '',
    dateTo: '',
    uploadId: '',
  })
  const [showFilters, setShowFilters] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [successToast, setSuccessToast] = useState(null)

  const [searchParams, setSearchParams] = useSearchParams()
  const hasRestoredTaggingFromUrl = useRef(false)

  useEffect(() => {
    if (hasRestoredTaggingFromUrl.current) return
    hasRestoredTaggingFromUrl.current = true
    const restored = parseTaggingStateFromUrl(searchParams)
    if (!restored) return
    setFilters((prev) => ({ ...prev, ...restored.filters }))
  }, [])

  useEffect(() => {
    const params = buildTaggingUrlParams(filters)
    const str = params.toString()
    if (str === searchParams.toString()) return
    setSearchParams(params, { replace: true })
  }, [filters])

  const fetchExpenses = async () => {
    if (!user) return
    setIsLoading(true)
    setError('')
    try {
      // Use paginated fetch to bypass Supabase 1000 row limit
      const data = await fetchAllExpenses(supabase, user.id, {})
      // Sort by main_category then transaction_date (same as before)
      const sorted = (data || []).sort((a, b) => {
        const catA = a.main_category ?? ''
        const catB = b.main_category ?? ''
        if (catA !== catB) return catA.localeCompare(catB)
        return new Date(b.transaction_date) - new Date(a.transaction_date)
      })
      setExpenses(sorted)
      if (data?.length > 0) {
        console.log(`✅ Tagging fetched ${data.length} transactions (paginated)`)
      }
    } catch (fetchError) {
      console.error('Error fetching expenses:', fetchError)
      setError(fetchError.message || 'Failed to fetch expenses')
      setExpenses([])
    }
    setIsLoading(false)
  }

  const fetchCategories = async () => {
    if (!user) return
    const { data, error: fetchError } = await supabase
      .from('expense_categories')
      .select('main_category, sub_category')
      .eq('user_id', user.id)
      .order('main_category', { ascending: true })
      .order('sub_category', { ascending: true })

    if (fetchError) {
      setError(fetchError.message)
      return
    }

    const mains = Array.from(
      new Set((data || []).map((row) => row.main_category))
    )
    const subs = (data || []).reduce((acc, row) => {
      if (!row.sub_category) return acc
      if (!acc[row.main_category]) acc[row.main_category] = []
      acc[row.main_category].push(row.sub_category)
      return acc
    }, {})

    setMainCategories(mains)
    setSubCategories(subs)
  }

  useEffect(() => {
    if (user) fetchExpenses()
  }, [user])

  useEffect(() => {
    fetchCategories()
  }, [user])

  const handleSaveAndContinue = () => {
    navigate('/dashboard')
  }

  const filteredExpenses = expenses.filter((expense) => {
    if (filters.searchMerchant) {
      const search = filters.searchMerchant.toLowerCase()
      if (!expense.merchant.toLowerCase().includes(search)) return false
    }

    if (filters.mainCategory && expense.main_category !== filters.mainCategory) return false
    if (filters.subCategory && expense.sub_category !== filters.subCategory) return false

    if (filters.showUncategorized) {
      if (expense.main_category || expense.sub_category) return false
    }

    // Show only expenses with main category but missing sub-category
    if (filters.showOnlyMissingSubCategory) {
      if (!expense.main_category || expense.sub_category) return false
    }

    if (filters.showAutoTagged && expense.is_auto_tagged !== true) return false

    if (filters.showExceptional !== null && expense.is_exceptional !== filters.showExceptional) {
      return false
    }

    // Filter by transaction type
    if (filters.showOnlyExpenses && expense.transaction_type !== 'expense') return false
    if (filters.showOnlyIncome && expense.transaction_type !== 'income') return false

    if (filters.dateFrom && expense.transaction_date < filters.dateFrom) return false
    if (filters.dateTo && expense.transaction_date > filters.dateTo) return false

    if (filters.uploadId && expense.upload_id !== filters.uploadId) return false

    return true
  })

  const distinctUploadIds = [...new Set(expenses.map((e) => e.upload_id).filter(Boolean))].sort()

  const getActiveFilterCount = () => {
    let count = 0
    
    if (filters.searchMerchant && filters.searchMerchant.trim() !== '') count++
    if (filters.mainCategory && filters.mainCategory !== '') count++
    if (filters.subCategory && filters.subCategory !== '') count++
    if (filters.showUncategorized) count++
    if (filters.showAutoTagged) count++
    if (filters.showOnlyMissingSubCategory) count++
    if (filters.showExceptional !== null) count++
    if (filters.showOnlyExpenses) count++
    if (filters.showOnlyIncome) count++
    if (filters.dateFrom && filters.dateFrom !== '') count++
    if (filters.dateTo && filters.dateTo !== '') count++
    if (filters.uploadId && filters.uploadId !== '') count++
    
    return count
  }

  const activeFilterCount = getActiveFilterCount()
  const hasActiveFilters = activeFilterCount > 0

  const clearFilters = () => {
    setFilters({
      searchMerchant: '',
      mainCategory: '',
      subCategory: '',
      showUncategorized: false,
      showAutoTagged: false,
      showOnlyMissingSubCategory: false,
      showExceptional: null,
      showOnlyExpenses: false,
      showOnlyIncome: false,
      dateFrom: '',
      dateTo: '',
      uploadId: '',
    })
  }

  const handleDeleteByUploadId = async (uploadIdToDelete) => {
    if (!uploadIdToDelete) return
    const count = expenses.filter((e) => e.upload_id === uploadIdToDelete).length
    const confirmed = window.confirm(
      `Delete all ${count} transaction${count !== 1 ? 's' : ''} from upload "${uploadIdToDelete}"?\n\nThis cannot be undone.`
    )
    if (!confirmed) return

    const { error: deleteError } = await supabase
      .from('expenses')
      .delete()
      .eq('user_id', user.id)
      .eq('upload_id', uploadIdToDelete)

    if (deleteError) {
      setError(deleteError.message)
      return
    }
    setExpenses((prev) => prev.filter((e) => e.upload_id !== uploadIdToDelete))
    setFilters((f) => ({ ...f, uploadId: '' }))
    await fetchCategories()
  }

  const handleUpdateExpense = async (id, updates) => {
    const normalizedUpdates = {
      ...updates,
      is_auto_tagged: false,
    }
    setExpenses((prev) => prev.map((exp) => (exp.id === id ? { ...exp, ...normalizedUpdates } : exp)))
    const { error: updateError } = await supabase
      .from('expenses')
      .update(normalizedUpdates)
      .eq('id', id)

    if (updateError) {
      setError(updateError.message)
      return
    }

    // No separate pattern table; the tagged expense itself becomes the pattern.
  }

  const handleToggleExceptional = async (id, isExceptional) => {
    setExpenses((prev) => prev.map((exp) => (
      exp.id === id ? { ...exp, is_exceptional: isExceptional } : exp
    )))

    const { error: updateError } = await supabase
      .from('expenses')
      .update({ is_exceptional: isExceptional })
      .eq('id', id)

    if (updateError) {
      setError(updateError.message)
    }
  }

  const handleBulkUpdate = async (ids, field, value) => {
    let updates = { [field]: value, is_auto_tagged: false }
    if (field === 'main_category') {
      updates = { main_category: value, sub_category: '', is_auto_tagged: false }
    }
    if (field === 'bulk') {
      updates = {
        main_category: value.main_category,
        sub_category: value.sub_category || '',
        is_auto_tagged: false,
      }
    }
    if (field === 'is_exceptional') {
      updates = { is_exceptional: value }
    }
    if (field === 'transaction_type') {
      // value is an object with transaction_type and cleared categories
      updates = value
    }

    setExpenses((prev) => prev.map((exp) => (ids.includes(exp.id) ? { ...exp, ...updates } : exp)))

    const { error: bulkError } = await supabase
      .from('expenses')
      .update(updates)
      .in('id', ids)

    if (bulkError) {
      setError(bulkError.message)
    }
  }

  const handleDeleteExpense = async (id, merchantName) => {
    const confirmed = window.confirm(
      `Delete expense from "${merchantName}"?\n\nThis action cannot be undone.`
    )

    if (!confirmed) return

    const { error: deleteError } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id)

    if (deleteError) {
      setError(deleteError.message)
      return
    }

    // Remove from local state
    setExpenses((prev) => prev.filter((exp) => exp.id !== id))
  }

  const handleBulkDelete = async (ids) => {
    const confirmed = window.confirm(
      `Delete ${ids.length} selected expense${ids.length > 1 ? 's' : ''}?\n\nThis action cannot be undone.`
    )

    if (!confirmed) return

    const { error: deleteError } = await supabase
      .from('expenses')
      .delete()
      .in('id', ids)

    if (deleteError) {
      setError(deleteError.message)
      return
    }

    // Remove from local state
    setExpenses((prev) => prev.filter((exp) => !ids.includes(exp.id)))
  }

  const handleUploadComplete = async (transactions, uploadId = null) => {
    try {
      const expensesToInsert = transactions.map((transaction) => ({
        user_id: user.id,
        transaction_date: transaction.date,
        merchant: transaction.merchant,
        amount: transaction.amount,
        notes: transaction.notes || null,
        main_category: transaction.main_category || null,
        sub_category: transaction.sub_category || null,
        is_auto_tagged: transaction.is_auto_tagged || false,
        is_exceptional: false,
        transaction_type: 'expense',
        upload_id: uploadId || null,
      }))

      const { error: insertError } = await supabase
        .from('expenses')
        .insert(expensesToInsert)

      if (insertError) {
        setError(insertError.message)
        return false
      }

      // Refresh expenses after successful upload
      await fetchExpenses()
      await fetchCategories()
      setShowUploadModal(false)
      return true
    } catch (uploadError) {
      setError(uploadError.message)
      return false
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Success Toast */}
      {successToast && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-6 py-4 rounded-lg shadow-2xl flex items-start gap-3 animate-slide-in">
          <Tag className="w-6 h-6 flex-shrink-0 mt-0.5" />
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
      
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-50">
              <Tag size={24} className="text-teal-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Tag Expenses</h1>
              <p className="text-sm font-medium text-gray-600">
            Review and categorize your expenses. Items highlighted in yellow need your attention.
              </p>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-teal-600 text-teal-700 rounded-lg hover:bg-teal-50 font-semibold transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span className="font-medium">Add Manually</span>
            </button>
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors shadow-sm"
            >
              <Upload className="w-5 h-5" />
              <span className="font-medium">Upload Expenses</span>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by merchant name..."
                value={filters.searchMerchant}
                onChange={(e) => setFilters({ ...filters, searchMerchant: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal focus:border-teal"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 border-2 rounded-lg transition-colors font-medium ${
                hasActiveFilters
                  ? 'border-teal-600 bg-teal-50 text-teal-700 shadow-sm'
                  : 'border-gray-300 hover:bg-gray-50 text-gray-700'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span className="text-sm">Filters</span>
              {hasActiveFilters && (
                <span className="px-2 py-0.5 bg-teal-600 text-white text-xs font-bold rounded-full min-w-[20px] text-center">
                  {activeFilterCount}
                </span>
              )}
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>
          <div className="text-sm text-gray-600 flex items-center gap-2">
            <span>Showing {filteredExpenses.length} of {expenses.length} transactions</span>
            {filters.showOnlyMissingSubCategory && (
              <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
                Missing sub-category: {filteredExpenses.length}
              </span>
            )}
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 mt-4 border-t border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Main Category</label>
              <select
                value={filters.mainCategory}
                onChange={(e) => setFilters({
                  ...filters,
                  mainCategory: e.target.value,
                  subCategory: '',
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal"
              >
                <option value="">All categories</option>
                {mainCategories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sub Category</label>
              <select
                value={filters.subCategory}
                onChange={(e) => setFilters({ ...filters, subCategory: e.target.value })}
                disabled={!filters.mainCategory}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal disabled:bg-gray-100"
              >
                <option value="">All sub-categories</option>
                {(subCategories[filters.mainCategory] || []).map((sub) => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Exceptional Status</label>
              <select
                value={filters.showExceptional === null ? 'all' : filters.showExceptional.toString()}
                onChange={(e) => {
                  const value = e.target.value === 'all' ? null : e.target.value === 'true'
                  setFilters({ ...filters, showExceptional: value })
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal"
              >
                <option value="all">All expenses</option>
                <option value="false">Regular only</option>
                <option value="true">Exceptional only</option>
              </select>
            </div>
            {distinctUploadIds.length > 0 && (
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-[180px]">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Upload batch</label>
                  <select
                    value={filters.uploadId}
                    onChange={(e) => setFilters({ ...filters, uploadId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal"
                  >
                    <option value="">All uploads</option>
                    {distinctUploadIds.map((uid) => (
                      <option key={uid} value={uid}>{uid}</option>
                    ))}
                  </select>
                </div>
                {filters.uploadId && (
                  <button
                    type="button"
                    onClick={() => handleDeleteByUploadId(filters.uploadId)}
                    className="px-3 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100"
                  >
                    Delete this upload
                  </button>
                )}
              </div>
            )}
            <div className="md:col-span-2 lg:col-span-4 flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.showUncategorized}
                  onChange={(e) => setFilters({ ...filters, showUncategorized: e.target.checked })}
                  className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Uncategorized only
                </span>
                <span className="text-xs text-gray-500">
                  (No main category)
                </span>
              </label>
              
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.showOnlyMissingSubCategory}
                  onChange={(e) => setFilters({ ...filters, showOnlyMissingSubCategory: e.target.checked })}
                  className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Missing sub-category
                </span>
                <span className="text-xs text-gray-500">
                  (Has main, no sub)
                </span>
              </label>
              
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.showAutoTagged}
                  onChange={(e) => setFilters({ ...filters, showAutoTagged: e.target.checked })}
                  className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Auto-tagged only
                </span>
              </label>
              
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.showOnlyExpenses}
                  onChange={(e) => setFilters({ 
                    ...filters, 
                    showOnlyExpenses: e.target.checked,
                    showOnlyIncome: e.target.checked ? false : filters.showOnlyIncome
                  })}
                  className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  💸 Expenses only
                </span>
              </label>
              
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.showOnlyIncome}
                  onChange={(e) => setFilters({ 
                    ...filters, 
                    showOnlyIncome: e.target.checked,
                    showOnlyExpenses: e.target.checked ? false : filters.showOnlyExpenses
                  })}
                  className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  💰 Income only
                </span>
              </label>
            </div>
            {hasActiveFilters && (
              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-4 h-4" />
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <ExpenseTable
        expenses={filteredExpenses}
        isLoading={isLoading}
        onUpdateExpense={handleUpdateExpense}
        onBulkUpdate={handleBulkUpdate}
        onToggleExceptional={handleToggleExceptional}
        onDeleteExpense={handleDeleteExpense}
        onBulkDelete={handleBulkDelete}
        mainCategories={mainCategories}
        subCategories={subCategories}
      />

      {error && (
        <div className="border border-red-200 bg-red-50 rounded-lg p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-8 flex justify-end">
        <button
          onClick={handleSaveAndContinue}
          className="btn-primary"
        >
          Save & Continue
        </button>
      </div>

      {/* Upload Modal */}
      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUploadComplete={handleUploadComplete}
      />

      {/* Add Transaction Modal */}
      <AddTransactionModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={(counts) => {
          // Show success toast
          setSuccessToast(counts)
          setTimeout(() => setSuccessToast(null), 5000)
          
          // Refresh data
          fetchExpenses()
          fetchCategories()
        }}
      />
    </div>
  )
}

export default Tagging
