import { useRef, useState } from 'react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { Upload, FileText, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabase'

const REQUIRED_HEADERS = {
  date: ['date', 'transaction date', 'posted date'],
  merchant: ['merchant', 'description', 'payee', 'vendor'],
  amount: ['amount', 'debit', 'value', 'total'],
}

const normalizeHeader = (header) => header?.toString().trim().toLowerCase()

const detectColumnMap = (headers) => {
  const normalized = headers.map(normalizeHeader)
  const findKey = (keys) => normalized.findIndex((h) => keys.includes(h))
  const dateIndex = findKey(REQUIRED_HEADERS.date)
  const merchantIndex = findKey(REQUIRED_HEADERS.merchant)
  const amountIndex = findKey(REQUIRED_HEADERS.amount)
  if (dateIndex === -1 || merchantIndex === -1 || amountIndex === -1) return null
  return {
    dateKey: headers[dateIndex],
    merchantKey: headers[merchantIndex],
    amountKey: headers[amountIndex],
  }
}

const parseExcelDate = (serial) => {
  const utcDays = Math.floor(serial - 25569)
  const utcValue = utcDays * 86400
  return new Date(utcValue * 1000)
}

const parseDateValue = (value) => {
  if (!value) return null
  if (value instanceof Date) return value
  if (typeof value === 'number') return parseExcelDate(value)

  const str = value.toString().trim()
  if (!str) return null

  // ISO or dash format
  const iso = new Date(str)
  if (!Number.isNaN(iso.getTime())) return iso

  // Slash formats
  const parts = str.split('/')
  if (parts.length === 3) {
    const [p1, p2, p3] = parts.map((p) => parseInt(p, 10))
    if (p1 > 12) {
      return new Date(p3, p2 - 1, p1)
    }
    return new Date(p3, p1 - 1, p2)
  }

  return null
}

const parseAmount = (value) => {
  if (typeof value === 'number') return value
  if (!value) return null
  const cleaned = value.toString().replace(/[,$]/g, '').replace(/[^\d.-]/g, '')
  const parsed = parseFloat(cleaned)
  return Number.isNaN(parsed) ? null : parsed
}

const normalizeRows = (rows, columnMap) => {
  const validRows = []
  let invalidCount = 0

  rows.forEach((row) => {
    const dateValue = parseDateValue(row[columnMap.dateKey])
    const merchant = row[columnMap.merchantKey]?.toString().trim()
    const amountValue = parseAmount(row[columnMap.amountKey])

    if (!dateValue || !merchant || amountValue === null) {
      invalidCount += 1
      return
    }

    validRows.push({
      date: dateValue,
      merchant,
      amount: amountValue,
    })
  })

  return { validRows, invalidCount }
}

const UploadZone = ({ onConfirmUpload }) => {
  const fileInputRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)
  const [fileName, setFileName] = useState('')
  const [parsedRows, setParsedRows] = useState([])
  const [invalidCount, setInvalidCount] = useState(0)
  const [error, setError] = useState('')
  const [isParsing, setIsParsing] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

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
      let rows = []
      if (file.name.toLowerCase().endsWith('.csv')) {
        const csvData = await new Promise((resolve, reject) => {
          Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => resolve(results.data || []),
            error: reject,
          })
        })
        rows = csvData
      } else if (file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')) {
        const arrayBuffer = await file.arrayBuffer()
        const workbook = XLSX.read(arrayBuffer, { type: 'array' })
        const worksheet = workbook.Sheets[workbook.SheetNames[0]]
        rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' })
      } else {
        throw new Error('Unsupported file type. Please upload a CSV or XLSX file.')
      }

      if (!rows.length) {
        throw new Error('No rows found in the file.')
      }

      const headers = Object.keys(rows[0])
      const columnMap = detectColumnMap(headers)
      if (!columnMap) {
        throw new Error('Required columns not found. Ensure Date, Merchant, and Amount are present.')
      }

      const { validRows, invalidCount: invalids } = normalizeRows(rows, columnMap)
      if (!validRows.length) {
        throw new Error('No valid rows found. Please check your file formatting.')
      }

      const uniqueMerchants = Array.from(
        new Set(validRows.map((row) => row.merchant.toLowerCase().trim()).filter(Boolean))
      )

      const escapeForIlike = (value) => value.replace(/[%_]/g, '\\$&')
      const ilikeFilters = uniqueMerchants
        .map((merchant) => `merchant.ilike.${escapeForIlike(merchant)}`)
        .join(',')

      const { data: existingPatterns } = uniqueMerchants.length
        ? await supabase
          .from('expenses')
          .select('merchant, main_category, sub_category, transaction_date')
          .not('main_category', 'is', null)
          .or(ilikeFilters)
          .order('transaction_date', { ascending: false })
        : { data: [] }

      const patternMap = (existingPatterns || []).reduce((acc, row) => {
        const key = row.merchant?.toLowerCase().trim()
        if (!key || acc[key]) return acc
        acc[key] = {
          main_category: row.main_category,
          sub_category: row.sub_category,
        }
        return acc
      }, {})

      const enrichedRows = validRows.map((row) => {
        const match = patternMap[row.merchant.toLowerCase().trim()]
        return {
          ...row,
          main_category: match?.main_category || null,
          sub_category: match?.sub_category || null,
          is_auto_tagged: Boolean(match),
        }
      })

      setParsedRows(enrichedRows)
      setInvalidCount(invalids)
    } catch (parseError) {
      setError(parseError.message || 'Failed to parse file.')
    } finally {
      setIsParsing(false)
    }
  }

  const handleConfirmUpload = async () => {
    if (!parsedRows.length || !onConfirmUpload) return
    setIsUploading(true)
    const success = await onConfirmUpload(parsedRows)
    setIsUploading(false)
    if (success) {
      setParsedRows([])
      setFileName('')
      setInvalidCount(0)
    }
  }

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
              disabled={isUploading}
              className="btn-primary disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isUploading ? 'Uploading...' : 'Confirm Upload'}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Merchant</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Category</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {parsedRows.slice(0, 6).map((row, index) => (
                  <tr key={`${row.merchant}-${index}`}>
                    <td className="px-4 py-2 text-sm text-gray-700">{row.date.toLocaleDateString()}</td>
                    <td className="px-4 py-2 text-sm text-gray-900 font-medium">{row.merchant}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">${row.amount.toFixed(2)}</td>
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
          {parsedRows.length > 6 && (
            <p className="text-xs text-gray-500 mt-3">Showing first 6 rows</p>
          )}
        </div>
      )}
    </div>
  )
}

export default UploadZone
