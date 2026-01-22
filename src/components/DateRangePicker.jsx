import { useMemo, useState } from 'react'
import { DayPicker } from 'react-day-picker'
import { Calendar, ChevronDown } from 'lucide-react'

const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1)
const endOfMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0)
const addMonths = (date, months) => new Date(date.getFullYear(), date.getMonth() + months, 1)

const formatDate = (date) =>
  date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

const DateRangePicker = ({ value, onChange, baseDate }) => {
  const [isOpen, setIsOpen] = useState(false)
  const anchorDate = baseDate || new Date()

  const presets = useMemo(() => [
    {
      label: 'This Month',
      range: { from: startOfMonth(anchorDate), to: endOfMonth(anchorDate) },
    },
    {
      label: 'Last Month',
      range: { from: startOfMonth(addMonths(anchorDate, -1)), to: endOfMonth(addMonths(anchorDate, -1)) },
    },
    {
      label: 'Last 3 Months',
      range: { from: startOfMonth(addMonths(anchorDate, -2)), to: endOfMonth(anchorDate) },
    },
    {
      label: 'Last 6 Months',
      range: { from: startOfMonth(addMonths(anchorDate, -5)), to: endOfMonth(anchorDate) },
    },
    {
      label: 'Custom Range',
      range: null,
    },
  ], [anchorDate])

  const rangeLabel = value?.from && value?.to
    ? `${formatDate(value.from)} - ${formatDate(value.to)}`
    : 'Select date range'

  const handlePresetClick = (preset) => {
    if (preset.range) {
      onChange(preset.range)
      setIsOpen(false)
    }
  }

  return (
    <div className="relative">
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn-secondary flex items-center gap-2"
      >
        <Calendar size={24} className="text-gray-600" />
        <span className="text-sm font-medium text-gray-700">{rangeLabel}</span>
        <ChevronDown size={18} className="text-gray-500" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 z-50 w-[720px]">
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-50">
                <Calendar size={24} className="text-teal-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Date Range</p>
                <p className="text-lg font-semibold text-gray-900">{rangeLabel}</p>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-4">
              <div className="col-span-1 space-y-2">
                {presets.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => handlePresetClick(preset)}
                    className="w-full text-left px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all duration-300 ease-in-out"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <div className="col-span-4">
                <DayPicker
                  mode="range"
                  numberOfMonths={2}
                  selected={value}
                  onSelect={onChange}
                  defaultMonth={value?.from || anchorDate}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button className="btn-secondary" onClick={() => setIsOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DateRangePicker
