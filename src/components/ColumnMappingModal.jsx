import ColumnDropdown from './ColumnDropdown'
import ValidationStatus from './ValidationStatus'

const ColumnMappingModal = ({
  isOpen,
  headers,
  dataRows,
  mappings,
  onChangeMappings,
  onCancel,
  onConfirm,
  validation,
  validRowCount,
  mappingSource,
  templateName,
  onResetMapping,
}) => {
  if (!isOpen) return null

  const handleMappingChange = (index, value) => {
    const nextMappings = [...mappings]
    nextMappings[index] = value
    onChangeMappings(nextMappings)
  }

  const getSampleValues = (index) =>
    dataRows
      .slice(0, 3)
      .map((row) => row[index])
      .filter((value) => value !== undefined && value !== null && value !== '')

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6">
      <div className="w-full max-w-6xl max-h-[90vh] bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col">
        <div className="px-4 sm:px-6 py-4 border-b shrink-0">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
            Map Your CSV Columns
          </h2>
          {mappingSource === 'saved' ? (
            <div className="mt-2 flex items-center gap-2 text-sm text-teal">
              <span className="font-medium">
                Using saved mapping{templateName ? `: ${templateName}` : ''}
              </span>
            </div>
          ) : (
            <p className="text-sm text-gray-600 mt-1">
              Match your file columns to the required fields
            </p>
          )}

          <div className="flex flex-wrap gap-3 mt-3">
            <ValidationStatus mappings={mappings} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {headers.map((header, index) => (
              <div
                key={`${header}-${index}`}
                className="border border-gray-200 rounded-lg p-4 hover:border-teal transition-colors bg-white"
              >
                <label className="block text-sm font-medium text-gray-700 mb-2 text-right" dir="auto">
                  {header}
                </label>
                <ColumnDropdown
                  value={mappings[index]}
                  onChange={(value) => handleMappingChange(index, value)}
                />
                <div className="mt-2 text-xs text-gray-500 truncate text-right" dir="auto">
                  Sample: {getSampleValues(index).slice(0, 2).join(', ') || '—'}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Preview (First 5 Rows)
            </h3>
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {headers.map((header, i) => (
                      <th
                        key={`${header}-${i}`}
                        className="px-3 py-2 text-xs font-medium text-gray-700 text-right"
                        dir="auto"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {dataRows.slice(0, 5).map((row, rowIndex) => (
                    <tr key={`preview-${rowIndex}`} className="hover:bg-gray-50">
                      {row.map((cell, cellIndex) => (
                        <td
                          key={`preview-${rowIndex}-${cellIndex}`}
                          className="px-3 py-2 text-gray-600 text-right whitespace-nowrap"
                          dir="auto"
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {!validation.isValid && (
            <div className="mt-4 border border-yellow-200 bg-yellow-50 rounded-lg p-3 text-sm text-yellow-700">
              {validation.errors.date || validation.errors.merchant || validation.errors.amount}
            </div>
          )}
        </div>

        <div className="px-4 sm:px-6 py-4 border-t bg-gray-50 flex flex-col sm:flex-row gap-3 justify-between shrink-0">
          <div className="flex flex-col sm:flex-row gap-3">
            <button className="btn-secondary" onClick={onCancel}>Cancel</button>
            {mappingSource === 'saved' && (
              <button
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
                onClick={onResetMapping}
                type="button"
              >
                Reset Mapping
              </button>
            )}
          </div>
          <button className="btn-primary" onClick={onConfirm} disabled={!validation.isValid}>
            Import {validRowCount || 0} Transactions
          </button>
        </div>
      </div>
    </div>
  )
}

export default ColumnMappingModal
