const ColumnDropdown = ({ value, onChange }) => {
  const options = [
    { value: 'date', label: 'Date' },
    { value: 'merchant', label: 'Merchant' },
    { value: 'amount', label: 'Amount' },
    { value: 'notes', label: 'Notes' },
    { value: 'ignore', label: 'Ignore' },
  ]

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

export default ColumnDropdown
