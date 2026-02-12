import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { getMonthsDifference } from '../utils/amortization'

const formatMonthLabel = (dateStr) => {
  const d = new Date(dateStr + '-01')
  return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
}

export default function AmortizationEditModal({ isOpen, onClose, transaction, onSaved }) {
  const [adjustedMonths, setAdjustedMonths] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const originalMonths = transaction?.amortization_months ?? 0
  const monthlyAmount = transaction?.amortization_monthly_amount ?? 0
  const startDate = transaction?.amortization_start_date
  const today = new Date()
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  const completedMonths = startDate
    ? Math.min(originalMonths, getMonthsDifference(startDate, currentMonth) + 1)
    : 0
  const minMonths = Math.max(1, completedMonths)

  useEffect(() => {
    if (!isOpen || !transaction) return
    setAdjustedMonths(transaction.amortization_adjusted_months ?? transaction.amortization_months ?? 0)
    setError('')
  }, [isOpen, transaction?.id])

  const validMonths = adjustedMonths >= minMonths && adjustedMonths <= originalMonths
  const newTotal = validMonths ? monthlyAmount * adjustedMonths : 0
  const originalTotal = monthlyAmount * originalMonths
  const diff = originalTotal - newTotal

  const handleSave = async () => {
    if (!transaction?.id || !validMonths) return
    setError('')
    setSaving(true)
    try {
      const { supabase } = await import('../lib/supabase')
      const { error: updateError } = await supabase
        .from('expenses')
        .update({
          amortization_adjusted_months: adjustedMonths,
          amortization_status: 'adjusted',
          amortization_adjusted_at: new Date().toISOString(),
        })
        .eq('id', transaction.id)

      if (updateError) throw updateError
      onSaved?.()
      onClose()
    } catch (e) {
      setError(e.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen || !transaction?.is_amortized) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Edit amortization</h2>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-600">
            Original plan: {originalMonths} months · ₪{originalTotal.toLocaleString('he-IL', { minimumFractionDigits: 2 })}
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Adjust to (min: {minMonths}, max: {originalMonths}) months
            </label>
            <input
              type="number"
              min={minMonths}
              max={originalMonths}
              value={adjustedMonths}
              onChange={(e) => setAdjustedMonths(Math.max(minMonths, Math.min(originalMonths, parseInt(e.target.value, 10) || minMonths)))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal focus:border-transparent"
            />
          </div>

          <div className="text-sm">
            <p className="font-medium text-gray-700 mb-1">Summary</p>
            <p>Original total: ₪{originalTotal.toLocaleString('he-IL', { minimumFractionDigits: 2 })}</p>
            <p>New total: ₪{newTotal.toLocaleString('he-IL', { minimumFractionDigits: 2 })}</p>
            <p>Difference: ₪{diff.toLocaleString('he-IL', { minimumFractionDigits: 2 })}</p>
            <p className="text-amber-700 mt-2">💡 Record any refund as a separate transaction if needed.</p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-gray-200">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!validMonths || saving}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
