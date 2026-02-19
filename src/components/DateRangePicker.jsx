import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { DayPicker } from 'react-day-picker'
import { Calendar, ChevronDown, ChevronLeft, X } from 'lucide-react'
import { formatDateRangeDisplay } from '../utils/dateFormatters'

export default function DateRangePicker({ value, onChange, baseDate }) {
  const [isOpen, setIsOpen] = useState(false)
  const [view, setView] = useState('presets')
  const [tempRange, setTempRange] = useState(value)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const triggerRef = useRef(null)
  const dropdownRef = useRef(null)

  useEffect(() => {
    if (!isOpen || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    setPosition({ top: rect.bottom + 8, left: rect.left })
  }, [isOpen])

  useEffect(() => {
    function handleClickOutside(event) {
      const trigger = triggerRef.current
      const dropdown = dropdownRef.current
      if (trigger?.contains(event.target) || dropdown?.contains(event.target)) return
      setIsOpen(false)
      setView('presets')
    }
    function handleEscape(event) {
      if (event.key === 'Escape') {
        setIsOpen(false)
        setView('presets')
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])
  
  // Update temp range when selected range changes
  useEffect(() => {
    setTempRange(value)
  }, [value])
  
  function getPresetRange(preset) {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const day = now.getDate()
    
    let from, to
    
    switch (preset) {
      case 'thisMonth':
        from = new Date(year, month, 1)
        to = new Date(year, month, day)
        break
      case 'lastMonth':
        from = new Date(year, month - 1, 1)
        to = new Date(year, month, 0)
        break
      case 'last3Months':
        from = new Date(year, month - 3, 1)
        to = new Date(year, month, day)
        break
      case 'last6Months':
        from = new Date(year, month - 6, 1)
        to = new Date(year, month, day)
        break
      case 'yearToDate':
        from = new Date(year, 0, 1)
        to = new Date(year, month, day)
        break
      case 'lastYear':
        from = new Date(year - 1, 0, 1)
        to = new Date(year - 1, 11, 31)
        break
      case 'allTime':
        from = new Date(2020, 0, 1)
        to = new Date(year, month, day)
        break
      default:
        from = new Date(year, month, 1)
        to = new Date(year, month, day)
    }
    
    return { from, to }
  }
  
  function applyPreset(preset) {
    const range = getPresetRange(preset)
    onChange(range)
    setIsOpen(false)
    setView('presets')
  }
  
  function handleCustomRangeSelect(range) {
    if (range?.from) {
      setTempRange(range)
    }
  }
  
  function applyCustomRange() {
    if (tempRange?.from && tempRange?.to) {
      onChange(tempRange)
      setIsOpen(false)
      setView('presets')
    }
  }
  
  function cancelCustomRange() {
    setTempRange(value)
    setView('presets')
  }
  
  const dropdownContent = isOpen && (
    <div
      ref={dropdownRef}
      className="fixed bg-white rounded-xl shadow-2xl border-2 border-gray-200 overflow-hidden"
      style={{
        top: position.top,
        left: position.left,
        zIndex: 9999,
      }}
    >
          
          {view === 'presets' ? (
            // PRESETS VIEW
            <div className="p-4 min-w-[280px]">
              <div className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wider">
                Quick Select
              </div>
              <div className="space-y-1">
                <PresetButton label="This Month" onClick={() => applyPreset('thisMonth')} icon="📅" />
                <PresetButton label="Last Month" onClick={() => applyPreset('lastMonth')} icon="📆" />
                <PresetButton label="Last 3 Months" onClick={() => applyPreset('last3Months')} icon="📊" />
                <PresetButton label="Last 6 Months" onClick={() => applyPreset('last6Months')} icon="📈" />
                <PresetButton label="Year to Date" onClick={() => applyPreset('yearToDate')} icon="🗓️" />
                <PresetButton label="Last Year" onClick={() => applyPreset('lastYear')} icon="📅" />
                <PresetButton label="All Time" onClick={() => applyPreset('allTime')} icon="♾️" />
              </div>
              
              {/* Custom Range Button */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setView('custom')}
                  className="w-full px-4 py-2.5 bg-teal-50 text-teal-700 rounded-lg hover:bg-teal-100 transition-colors font-semibold flex items-center justify-center gap-2 border-2 border-teal-200"
                >
                  <Calendar className="w-4 h-4" />
                  Pick Custom Dates
                </button>
              </div>
            </div>
          ) : (
            // CUSTOM CALENDAR VIEW
            <div className="p-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={cancelCustomRange}
                  className="flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700 font-semibold"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
                <span className="text-sm font-bold text-gray-900">
                  Select Date Range
                </span>
                <button
                  onClick={() => {
                    setIsOpen(false)
                    setView('presets')
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Calendar */}
              <DayPicker
                mode="range"
                selected={tempRange}
                onSelect={handleCustomRangeSelect}
                numberOfMonths={1}
                defaultMonth={tempRange?.from || baseDate || new Date()}
                classNames={{
                  months: "flex flex-col",
                  month: "space-y-4",
                  caption: "flex justify-center pt-1 relative items-center mb-4",
                  caption_label: "text-base font-bold text-gray-900",
                  nav: "space-x-1 flex items-center",
                  nav_button: "h-9 w-9 bg-white hover:bg-teal-50 rounded-lg transition-colors border-2 border-gray-300 hover:border-teal-500",
                  nav_button_previous: "absolute left-1",
                  nav_button_next: "absolute right-1",
                  table: "w-full border-collapse",
                  head_row: "flex",
                  head_cell: "text-gray-900 font-bold rounded-md w-10 text-sm",
                  row: "flex w-full mt-2",
                  cell: "text-center text-sm p-0 relative",
                  day: "h-10 w-10 p-0 font-semibold rounded-lg hover:bg-teal-100 transition-colors text-gray-900 border-2 border-transparent",
                  day_selected: "bg-teal-600 text-white hover:bg-teal-700 border-teal-700",
                  day_today: "bg-blue-100 text-blue-900 border-blue-500",
                  day_outside: "text-gray-300 opacity-40",
                  day_disabled: "text-gray-200 opacity-40",
                  day_range_middle: "bg-teal-100 text-teal-900 border-teal-200",
                  day_range_start: "bg-teal-600 text-white",
                  day_range_end: "bg-teal-600 text-white",
                }}
              />
              
              {/* Selected Range Display */}
              {tempRange?.from && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="text-xs font-semibold text-gray-600 mb-1">Selected Range:</div>
                  <div className="text-sm font-bold text-gray-900">
                    {formatDateRangeDisplay(tempRange.from, tempRange.to || tempRange.from)}
                  </div>
                </div>
              )}
              
              {/* Apply Button */}
              <div className="mt-4 pt-4 border-t border-gray-200 flex gap-2">
                <button
                  onClick={cancelCustomRange}
                  className="flex-1 px-4 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={applyCustomRange}
                  disabled={!tempRange?.from || !tempRange?.to}
                  className="flex-1 px-4 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Apply
                </button>
              </div>
            </div>
          )}
    </div>
  )

  return (
    <>
      <div className="relative" ref={triggerRef}>
        <button
          type="button"
          onClick={() => {
            setIsOpen(!isOpen)
            setView('presets')
          }}
          className="flex items-center gap-2 px-4 py-2.5 border-2 border-gray-300 rounded-lg bg-white hover:border-teal-500 transition-colors font-medium shadow-sm"
        >
          <Calendar className="w-5 h-5 text-teal-600" />
          <span className="text-sm text-gray-900">
            {formatDateRangeDisplay(value?.from, value?.to)}
          </span>
          <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>
      {typeof document !== 'undefined' && createPortal(dropdownContent, document.body)}
    </>
  )
}

function PresetButton({ label, onClick, icon }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-teal-50 hover:text-teal-700 rounded-lg transition-colors flex items-center gap-3 border border-transparent hover:border-teal-200"
    >
      <span className="text-lg">{icon}</span>
      <span>{label}</span>
    </button>
  )
}
