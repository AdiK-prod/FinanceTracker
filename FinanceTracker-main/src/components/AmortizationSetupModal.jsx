import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { calculateMonthlyAmounts } from '../utils/amortization'

const formatMonthOption = (date) => {
  const d = typeof date === 'string' ? new Date(date + '-01') : new Date(date)
  return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
}

const formatMonthKey = (date) => {
  const d = typeof date === 'string' ? new Date(date) : new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function AmortizationSetupModal({ isOpen, onClose, transaction, onSaved }) {
  const [startMonth, setStartMonth] = useState('')
  const [months, setMonths] = useState(4)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const amount = transaction?.amount != null ? parseFloat(transaction.amount) : 0

  // Flexible start-month options: 24 months back to 36 months ahead from today (not tied to expense date)
  const monthOptions = []
  const today = new Date()
  const rangeStart = new Date(today.getFullYear(), today.getMonth() - 24, 1)
  const rangeEnd = new Date(today.getFullYear(), today.getMonth() + 36, 1)
  for (let d = new Date(rangeStart); d <= rangeEnd; d.setMonth(d.getMonth() + 1)) {
    monthOptions.push({ key: formatMonthKey(d), label: formatMonthOption(d) })
  }

  // Init once when modal opens: default start month = expense month, default months = 1 (user chooses).
  const initRef = useRef(false)
  useEffect(() => {
    if (!isOpen || !transaction) {
      initRef.current = false
      return
    }
    if (initRef.current) return
    initRef.current = true
    const expenseMonthKey = formatMonthKey(transaction.transaction_date ? new Date(transaction.transaction_date) : new Date())
    const amt = transaction.amount != null ? parseFloat(transaction.amount) : 0
    setStartMonth(monthOptions.some((o) => o.key === expenseMonthKey) ? expenseMonthKey : monthOptions[0]?.key ?? expenseMonthKey)
    setMonths(1)
    setError('')
  }, [isOpen]) // intentionally omit transaction so we never re-run and overwrite user input

  // Auto-calculated monthly amounts (app deviation only)
  const amounts = months >= 1 && amount > 0 ? calculateMonthlyAmounts(amount, months) : []
  const firstMonthAmount = amounts[0] ?? 0
  const isValid = amount > 0 && months >= 1 && months <= 60

  const previewMonths = []
  if (startMonth && months >= 1 && amounts.length) {
    const [y, m] = startMonth.split('-').map(Number)
    for (let i = 0; i < months; i++) {
      const d = new Date(y, m - 1 + i, 1)
      previewMonths.push({ label: formatMonthOption(d), amount: amounts[i] })
    }
  }

  const handleSave = async () => {
    if (!transaction?.id || !isValid) return
    setError('')
    setSaving(true)
    try {
      const { supabase } = await import('../lib/supabase')
      const startDate = startMonth + '-01'

      const { error: updateError } = await supabase
        .from('expenses')
        .update({
          is_amortized: true,
          amortization_months: months,
          amortization_adjusted_months: null,
          amortization_start_date: startDate,
          amortization_monthly_amount: firstMonthAmount, // auto-calculated by app
          excluded_from_totals: true,
          amortization_status: 'active',
          amortization_adjusted_at: null,
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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Amortize transaction</h2>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-600">
            <span className="font-medium text-gray-900">{transaction?.merchant}</span>
            <br />
            Amount: ₪{amount.toLocaleString('he-IL', { minimumFractionDigits: 2 })}
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start month</label>
            <select
              value={startMonth}
              onChange={(e) => setStartMonth(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal focus:border-transparent"
            >
              {monthOptions.map((opt) => (
                <option key={opt.key} value={opt.key}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Number of months (1–60)</label>
            <input
              type="number"
              min={1}
              max={60}
              value={months}
              onChange={(e) => setMonths(Math.max(1, Math.min(60, parseInt(e.target.value, 10) || 1)))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal focus:border-transparent"
            />
            {amounts.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                Monthly amount: ₪{firstMonthAmount.toLocaleString('he-IL', { minimumFractionDigits: 2 })} (auto-calculated)
              </p>
            )}
          </div>

          {previewMonths.length > 0 && (
            <div>
              <span className="block text-sm font-medium text-gray-700 mb-2">Preview</span>
              <ul className="text-sm text-gray-600 space-y-1">
                {previewMonths.map((p, i) => (
                  <li key={i}>{p.label}: ₪{p.amount.toLocaleString('he-IL', { minimumFractionDigits: 2 })}</li>
                ))}
              </ul>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-gray-200">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!isValid || saving}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving…' : 'Save amortization'}
          </button>
        </div>
      </div>
    </div>
  )
}
