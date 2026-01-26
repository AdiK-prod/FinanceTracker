import { useEffect, useMemo, useRef, useState } from 'react'
import { DayPicker } from 'react-day-picker'
import { Calendar, ChevronDown } from 'lucide-react'
import { formatDateRangeDisplay } from '../utils/dateFormatters'

const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1)
const endOfMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0)
const addMonths = (date, months) => new Date(date.getFullYear(), date.getMonth() + months, 1)

const DateRangePicker = ({ value, onChange, baseDate }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const dropdownRef = useRef(null)
  const anchorDate = baseDate || new Date()
  const now = new Date()

  const presets = useMemo(() => [
    {
      label: 'This Month',
      range: { from: startOfMonth(now), to: now },
    },
    {
      label: 'Last Month',
      range: { from: startOfMonth(addMonths(now, -1)), to: endOfMonth(addMonths(now, -1)) },
    },
    {
      label: 'Last 3 Months',
      range: { from: startOfMonth(addMonths(now, -2)), to: now },
    },
    {
      label: 'Last 6 Months',
      range: { from: startOfMonth(addMonths(now, -5)), to: now },
    },
    {
      label: 'Custom Range',
      range: null,
    },
  ], [now])

  const rangeLabel = formatDateRangeDisplay(value?.from, value?.to)

  const handlePresetClick = (preset) => {
    if (preset.range) {
      onChange(preset.range)
      setIsOpen(false)
      setShowCalendar(false)
      return
    }
    setShowCalendar(true)
  }

  const handleRangeSelect = (range) => {
    onChange(range)
    if (range?.from && range?.to) {
      setTimeout(() => setIsOpen(false), 300)
    }
  }

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
        setShowCalendar(false)
      }
    }
    const handleEsc = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
        setShowCalendar(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick)
      document.addEventListener('keydown', handleEsc)
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [isOpen])

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg bg-white hover:border-teal transition-colors"
      >
        <Calendar size={20} className="text-gray-600" />
        <span className="text-sm font-medium text-gray-700">{rangeLabel}</span>
        <ChevronDown size={16} className={`text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 z-[100] overflow-hidden">
          {/* Quick Presets - Show when calendar is NOT visible */}
          {!showCalendar && (
            <div className="p-3 min-w-[240px]">
              <div className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                Quick Select
              </div>
              <div className="space-y-1">
                {presets.slice(0, -1).map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => handlePresetClick(preset)}
                    className="w-full text-left px-3 py-2 text-sm font-medium text-gray-700 hover:bg-teal-50 hover:text-teal rounded-md transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              
              {/* Custom Range Button */}
              <div className="mt-3 pt-3 border-t border-gray-200">
                <button
                  onClick={() => setShowCalendar(true)}
                  className="w-full px-3 py-2 text-sm text-teal-600 hover:bg-teal-50 rounded-md transition-colors font-medium"
                >
                  Custom Range →
                </button>
              </div>
            </div>
          )}

          {/* Custom Calendar View - Show when user clicks Custom Range */}
          {showCalendar && (
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Custom Range
                </div>
                <button
                  onClick={() => setShowCalendar(false)}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  ← Back
                </button>
              </div>
              
              <DayPicker
                mode="range"
                selected={value}
                onSelect={handleRangeSelect}
                numberOfMonths={1}
                defaultMonth={value?.from || anchorDate}
                classNames={{
                  months: 'flex flex-col',
                  month: 'space-y-4',
                  caption: 'flex justify-center pt-1 relative items-center mb-4',
                  caption_label: 'text-base font-bold text-gray-900',
                  nav: 'space-x-1 flex items-center',
                  nav_button: 'h-8 w-8 bg-white hover:bg-teal-50 rounded-md transition-colors border-2 border-gray-300 hover:border-teal-500',
                  nav_button_previous: 'absolute left-1',
                  nav_button_next: 'absolute right-1',
                  table: 'w-full border-collapse',
                  head_row: 'flex',
                  head_cell: 'text-gray-900 font-bold rounded-md w-10 text-sm',
                  row: 'flex w-full mt-2',
                  cell: 'text-center text-sm p-0 relative',
                  day: 'h-10 w-10 p-0 font-medium rounded-md hover:bg-teal-100 transition-colors text-gray-900 border border-transparent',
                  day_selected: 'bg-teal-600 text-white hover:bg-teal-700 font-bold border-teal-700',
                  day_today: 'bg-blue-100 text-blue-900 font-bold border-2 border-blue-600',
                  day_outside: 'text-gray-300 opacity-40',
                  day_disabled: 'text-gray-200 line-through opacity-40',
                  day_range_middle: 'bg-teal-100 text-teal-900 border-teal-200',
                  day_range_start: 'bg-teal-600 text-white rounded-l-md border-teal-700',
                  day_range_end: 'bg-teal-600 text-white rounded-r-md border-teal-700',
                }}
              />
              
              <div className="mt-3 pt-3 border-t border-gray-200 flex gap-2">
                <button
                  onClick={() => setShowCalendar(false)}
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  ← Presets
                </button>
                <button
                  onClick={() => {
                    setIsOpen(false)
                    setShowCalendar(false)
                  }}
                  className="flex-1 px-3 py-2 text-sm bg-teal-600 text-white rounded-md hover:bg-teal-700"
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default DateRangePicker
