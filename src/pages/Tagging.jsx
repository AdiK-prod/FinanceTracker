import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Tag } from 'lucide-react'
import ExpenseTable from '../components/ExpenseTable'
import { supabase } from '../lib/supabase'

const Tagging = () => {
  const navigate = useNavigate()
  const [expenses, setExpenses] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchExpenses = async () => {
      setIsLoading(true)
      setError('')
    const { data, error: fetchError } = await supabase
        .from('expenses')
      .select('id, transaction_date, merchant, amount, main_category, sub_category, is_auto_tagged')
        .order('main_category', { ascending: true, nullsFirst: true })
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
  }, [])

  const handleSaveAndContinue = () => {
    navigate('/dashboard')
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

  const handleBulkUpdate = async (ids, field, value) => {
    const updates = field === 'main_category'
      ? { main_category: value, sub_category: '', is_auto_tagged: false }
      : { [field]: value, is_auto_tagged: false }

    setExpenses((prev) => prev.map((exp) => (ids.includes(exp.id) ? { ...exp, ...updates } : exp)))

    const { error: bulkError } = await supabase
      .from('expenses')
      .update(updates)
      .in('id', ids)

    if (bulkError) {
      setError(bulkError.message)
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
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
      </div>

      <ExpenseTable
        expenses={expenses}
        isLoading={isLoading}
        onUpdateExpense={handleUpdateExpense}
        onBulkUpdate={handleBulkUpdate}
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
    </div>
  )
}

export default Tagging
