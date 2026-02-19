import { X } from 'lucide-react'
import { getMonthsDifference } from '../utils/amortization'

const formatMonthLabel = (dateStr) => {
  const d = new Date(dateStr + '-01')
  return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
}

export default function AmortizationDetailsModal({ isOpen, onClose, transaction, onCancelAmortization, onEdit }) {
  if (!isOpen || !transaction?.is_amortized) return null

  const startDate = transaction.amortization_start_date
  const totalMonths = transaction.amortization_adjusted_months ?? transaction.amortization_months ?? 0
  const monthlyAmount = transaction.amortization_monthly_amount ?? 0
  const today = new Date()
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`

  const allocations = []
  const [startY, startM] = (startDate || '').split('-').map(Number)
  for (let i = 0; i < totalMonths; i++) {
    const d = new Date(startY, startM - 1 + i, 1)
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const monthIndex = getMonthsDifference(startDate, monthKey)
    const isPast = monthKey < currentMonth
    const isCurrent = monthKey === currentMonth
    allocations.push({
      label: formatMonthLabel(monthKey),
      monthKey,
      isPast,
      isCurrent,
      isFuture: !isPast && !isCurrent,
    })
  }

  const handleCancelAmortization = async () => {
    if (!window.confirm('Remove amortization? This transaction will show as a single payment again in reports.')) return
    try {
      const { supabase } = await import('../lib/supabase')
      await supabase
        .from('expenses')
        .update({
          is_amortized: false,
          excluded_from_totals: false,
          amortization_months: null,
          amortization_adjusted_months: null,
          amortization_start_date: null,
          amortization_monthly_amount: null,
          amortization_status: null,
          amortization_adjusted_at: null,
        })
        .eq('id', transaction.id)
      onCancelAmortization?.()
      onClose()
    } catch (e) {
      console.error(e)
      alert(e.message || 'Failed to cancel amortization')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Amortization details</h2>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-600">
            <span className="font-medium text-gray-900">{transaction.merchant}</span>
            <br />
            Original amount: ₪{parseFloat(transaction.amount).toLocaleString('he-IL', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-sm text-gray-600">
            Status: <span className="font-medium capitalize">{transaction.amortization_status || 'active'}</span>
            <br />
            Monthly: ₪{monthlyAmount.toLocaleString('he-IL', { minimumFractionDigits: 2 })} × {totalMonths} months
          </p>

          <div>
            <span className="block text-sm font-medium text-gray-700 mb-2">Allocation</span>
            <ul className="space-y-2">
              {allocations.map((a, i) => (
                <li key={a.monthKey} className="flex items-center gap-2 text-sm">
                  {a.isPast && <span className="text-green-600">✅</span>}
                  {a.isCurrent && <span className="text-blue-600">⏳</span>}
                  {a.isFuture && <span className="text-gray-400">○</span>}
                  <span className={a.isFuture ? 'text-gray-500' : ''}>
                    {a.label}: ₪{monthlyAmount.toLocaleString('he-IL', { minimumFractionDigits: 2 })}
                    {a.isPast && ' (completed)'}
                    {a.isCurrent && ' (current)'}
                    {a.isFuture && ' (future)'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2 p-4 border-t border-gray-200">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
            Close
          </button>
          <button
            onClick={handleCancelAmortization}
            className="px-4 py-2 text-red-700 hover:bg-red-50 rounded-lg"
          >
            Cancel amortization
          </button>
          <button
            onClick={() => { onClose(); onEdit?.(transaction); }}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
          >
            Edit amortization
          </button>
        </div>
      </div>
    </div>
  )
}
