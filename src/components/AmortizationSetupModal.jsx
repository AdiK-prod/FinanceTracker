import { useState, useEffect } from 'react'
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
  const [monthlyAmount, setMonthlyAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const amount = transaction?.amount != null ? parseFloat(transaction.amount) : 0
  const txDate = transaction?.transaction_date ? new Date(transaction.transaction_date) : new Date()

  // Month options: from transaction month to 12 months ahead
  const monthOptions = []
  const start = new Date(txDate.getFullYear(), txDate.getMonth(), 1)
  for (let i = 0; i <= 12; i++) {
    const d = new Date(start)
    d.setMonth(d.getMonth() + i)
    monthOptions.push({ key: formatMonthKey(d), label: formatMonthOption(d) })
  }

  // Only init when modal opens or transaction id changes (not on every parent re-render)
  useEffect(() => {
    if (!isOpen || !transaction) return
    const key = formatMonthKey(transaction.transaction_date ? new Date(transaction.transaction_date) : new Date())
    setStartMonth(key)
    setMonths(4)
    setError('')
    const amt = transaction?.amount != null ? parseFloat(transaction.amount) : 0
    const amounts = calculateMonthlyAmounts(amt, 4)
    setMonthlyAmount(amounts[0]?.toFixed(2) ?? '')
  }, [isOpen, transaction?.id])

  // Recompute monthly amount when months change (user editing)
  useEffect(() => {
    if (months < 1 || amount <= 0) return
    const amounts = calculateMonthlyAmounts(amount, months)
    setMonthlyAmount(amounts[0]?.toFixed(2) ?? '')
  }, [amount, months])

  const monthlyNum = parseFloat(monthlyAmount) || 0
  const totalFromInput = monthlyNum * months
  const isValid = amount > 0 && months >= 1 && months <= 60 && Math.abs(totalFromInput - amount) < 0.02

  const previewMonths = []
  if (startMonth && months >= 1) {
    const [y, m] = startMonth.split('-').map(Number)
    const amounts = calculateMonthlyAmounts(amount, months)
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
      const amounts = calculateMonthlyAmounts(amount, months)
      const firstMonthAmount = amounts[0]

      const { error: updateError } = await supabase
        .from('expenses')
        .update({
          is_amortized: true,
          amortization_months: months,
          amortization_adjusted_months: null,
          amortization_start_date: startDate,
          amortization_monthly_amount: firstMonthAmount,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
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
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Monthly amount (editable)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={monthlyAmount}
              onChange={(e) => setMonthlyAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal focus:border-transparent"
            />
            {!isValid && monthlyAmount && (
              <p className="text-xs text-amber-600 mt-1">
                Monthly × {months} should equal ₪{amount.toLocaleString('he-IL', { minimumFractionDigits: 2 })}
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
