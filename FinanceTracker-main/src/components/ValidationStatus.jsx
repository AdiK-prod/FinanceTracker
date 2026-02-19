import { CheckCircle2, AlertTriangle } from 'lucide-react'

const StatusChip = ({ label, completed, required = false }) => (
  <div className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium ${
    completed ? 'bg-emerald-50 text-emerald-700' : required ? 'bg-yellow-50 text-yellow-700' : 'bg-gray-50 text-gray-600'
  }`}>
    {completed ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
    {label}
  </div>
)

const ValidationStatus = ({ mappings }) => {
  const hasDate = mappings.filter((m) => m === 'date').length === 1
  const hasMerchant = mappings.filter((m) => m === 'merchant').length === 1
  const hasAmount = mappings.filter((m) => m === 'amount').length === 1
  const hasNotes = mappings.some((m) => m === 'notes')

  return (
    <div className="flex flex-wrap gap-2">
      <StatusChip label="Date" completed={hasDate} required />
      <StatusChip label="Merchant" completed={hasMerchant} required />
      <StatusChip label="Amount" completed={hasAmount} required />
      <StatusChip label="Notes (optional)" completed={hasNotes} />
    </div>
  )
}

export default ValidationStatus
