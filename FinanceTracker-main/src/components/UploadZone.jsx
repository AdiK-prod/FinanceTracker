import { useMemo, useRef, useState } from 'react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { Upload, FileText, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import ColumnMappingModal from './ColumnMappingModal'
import { formatDateDisplay } from '../utils/dateFormatters'

const COLUMN_OPTIONS = ['date', 'merchant', 'amount', 'notes', 'ignore']

const normalizeHeader = (header) => header?.toString().trim().toLowerCase()

const autoDetectColumnType = (headerName, sampleValues) => {
  if (!headerName) return 'ignore'
  const header = normalizeHeader(headerName)

  const dateKeywords = [
    'date', 'fecha', 'data', 'datum', 'purchase', 'transaction', 'תאריך', 'רכישה'
  ]
  if (dateKeywords.some((keyword) => header.includes(keyword))) return 'date'
  const looksLikeDate = sampleValues.some((val) => /\d{1,4}[-/]\d{1,2}[-/]\d{1,4}/.test(val || ''))
  if (looksLikeDate) return 'date'

  const merchantKeywords = [
    'merchant', 'shop', 'store', 'business', 'vendor', 'description', 'name', 'comercio', 'negocio', 'בית עסק', 'שם'
  ]
  if (merchantKeywords.some((keyword) => header.includes(keyword))) return 'merchant'

  const amountKeywords = [
    'amount', 'total', 'price', 'sum', 'charge', 'סכום', 'cantidad', 'importe'
  ]

  if (header.includes('סכום חיוב') || header.includes('סכום לחיוב')) return 'amount'
  if (header.includes('billing') || header.includes('charged') || header.includes('חיוב')) return 'amount'
  if (amountKeywords.some((keyword) => header.includes(keyword))) return 'amount'
  const looksLikeAmount = sampleValues.some((val) => /[\d,.]+/.test(val || ''))
  if (looksLikeAmount) return 'amount'

  const notesKeywords = ['note', 'detail', 'description', 'comment', 'פירוט', 'הערה']
  if (notesKeywords.some((keyword) => header.includes(keyword))) return 'notes'

  return 'ignore'
}

const initializeColumnMappings = (headers, dataRows) => {
  const sampleValues = headers.map((_, colIndex) =>
    dataRows.slice(0, 5).map((row) => row[colIndex])
  )

  const mappings = headers.map((header, index) =>
    autoDetectColumnType(header, sampleValues[index])
  )

  const enforceUnique = (type) => {
    const indices = mappings
      .map((value, idx) => (value === type ? idx : -1))
      .filter((idx) => idx >= 0)
    if (indices.length <= 1) return
    indices.slice(1).forEach((idx) => {
      mappings[idx] = 'ignore'
    })
  }

  enforceUnique('date')
  enforceUnique('merchant')
  enforceUnique('amount')

  return mappings
}

const validateMappings = (mappings) => {
  const count = (value) => mappings.filter((m) => m === value).length
  const hasDate = count('date') === 1
  const hasMerchant = count('merchant') === 1
  const hasAmount = count('amount') === 1

  return {
    isValid: hasDate && hasMerchant && hasAmount,
    errors: {
      date: hasDate ? null : 'Map exactly one Date column',
      merchant: hasMerchant ? null : 'Map exactly one Merchant column',
      amount: hasAmount ? null : 'Map exactly one Amount column',
    },
  }
}

const isValidDateString = (value) => {
  if (!value) return false
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  if (year < 1950 || year > 2050) {
    console.warn('Date out of valid range:', value)
    return false
  }
  const date = new Date(year, month - 1, day)
  return (
    date.getFullYear() === year
    && date.getMonth() === month - 1
    && date.getDate() === day
  )
}

const parseFlexibleDate = (dateValue) => {
  if (!dateValue) return null

  if (dateValue instanceof Date) {
    if (Number.isNaN(dateValue.getTime())) return null
    const year = dateValue.getFullYear()
    const month = String(dateValue.getMonth() + 1).padStart(2, '0')
    const day = String(dateValue.getDate()).padStart(2, '0')
    const result = `${year}-${month}-${day}`
    return isValidDateString(result) ? result : null
  }

  const dateStr = dateValue.toString().trim()
  if (!dateStr) return null

  const asNumber = parseFloat(dateStr)
  if (!Number.isNaN(asNumber) && asNumber > 1000 && asNumber < 100000) {
    // Use UTC so the calendar date is the same in every timezone (Excel serial = day count, not a moment)
    const excelEpochUtc = Date.UTC(1899, 11, 30)
    const date = new Date(excelEpochUtc + asNumber * 86400000)
    if (!Number.isNaN(date.getTime())) {
      const year = date.getUTCFullYear()
      const month = String(date.getUTCMonth() + 1).padStart(2, '0')
      const day = String(date.getUTCDate()).padStart(2, '0')
      const result = `${year}-${month}-${day}`
      return isValidDateString(result) ? result : null
    }
  }

  if (isValidDateString(dateStr)) {
    return dateStr
  }

  // Parse DD/MM/YYYY or DD-MM-YYYY format (Israeli/European format)
  const dmyMatch = dateStr.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/)
  if (dmyMatch) {
    let [, firstNum, secondNum, year] = dmyMatch
    if (year.length > 4) return null
    if (year.length === 2) {
      const yearNum = parseInt(year, 10)
      year = yearNum <= 50 ? `20${year}` : `19${year}`
    }

    // ALWAYS assume DD/MM/YYYY format (Israeli locale)
    // Only swap if it's definitively wrong (first number > 12)
    let day = firstNum
    let month = secondNum
    
    const firstNumInt = parseInt(firstNum, 10)
    const secondNumInt = parseInt(secondNum, 10)
    
    // If first number > 12, it must be day (DD/MM/YYYY)
    if (firstNumInt > 12 && secondNumInt <= 12) {
      day = firstNum
      month = secondNum
    }
    // If second number > 12, it must be month is wrong, so swap (MM/DD/YYYY -> DD/MM/YYYY)
    else if (secondNumInt > 12 && firstNumInt <= 12) {
      day = secondNum
      month = firstNum
    }
    // If both ≤12, assume DD/MM/YYYY (Israeli format)
    else {
      day = firstNum
      month = secondNum
    }

    const dayNum = parseInt(day, 10)
    const monthNum = parseInt(month, 10)
    if (dayNum < 1 || dayNum > 31) {
      console.warn('Invalid day:', dayNum, 'in date:', dateStr)
      return null
    }
    if (monthNum < 1 || monthNum > 12) {
      console.warn('Invalid month:', monthNum, 'in date:', dateStr)
      return null
    }

    day = day.padStart(2, '0')
    month = month.padStart(2, '0')
    const result = `${year}-${month}-${day}`
    return isValidDateString(result) ? result : null
  }

  const ymdMatch = dateStr.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/)
  if (ymdMatch) {
    const [, year, month, day] = ymdMatch
    const result = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    return isValidDateString(result) ? result : null
  }

  // Last resort: try native Date parsing (WARNING: may use MM/DD/YYYY format)
  // This should rarely be reached if the above patterns are comprehensive
  console.warn('Date parsing fallback used for:', dateStr, '- may produce incorrect results')
  const parsed = new Date(dateStr)
  if (!Number.isNaN(parsed.getTime())) {
    const year = parsed.getFullYear()
    const month = String(parsed.getMonth() + 1).padStart(2, '0')
    const day = String(parsed.getDate()).padStart(2, '0')
    const result = `${year}-${month}-${day}`
    console.warn('Fallback parsed as:', result)
    return isValidDateString(result) ? result : null
  }

  console.warn('Failed to parse date:', dateStr)
  return null
}

const parseFlexibleAmount = (amountString) => {
  if (!amountString) return null
  let str = amountString.toString().trim()
  if (!str) return null

  str = str.replace(/[₪$€£¥฿₹]/g, '').replace(/\s/g, '')
  const isNegative = str.includes('(') && str.includes(')')
  str = str.replace(/[()]/g, '')

  const lastComma = str.lastIndexOf(',')
  const lastPeriod = str.lastIndexOf('.')
  if (lastComma > lastPeriod) {
    str = str.replace(/\./g, '').replace(',', '.')
  } else {
    str = str.replace(/,/g, '')
  }

  const amount = parseFloat(str)
  if (Number.isNaN(amount)) return null
  return isNegative ? -amount : amount
}

const cleanMerchantName = (merchantString) =>
  merchantString ? merchantString.toString().trim() : null

/**
 * Dynamically find the header row by searching for Hebrew/English column keywords
 * This handles Israeli credit card files where header position varies (row 10, 14, etc.)
 */
const detectHeaderRow = (rawData) => {
  // Hebrew and English keywords that indicate a transaction header row
  const headerKeywords = [
    'תאריך רכישה',   // Purchase date
    'תאריך עסקה',    // Transaction date
    'תאריך ערך',     // Value date (Fibi bank)
    'תאריך',         // Date
    'date',
    'שם בית עסק',    // Merchant name
    'בית עסק',       // Merchant
    'merchant',
    'description',
    'תיאור',         // Description (Fibi bank)
    'סכום חיוב',     // Billing amount
    'סכום עסקה',     // Transaction amount
    'סכום',          // Amount
    'amount',
    'total',
    'יתרה',          // Balance (Fibi bank)
    'זכות',          // Credit (Fibi bank)
    'חובה',          // Debit (Fibi bank)
    'מטבע',          // Currency
    'currency',
  ]

  // Search first 30 rows (header shouldn't be deeper than this)
  const searchLimit = Math.min(30, rawData.length)

  for (let i = 0; i < searchLimit; i++) {
    const row = rawData[i]

    if (!row || row.length === 0) continue

    // Convert row to searchable string
    const rowText = row
      .map((cell) => String(cell || '').trim())
      .join('|')
      .toLowerCase()

    // Count how many header keywords are present in this row
    const matchCount = headerKeywords.filter((keyword) =>
      rowText.includes(keyword.toLowerCase())
    ).length

    // If we find 2+ keywords, this is likely the header row
    if (matchCount >= 2) {
      console.log(`✅ Header detected at row ${i + 1} with ${matchCount} matching keywords`)
      return i
    }
  }

  // Fallback: use old logic if no header keywords found
  console.warn('⚠️ No header keywords found, falling back to text-based detection')
  for (let i = 0; i < Math.min(10, rawData.length); i++) {
    const row = rawData[i] || []
    const textCellCount = row.filter((cell) => cell && isNaN(cell)).length
    if (row.length > 0 && textCellCount >= row.length * 0.5) {
      return i
    }
  }

  return 0
}

/**
 * Extract data rows between header and footer
 * Stops when footer indicators are detected (totals, disclaimers, etc.)
 */
const extractDataRows = (rawData, headerRowIndex) => {
  const dataRows = []

  // Start from row after header
  for (let i = headerRowIndex + 1; i < rawData.length; i++) {
    const row = rawData[i]

    // Skip completely empty rows
    if (!row || row.every((cell) => !cell || String(cell).trim() === '')) {
      continue
    }

    // Detect footer rows and stop
    const firstCell = String(row[0] || '').toLowerCase().trim()
    const rowAsString = row.map((cell) => String(cell || '')).join('|').toLowerCase()

    // Footer indicators (Hebrew and English)
    if (
      firstCell.includes('סה"כ') ||              // Total (Hebrew)
      firstCell.includes('סך הכל') ||            // Sum (Hebrew)
      firstCell.includes('סך-הכל') ||            // Sum (Hebrew alt)
      firstCell.includes('total') ||             // Total (English)
      firstCell.includes('sum') ||               // Sum (English)
      firstCell.includes('עסקאות שבוצעו') ||     // Pending transactions (Hebrew)
      firstCell.includes('תנאים משפטיים') ||     // Legal terms (Hebrew)
      firstCell.includes('הערות') ||             // Notes/remarks (Hebrew)
      rowAsString.includes('סה"כ לחיוב') ||      // Total to charge (Hebrew)
      rowAsString.includes('total amount') ||    // Total amount (English)
      rowAsString.includes('grand total') ||     // Grand total (English)
      firstCell.length > 200 ||                  // Very long text (disclaimers)
      (firstCell.includes('disclaimer') || firstCell.includes('אחריות'))  // Disclaimer
    ) {
      console.log(`🛑 Stopped at row ${i + 1} - detected footer: "${firstCell.substring(0, 50)}..."`)
      break
    }

    // Additional check: if more than 50% of cells are empty, might be footer/separator
    const nonEmptyCells = row.filter((cell) => cell && String(cell).trim() !== '').length
    if (nonEmptyCells < row.length * 0.3 && i > headerRowIndex + 5) {
      // If very few cells have data and we're past a few rows, might be end of data
      console.log(`🛑 Stopped at row ${i + 1} - mostly empty row detected`)
      break
    }

    dataRows.push(row)
  }

  console.log(`📊 Extracted ${dataRows.length} data rows from ${headerRowIndex + 2} to ${headerRowIndex + 1 + dataRows.length}`)

  return dataRows
}

const generateHeaderSignature = (headers) =>
  [...headers]
    .map((header) => normalizeHeader(header))
    .sort()
    .join('|')

const buildMappingObject = (headers, mappings) => {
  const mappingObject = {}
  headers.forEach((header, index) => {
    const normalizedHeader = normalizeHeader(header)
    mappingObject[normalizedHeader] = mappings[index] || 'ignore'
  })
  return mappingObject
}

const reconstructMappings = (headers, savedMappings) =>
  headers.map((header) => savedMappings[normalizeHeader(header)] || 'ignore')

const generateTemplateName = (headers) => {
  const hasHebrew = headers.some((header) => /[\u0590-\u05FF]/.test(header))
  if (hasHebrew) return 'Hebrew Format'
  return 'Standard Format'
}

const UploadZone = ({ onConfirmUpload }) => {
  const { user } = useAuth()
  const fileInputRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)
  const [fileName, setFileName] = useState('')
  const [parsedRows, setParsedRows] = useState([])
  const [invalidCount, setInvalidCount] = useState(0)
  const [error, setError] = useState('')
  const [isParsing, setIsParsing] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [rawHeaders, setRawHeaders] = useState([])
  const [rawRows, setRawRows] = useState([])
  const [columnMappings, setColumnMappings] = useState([])
  const [isMappingOpen, setIsMappingOpen] = useState(false)
  const [headerSignature, setHeaderSignature] = useState('')
  const [mappingSource, setMappingSource] = useState('detected')
  const [templateName, setTemplateName] = useState('')
  const [duplicateCheckResult, setDuplicateCheckResult] = useState(null)
  const [forceImportDuplicates, setForceImportDuplicates] = useState(false)
  const [showDuplicates, setShowDuplicates] = useState(false)

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  const handleFile = async (file) => {
    setError('')
    setParsedRows([])
    setInvalidCount(0)
    setFileName(file.name)
    setIsParsing(true)

    try {
      let rawData = []
      if (file.name.toLowerCase().endsWith('.csv')) {
        const csvData = await new Promise((resolve, reject) => {
          Papa.parse(file, {
            encoding: 'UTF-8',
            skipEmptyLines: true,
            header: false,
            complete: (results) => resolve(results.data || []),
            error: reject,
          })
        })
        rawData = csvData
      } else if (file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')) {
        const arrayBuffer = await file.arrayBuffer()
        // Use raw values and no cellDates so date cells stay as Excel serials; we parse them as DD/MM in parseFlexibleDate
        const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: false })
        const worksheet = workbook.Sheets[workbook.SheetNames[0]]
        rawData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          raw: true,
          defval: '',
        })
        console.log(`📄 Excel file loaded: ${rawData.length} total rows`)
      } else {
        throw new Error('Unsupported file type. Please upload a CSV or XLSX file.')
      }

      if (!rawData.length) {
        throw new Error('No rows found in the file.')
      }

      const headerRowIndex = detectHeaderRow(rawData)
      const headers = (rawData[headerRowIndex] || []).map(
        (cell, idx) => (cell?.toString().trim() ? cell.toString().trim() : `Column ${idx + 1}`)
      )
      const dataRows = extractDataRows(rawData, headerRowIndex)

      const signature = generateHeaderSignature(headers)
      setHeaderSignature(signature)
      setRawHeaders(headers)
      setRawRows(dataRows)

      if (user?.id) {
        const { data: existingTemplate } = await supabase
          .from('csv_mapping_templates')
          .select('id, column_mappings, template_name, use_count')
          .eq('user_id', user.id)
          .eq('header_signature', signature)
          .order('last_used', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (existingTemplate?.column_mappings) {
          const savedMappings = reconstructMappings(headers, existingTemplate.column_mappings)
          setColumnMappings(savedMappings)
          setMappingSource('saved')
          setTemplateName(existingTemplate.template_name || '')
          setIsMappingOpen(true)

          await supabase
            .from('csv_mapping_templates')
            .update({
              use_count: (existingTemplate.use_count || 1) + 1,
            })
            .eq('id', existingTemplate.id)
          return
        }
      }

      const mappings = initializeColumnMappings(headers, dataRows)
      setColumnMappings(mappings)
      setMappingSource('detected')
      setTemplateName('')

      const validation = validateMappings(mappings)
      const normalizedHeaders = headers.map(normalizeHeader)
      const hasPerfectHeaders = normalizedHeaders.includes('date')
        && normalizedHeaders.includes('merchant')
        && normalizedHeaders.includes('amount')

      if (validation.isValid && hasPerfectHeaders) {
        await handleMappingConfirm(headers, dataRows, mappings)
      } else {
        setIsMappingOpen(true)
      }
    } catch (parseError) {
      setError(parseError.message || 'Failed to parse file.')
    } finally {
      setIsParsing(false)
    }
  }

  const filterDuplicates = async (newTransactions, userId) => {
    console.log('=== DUPLICATE DETECTION ===')
    console.log('Checking', newTransactions.length, 'new transactions')

    if (newTransactions.length === 0) {
      return { unique: [], duplicates: [], existingExpenses: [] }
    }

    const dates = newTransactions.map((t) => t.date)
    const minDate = dates.reduce((a, b) => (a < b ? a : b))
    const maxDate = dates.reduce((a, b) => (a > b ? a : b))

    console.log('Date range:', minDate, 'to', maxDate)

    // Use range to fetch up to 10,000 rows (removes default 1000 row limit)
    const { data: existingExpenses, error } = await supabase
      .from('expenses')
      .select('transaction_date, merchant, amount')
      .eq('user_id', userId)
      .gte('transaction_date', minDate)
      .lte('transaction_date', maxDate)
      .range(0, 9999)

    if (error) {
      console.error('Error fetching existing expenses:', error)
      return { unique: newTransactions, duplicates: [], existingExpenses: [] }
    }

    console.log('Found', existingExpenses.length, 'existing expenses in date range')

    const existingSignatures = new Set()
    existingExpenses.forEach((exp) => {
      const merchantName = exp.merchant?.toLowerCase().trim() || ''
      const signature = `${exp.transaction_date}|${merchantName}|${Math.round((exp.amount || 0) * 100)}`
      existingSignatures.add(signature)
    })

    console.log('Built', existingSignatures.size, 'unique signatures from existing expenses')

    const unique = []
    const duplicates = []

    newTransactions.forEach((transaction) => {
      const merchantName = transaction.merchant?.toLowerCase().trim() || ''
      const signature = `${transaction.date}|${merchantName}|${Math.round((transaction.amount || 0) * 100)}`

      if (existingSignatures.has(signature)) {
        duplicates.push(transaction)
        console.log('DUPLICATE:', transaction.merchant, transaction.date, '₪' + transaction.amount)
      } else {
        unique.push(transaction)
      }
    })

    console.log('Result:', unique.length, 'unique,', duplicates.length, 'duplicates')

    return { unique, duplicates, existingExpenses }
  }

  // Normalize merchant for matching: same key for "בע\"מ" / "בע'מ" / "בע׳מ", and for space/Unicode variants
  const normalizeMerchantKey = (str) => {
    if (!str || typeof str !== 'string') return ''
    let s = str.normalize('NFC').toLowerCase().trim()
    s = s.replace(/[\u0022\u0027\u05F3\u00B4\u2018\u2019\u201A\u201B\u201C\u201D\u201E\u201F\u2032\u2033]/g, "'")
    s = s.replace(/\s+/g, ' ').trim()
    // Strip RTL/LTR and other control chars that can differ between CSV and DB
    s = s.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '').trim()
    return s
  }

  const applyAutoTagging = async (transactions) => {
    // Use all distinct raw spellings so DB query matches (e.g. "בע\"מ" vs "בע'מ"); match uses normalized key
    const uniqueMerchants = Array.from(
      new Set(transactions.map((t) => t.merchant?.trim()).filter(Boolean))
    )

    if (!uniqueMerchants.length || !user?.id) {
      return transactions.map((t) => ({
        ...t,
        main_category: null,
        sub_category: null,
        is_auto_tagged: false,
      }))
    }

    // PostgREST reserves: , . : ( ) — and / breaks URLs. Wrap value in double quotes so
    // e.g. "APPLE.COM/BILL" is sent as one value; escape inner " as "".
    const escapeForIlike = (value) => value.replace(/[%_]/g, '\\$&')
    const needsQuotes = /[,.:()/]/
    const quoteValue = (value) => {
      const escaped = escapeForIlike(value)
      if (needsQuotes.test(escaped)) {
        return `"${escaped.replace(/"/g, '""')}"`
      }
      return escaped
    }
    // So one query matches DB rows with different quote/geresh or space: use _ (SQL single-char wildcard)
    const QUOTE_LIKE = /[\u0022\u0027\u05F3\u00B4\u2018\u2019\u201A\u201B\u201C\u201D\u201E\u201F\u2032\u2033]/g
    const merchantToIlikePattern = (raw) => {
      let s = raw.normalize('NFC').toLowerCase()
      s = escapeForIlike(s) // escape % and _ in original so they stay literal
      s = s.replace(QUOTE_LIKE, '_')
      // Match any Unicode whitespace so "נומנה קפה" matches "נומנה\u202Fקפה" (narrow no-break space)
      s = s.replace(/\s/g, '_')
      s = s.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '')
      return s
    }
    const ilikeFilters = uniqueMerchants
      .map((merchant) => `merchant.ilike.${quoteValue(merchantToIlikePattern(merchant))}`)
      .join(',')

    // Fetch ALL matching tagged rows for this user (paginate to bypass 1000 row limit)
    let patterns = []
    let from = 0
    const pageSize = 1000
    let hasMore = true
    while (hasMore) {
      const to = from + pageSize - 1
      const { data, error } = await supabase
        .from('expenses')
        .select('merchant, main_category, sub_category, transaction_date')
        .eq('user_id', user.id)
        .not('main_category', 'is', null)
        .or(ilikeFilters)
        .order('transaction_date', { ascending: false })
        .range(from, to)

      if (error) {
        console.error('Auto-tagging pattern fetch error:', error)
        break
      }
      if (data?.length) {
        patterns = patterns.concat(data)
        hasMore = data.length >= pageSize
        from += pageSize
      } else {
        hasMore = false
      }
    }

    const patternMap = patterns.reduce((acc, row) => {
      const key = normalizeMerchantKey(row.merchant)
      if (!key || acc[key]) return acc
      acc[key] = {
        main_category: row.main_category,
        sub_category: row.sub_category,
      }
      return acc
    }, {})

    return transactions.map((transaction) => {
      const match = patternMap[normalizeMerchantKey(transaction.merchant)]
      return {
        ...transaction,
        main_category: match?.main_category || null,
        sub_category: match?.sub_category || null,
        is_auto_tagged: Boolean(match),
      }
    })
  }

  const parseWithMappings = async (headers, dataRows, mappings) => {
    const dateIndex = mappings.indexOf('date')
    const merchantIndex = mappings.indexOf('merchant')
    const amountIndex = mappings.indexOf('amount')
    const notesIndex = mappings.indexOf('notes')

    const transactions = []
    let invalids = 0

    dataRows.forEach((row) => {
      if (!row || row.every((cell) => !cell)) return
      const date = parseFlexibleDate(row[dateIndex])
      const merchant = cleanMerchantName(row[merchantIndex])
      const amount = parseFlexibleAmount(row[amountIndex])
      const notes = notesIndex >= 0 ? row[notesIndex] : null

      if (!date || !merchant || amount === null) {
        invalids += 1
        return
      }

      transactions.push({
        date,
        merchant,
        amount,
        notes,
        currency: 'ILS',
      })
    })

    if (!transactions.length) {
      throw new Error('No valid rows found. Please check your mappings.')
    }

    // Check for duplicates
    const duplicateResult = await filterDuplicates(transactions, user.id)
    setDuplicateCheckResult(duplicateResult)

    // Apply auto-tagging to ALL transactions (unique + duplicates)
    const enhanced = await applyAutoTagging(transactions)
    setInvalidCount(invalids)
    setParsedRows(enhanced)
  }

  const handleMappingConfirm = async (headers, dataRows, mappings) => {
    const validation = validateMappings(mappings)
    if (!validation.isValid) {
      setError('Please map Date, Merchant, and Amount columns.')
      return
    }
    setIsMappingOpen(false)
    setIsParsing(true)
    try {
      await parseWithMappings(headers, dataRows, mappings)
    } catch (mappingError) {
      setError(mappingError.message || 'Failed to parse file.')
    } finally {
      setIsParsing(false)
    }
  }

  const saveMappingTemplate = async () => {
    if (!user?.id || !headerSignature || !rawHeaders.length) return
    const mappingObject = buildMappingObject(rawHeaders, columnMappings)

    const { data: existing } = await supabase
      .from('csv_mapping_templates')
      .select('id, use_count')
      .eq('user_id', user.id)
      .eq('header_signature', headerSignature)
      .maybeSingle()

    if (existing?.id) {
      await supabase
        .from('csv_mapping_templates')
        .update({
          column_mappings: mappingObject,
          use_count: (existing.use_count || 1) + 1,
        })
        .eq('id', existing.id)
      return
    }

    await supabase
      .from('csv_mapping_templates')
      .insert({
        user_id: user.id,
        header_signature: headerSignature,
        column_mappings: mappingObject,
        template_name: generateTemplateName(rawHeaders),
        use_count: 1,
      })
  }

  const handleResetMapping = async () => {
    if (!user?.id || !headerSignature) return
    await supabase
      .from('csv_mapping_templates')
      .delete()
      .eq('user_id', user.id)
      .eq('header_signature', headerSignature)

    const mappings = initializeColumnMappings(rawHeaders, rawRows)
    setColumnMappings(mappings)
    setMappingSource('detected')
    setTemplateName('')
  }

  const handleConfirmUpload = async () => {
    if (!parsedRows.length || !onConfirmUpload || !duplicateCheckResult) return

    // Determine what to import based on duplicate detection and user choice
    let toImport = []

    if (forceImportDuplicates) {
      // User chose to import everything including duplicates
      toImport = parsedRows
    } else {
      // Only import unique transactions
      const uniqueSignatures = new Set(
        duplicateCheckResult.unique.map((t) => {
          const merchantName = t.merchant?.toLowerCase().trim() || ''
          return `${t.date}|${merchantName}|${Math.round((t.amount || 0) * 100)}`
        })
      )

      toImport = parsedRows.filter((row) => {
        const merchantName = row.merchant?.toLowerCase().trim() || ''
        const signature = `${row.date}|${merchantName}|${Math.round((row.amount || 0) * 100)}`
        return uniqueSignatures.has(signature)
      })
    }

    if (toImport.length === 0) {
      setError('No transactions to import.')
      return
    }

    setIsUploading(true)
    // Pass file name as upload_id so batches can be recognized and reverted
    const success = await onConfirmUpload(toImport, fileName || null)
    setIsUploading(false)
    if (success) {
      await saveMappingTemplate()
      setParsedRows([])
      setFileName('')
      setInvalidCount(0)
      setDuplicateCheckResult(null)
      setForceImportDuplicates(false)
      setShowDuplicates(false)
    }
  }

  const validation = useMemo(() => validateMappings(columnMappings), [columnMappings])
  const validRowCount = useMemo(() => {
    const dateIndex = columnMappings.indexOf('date')
    const merchantIndex = columnMappings.indexOf('merchant')
    const amountIndex = columnMappings.indexOf('amount')
    if (dateIndex < 0 || merchantIndex < 0 || amountIndex < 0) return 0

    let count = 0
    rawRows.forEach((row) => {
      if (!row || row.every((cell) => !cell)) return
      const date = parseFlexibleDate(row[dateIndex])
      const merchant = cleanMerchantName(row[merchantIndex])
      const amount = parseFlexibleAmount(row[amountIndex])
      if (date && merchant && amount !== null) count += 1
    })
    return count
  }, [columnMappings, rawRows])

  return (
    <div className="space-y-6">
      {/* Drag and Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-12 text-center transition-all duration-300 ease-in-out ${
          isDragging
            ? 'border-teal bg-teal/5'
            : 'border-gray-300 hover:border-teal/50 bg-white'
        }`}
      >
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-teal-50">
          <Upload
            size={28}
            className={`${isDragging ? 'text-teal' : 'text-teal-600'}`}
          />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Drop your expense file here
        </h3>
        <p className="text-sm font-medium text-gray-600 mb-6">
          Supports CSV and XLSX files
        </p>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="btn-primary"
        >
          {isParsing ? 'Parsing...' : 'Choose File'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
      </div>

      {/* Sample File Link */}
      <div className="card card-hover">
        <div className="flex items-center gap-3 text-gray-700">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-50">
            <FileText size={24} className="text-teal-600" />
          </div>
          <div>
            <p className="font-medium">Need a sample file?</p>
            <a
              href="#"
              className="text-blue-600 hover:text-blue-700 text-sm"
              onClick={(e) => e.preventDefault()}
            >
              Download sample CSV template
            </a>
          </div>
        </div>
      </div>

      {error && (
        <div className="border border-red-200 bg-red-50 rounded-lg p-4 text-sm text-red-700 flex items-start gap-2">
          <AlertTriangle size={18} className="mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <ColumnMappingModal
        isOpen={isMappingOpen}
        headers={rawHeaders}
        dataRows={rawRows}
        mappings={columnMappings}
        onChangeMappings={setColumnMappings}
        onCancel={() => setIsMappingOpen(false)}
        onConfirm={() => handleMappingConfirm(rawHeaders, rawRows, columnMappings)}
        validation={validation}
        validRowCount={validRowCount}
        mappingSource={mappingSource}
        templateName={templateName}
        onResetMapping={handleResetMapping}
      />

      {parsedRows.length > 0 && (
        <div className="card card-hover">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-600">Preview</p>
              <h4 className="text-lg font-semibold text-gray-900">{fileName}</h4>
              <p className="text-xs text-gray-500 mt-1">
                {parsedRows.length} valid row{parsedRows.length !== 1 ? 's' : ''}{invalidCount ? ` • ${invalidCount} invalid` : ''}
              </p>
            </div>
            <button
              onClick={handleConfirmUpload}
              disabled={isUploading || (duplicateCheckResult && duplicateCheckResult.unique.length === 0 && !forceImportDuplicates)}
              className="btn-primary disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isUploading ? 'Uploading...' : 'Confirm Upload'}
            </button>
          </div>

          {/* Duplicate Detection Results */}
          {duplicateCheckResult && (
            <div className="space-y-4 mb-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-4">
                {/* Unique Transactions */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-green-900">
                        {duplicateCheckResult.unique.length}
                      </div>
                      <div className="text-sm text-green-700 mt-1">
                        New transactions
                      </div>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                </div>

                {/* Duplicate Transactions */}
                <div className={`border rounded-lg p-4 ${
                  duplicateCheckResult.duplicates.length > 0
                    ? 'bg-orange-50 border-orange-200'
                    : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className={`text-2xl font-bold ${
                        duplicateCheckResult.duplicates.length > 0
                          ? 'text-orange-900'
                          : 'text-gray-900'
                      }`}>
                        {duplicateCheckResult.duplicates.length}
                      </div>
                      <div className={`text-sm mt-1 ${
                        duplicateCheckResult.duplicates.length > 0
                          ? 'text-orange-700'
                          : 'text-gray-700'
                      }`}>
                        Duplicates found
                      </div>
                    </div>
                    {duplicateCheckResult.duplicates.length > 0 ? (
                      <AlertCircle className="w-8 h-8 text-orange-600" />
                    ) : (
                      <CheckCircle className="w-8 h-8 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Total */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-blue-900">
                        {parsedRows.length}
                      </div>
                      <div className="text-sm text-blue-700 mt-1">
                        Total in file
                      </div>
                    </div>
                    <FileText className="w-8 h-8 text-blue-600" />
                  </div>
                </div>
              </div>

              {/* Duplicate Warning & Override */}
              {duplicateCheckResult.duplicates.length > 0 && (
                <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-orange-900 mb-1">
                        Duplicate Transactions Detected
                      </h3>
                      <p className="text-sm text-orange-800 mb-3">
                        {duplicateCheckResult.duplicates.length} transaction{duplicateCheckResult.duplicates.length > 1 ? 's' : ''}
                        {' '}already exist in your database (same date, merchant, and amount).
                        By default, these will be skipped to prevent duplicates.
                      </p>

                      {/* Show/Hide Duplicates */}
                      <button
                        onClick={() => setShowDuplicates(!showDuplicates)}
                        className="text-sm text-orange-700 hover:text-orange-900 underline mb-3"
                      >
                        {showDuplicates ? 'Hide' : 'Show'} duplicate transactions
                      </button>

                      {/* Duplicate List */}
                      {showDuplicates && (
                        <div className="bg-white border border-orange-200 rounded-lg p-3 mb-3 max-h-48 overflow-y-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-orange-200">
                                <th className="text-left py-1 px-2">Date</th>
                                <th className="text-right py-1 px-2">Merchant</th>
                                <th className="text-right py-1 px-2">Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {duplicateCheckResult.duplicates.map((dup, idx) => (
                                <tr key={idx} className="border-b border-orange-100 last:border-0">
                                  <td className="py-1 px-2">{formatDateDisplay(dup.date)}</td>
                                  <td className="py-1 px-2 text-right" dir="rtl">{dup.merchant}</td>
                                  <td className="py-1 px-2 text-right">₪{dup.amount.toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Override Checkbox */}
                      <label className="flex items-center gap-2 cursor-pointer bg-white border border-orange-200 rounded-lg p-3 hover:bg-orange-50 transition-colors">
                        <input
                          type="checkbox"
                          checked={forceImportDuplicates}
                          onChange={(e) => setForceImportDuplicates(e.target.checked)}
                          className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                        />
                        <span className="text-sm font-medium text-orange-900">
                          Import duplicates anyway (I know what I'm doing)
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* No Duplicates - All Clear */}
              {duplicateCheckResult.duplicates.length === 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <p className="text-sm text-green-800">
                    No duplicates detected. All transactions are new.
                  </p>
                </div>
              )}

              {/* Import Summary */}
              <div className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-3">
                {forceImportDuplicates
                  ? `Importing ${duplicateCheckResult.unique.length + duplicateCheckResult.duplicates.length} transactions (including ${duplicateCheckResult.duplicates.length} duplicates)`
                  : duplicateCheckResult.duplicates.length > 0
                    ? `Importing ${duplicateCheckResult.unique.length} new transactions (skipping ${duplicateCheckResult.duplicates.length} duplicates)`
                    : `Importing ${duplicateCheckResult.unique.length} transactions`
                }
              </div>
            </div>
          )}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Merchant</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Category</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {parsedRows.slice(0, 25).map((row, index) => (
                  <tr key={`${row.merchant}-${index}`}>
                    <td className="px-4 py-2 text-sm text-gray-700">{formatDateDisplay(row.date)}</td>
                    <td className="px-4 py-2 text-sm text-gray-900 font-medium">{row.merchant}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      ₪{row.amount.toLocaleString('he-IL', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-700">
                      {row.main_category ? `${row.main_category}${row.sub_category ? ` / ${row.sub_category}` : ''}` : '—'}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      {row.is_auto_tagged ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-800">
                          Auto-tagged
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">
                          Needs tagging
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
          {parsedRows.length > 25 && (
            <p className="text-xs text-gray-500 mt-3">Showing first 25 rows</p>
          )}
        </div>
      )}
    </div>
  )
}

export default UploadZone
