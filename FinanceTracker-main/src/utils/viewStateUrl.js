/**
 * Serialize/deserialize Detailed Reports view state to/from URL search params.
 * Enables back/forward and refresh to restore the same view.
 */

const PARAM_FROM = 'from'
const PARAM_TO = 'to'
const PARAM_VIEW = 'view'
const PARAM_MIN = 'min'
const PARAM_MAX = 'max'
const PARAM_MERCHANT = 'merchant'
const PARAM_EXCEPTIONAL = 'exc'
const PARAM_UNCATEGORIZED = 'uncat'
const PARAM_GROUP = 'group'
const PARAM_SECONDARY = 'sub'
const PARAM_CHART = 'chart'
const PARAM_PCT = 'pct'

/**
 * Parse URL search params into Detailed page state (or null if no params).
 * @param {URLSearchParams} searchParams
 * @returns {Object|null} State to apply or null if use defaults
 */
export function parseDetailedStateFromUrl(searchParams) {
  const from = searchParams.get(PARAM_FROM)
  const to = searchParams.get(PARAM_TO)
  if (!from || !to) return null

  const view = searchParams.get(PARAM_VIEW)
  const minAmount = searchParams.get(PARAM_MIN) ?? ''
  const maxAmount = searchParams.get(PARAM_MAX) ?? ''
  const merchant = searchParams.get(PARAM_MERCHANT) ?? ''
  const includeExceptional = searchParams.get(PARAM_EXCEPTIONAL) !== '0'
  const excludeUncategorized = searchParams.get(PARAM_UNCATEGORIZED) === '1'
  const groupBy = searchParams.get(PARAM_GROUP) || 'main_category'
  const secondaryGroupBy = searchParams.get(PARAM_SECONDARY) || null
  const chartType = searchParams.get(PARAM_CHART) || 'pie'
  const showPercentages = searchParams.get(PARAM_PCT) !== '0'

  const fromDate = parseDate(from)
  const toDate = parseDate(to)
  if (!fromDate || !toDate) return null

  return {
    dateRange: { from: fromDate, to: toDate },
    viewMode: view === 'balance' ? 'balance' : 'breakdown',
    filters: {
      minAmount,
      maxAmount,
      merchant,
      includeExceptional,
      excludeUncategorized,
    },
    groupBy: validGroupBy(groupBy) ? groupBy : 'main_category',
    secondaryGroupBy: validGroupBy(secondaryGroupBy) ? secondaryGroupBy : null,
    chartType: ['pie', 'bar', 'line'].includes(chartType) ? chartType : 'pie',
    showPercentages,
  }
}

function parseDate(str) {
  if (!str || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return null
  const d = new Date(str + 'T12:00:00')
  return Number.isNaN(d.getTime()) ? null : d
}

function validGroupBy(v) {
  return v && ['main_category', 'sub_category', 'merchant', 'date'].includes(v)
}

/**
 * Build URL search params from Detailed page state.
 * @param {Object} state - dateRange, viewMode, filters, groupBy, secondaryGroupBy, chartType, showPercentages
 * @returns {URLSearchParams}
 */
export function buildDetailedUrlParams(state) {
  const p = new URLSearchParams()
  const { dateRange, viewMode, filters, groupBy, secondaryGroupBy, chartType, showPercentages } = state
  if (!dateRange?.from || !dateRange?.to) return p

  p.set(PARAM_FROM, formatDateForParam(dateRange.from))
  p.set(PARAM_TO, formatDateForParam(dateRange.to))
  p.set(PARAM_VIEW, viewMode === 'balance' ? 'balance' : 'breakdown')
  if (filters?.minAmount) p.set(PARAM_MIN, String(filters.minAmount))
  if (filters?.maxAmount) p.set(PARAM_MAX, String(filters.maxAmount))
  if (filters?.merchant) p.set(PARAM_MERCHANT, filters.merchant)
  if (!filters?.includeExceptional) p.set(PARAM_EXCEPTIONAL, '0')
  if (filters?.excludeUncategorized) p.set(PARAM_UNCATEGORIZED, '1')
  if (groupBy && groupBy !== 'main_category') p.set(PARAM_GROUP, groupBy)
  if (secondaryGroupBy) p.set(PARAM_SECONDARY, secondaryGroupBy)
  if (chartType && chartType !== 'pie') p.set(PARAM_CHART, chartType)
  if (!showPercentages) p.set(PARAM_PCT, '0')
  return p
}

function formatDateForParam(d) {
  const date = d instanceof Date ? d : new Date(d)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// --- Dashboard ---
const DASH_FROM = 'from'
const DASH_TO = 'to'
const DASH_EXC = 'exc'

export function parseDashboardStateFromUrl(searchParams) {
  const from = searchParams.get(DASH_FROM)
  const to = searchParams.get(DASH_TO)
  if (!from || !to) return null
  const fromDate = parseDate(from)
  const toDate = parseDate(to)
  if (!fromDate || !toDate) return null
  const includeExceptional = searchParams.get(DASH_EXC) !== '0'
  return {
    dateRange: { from: fromDate, to: toDate },
    includeExceptional,
  }
}

export function buildDashboardUrlParams(state) {
  const p = new URLSearchParams()
  const { dateRange, includeExceptional } = state
  if (!dateRange?.from || !dateRange?.to) return p
  p.set(DASH_FROM, formatDateForParam(dateRange.from))
  p.set(DASH_TO, formatDateForParam(dateRange.to))
  if (!includeExceptional) p.set(DASH_EXC, '0')
  return p
}

// --- Tagging ---
const TAG_FROM = 'from'
const TAG_TO = 'to'
const TAG_MAIN = 'main'
const TAG_SUB = 'sub'
const TAG_Q = 'q'
const TAG_UPLOAD = 'upload'
const TAG_EXC = 'exc'
const TAG_EXP = 'exp'
const TAG_INC = 'inc'
const TAG_UNC = 'unc'
const TAG_AUTO = 'auto'
const TAG_MISS = 'miss'

export function parseTaggingStateFromUrl(searchParams) {
  const hasAny =
    searchParams.has(TAG_FROM) ||
    searchParams.has(TAG_TO) ||
    searchParams.has(TAG_MAIN) ||
    searchParams.has(TAG_SUB) ||
    searchParams.has(TAG_Q) ||
    searchParams.has(TAG_UPLOAD) ||
    searchParams.has(TAG_EXC) ||
    searchParams.has(TAG_EXP) ||
    searchParams.has(TAG_INC) ||
    searchParams.has(TAG_UNC) ||
    searchParams.has(TAG_AUTO) ||
    searchParams.has(TAG_MISS)
  if (!hasAny) return null
  const from = searchParams.get(TAG_FROM) ?? ''
  const to = searchParams.get(TAG_TO) ?? ''
  const mainCategory = searchParams.get(TAG_MAIN) ?? ''
  const subCategory = searchParams.get(TAG_SUB) ?? ''
  const searchMerchant = searchParams.get(TAG_Q) ?? ''
  const uploadId = searchParams.get(TAG_UPLOAD) ?? ''
  const exc = searchParams.get(TAG_EXC)
  const showExceptional = exc === null ? null : exc === '1'
  return {
    filters: {
      dateFrom: from,
      dateTo: to,
      mainCategory,
      subCategory,
      searchMerchant,
      uploadId,
      showExceptional,
      showOnlyExpenses: searchParams.get(TAG_EXP) === '1',
      showOnlyIncome: searchParams.get(TAG_INC) === '1',
      showUncategorized: searchParams.get(TAG_UNC) === '1',
      showAutoTagged: searchParams.get(TAG_AUTO) === '1',
      showOnlyMissingSubCategory: searchParams.get(TAG_MISS) === '1',
    },
  }
}

export function buildTaggingUrlParams(filters) {
  const p = new URLSearchParams()
  if (!filters) return p
  if (filters.dateFrom) p.set(TAG_FROM, filters.dateFrom)
  if (filters.dateTo) p.set(TAG_TO, filters.dateTo)
  if (filters.mainCategory) p.set(TAG_MAIN, filters.mainCategory)
  if (filters.subCategory) p.set(TAG_SUB, filters.subCategory)
  if (filters.searchMerchant) p.set(TAG_Q, filters.searchMerchant)
  if (filters.uploadId) p.set(TAG_UPLOAD, filters.uploadId)
  if (filters.showExceptional !== null) p.set(TAG_EXC, filters.showExceptional ? '1' : '0')
  if (filters.showOnlyExpenses) p.set(TAG_EXP, '1')
  if (filters.showOnlyIncome) p.set(TAG_INC, '1')
  if (filters.showUncategorized) p.set(TAG_UNC, '1')
  if (filters.showAutoTagged) p.set(TAG_AUTO, '1')
  if (filters.showOnlyMissingSubCategory) p.set(TAG_MISS, '1')
  return p
}
