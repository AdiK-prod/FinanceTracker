/**
 * Format a date for display in DD/MM/YYYY format (Israeli standard)
 * IMPORTANT: Handles timezone issues by parsing date string components directly
 * @param {Date|string} date - Date object or ISO date string (YYYY-MM-DD)
 * @returns {string} Formatted date as DD/MM/YYYY
 */
export const formatDateDisplay = (date) => {
  if (!date) return ''

  let year, month, day

  if (typeof date === 'string') {
    // Parse YYYY-MM-DD string directly without creating Date object
    // This avoids timezone conversion issues
    const parts = date.split('T')[0].split('-') // Handle both "YYYY-MM-DD" and "YYYY-MM-DDTHH:MM:SS"

    if (parts.length === 3) {
      year = parseInt(parts[0], 10)
      month = parseInt(parts[1], 10)
      day = parseInt(parts[2], 10)
    } else {
      return ''
    }
  } else if (date instanceof Date) {
    // For Date objects, use local timezone values
    year = date.getFullYear()
    month = date.getMonth() + 1
    day = date.getDate()
  } else {
    return ''
  }

  // Validate
  if (!year || !month || !day || month < 1 || month > 12 || day < 1 || day > 31) {
    console.warn('Invalid date:', date)
    return ''
  }

  // Format as DD/MM/YYYY
  const dayStr = String(day).padStart(2, '0')
  const monthStr = String(month).padStart(2, '0')

  return `${dayStr}/${monthStr}/${year}`
}

/**
 * Format a date range for display
 * @param {Date|string} startDate
 * @param {Date|string} endDate
 * @returns {string} Formatted as "DD/MM/YYYY - DD/MM/YYYY"
 */
export const formatDateRangeDisplay = (startDate, endDate) => {
  if (!startDate || !endDate) return 'Select Date Range'

  return `${formatDateDisplay(startDate)} - ${formatDateDisplay(endDate)}`
}

/**
 * Format a date as Month Year (e.g., "January 2025")
 * @param {Date|string} date
 * @returns {string}
 */
export const formatMonthYear = (date) => {
  if (!date) return ''

  let year, month

  if (typeof date === 'string') {
    const parts = date.split('T')[0].split('-')
    if (parts.length === 3) {
      year = parseInt(parts[0], 10)
      month = parseInt(parts[1], 10) - 1 // 0-indexed for monthNames array
    } else {
      return ''
    }
  } else if (date instanceof Date) {
    year = date.getFullYear()
    month = date.getMonth()
  } else {
    return ''
  }

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ]

  if (month < 0 || month > 11) return ''

  return `${monthNames[month]} ${year}`
}

/**
 * Convert Date object to YYYY-MM-DD string for database (avoids timezone issues)
 * @param {Date|string} date
 * @returns {string} YYYY-MM-DD
 */
export const formatDateForDB = (date) => {
  if (!date) return ''

  if (typeof date === 'string') {
    // Already in string format, just extract date part
    return date.split('T')[0]
  }

  if (!(date instanceof Date) || isNaN(date.getTime())) return ''

  // Use local timezone values, not UTC
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

/**
 * Parse a date string without timezone conversion
 * @param {string} dateString - YYYY-MM-DD format
 * @returns {Date|null} Date object at midnight local time
 */
export const parseLocalDate = (dateString) => {
  if (!dateString) return null

  const parts = dateString.split('-')
  if (parts.length !== 3) return null

  const year = parseInt(parts[0], 10)
  const month = parseInt(parts[1], 10) - 1 // Month is 0-indexed in Date constructor
  const day = parseInt(parts[2], 10)

  // Create date at midnight local time (not UTC)
  return new Date(year, month, day)
}
