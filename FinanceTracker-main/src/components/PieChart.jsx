import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { PieChart } from 'lucide-react'

const COLORS = [
  'rgba(20, 184, 166, 0.9)',
  'rgba(99, 102, 241, 0.85)',
  'rgba(14, 165, 233, 0.8)',
  'rgba(245, 158, 11, 0.85)',
  'rgba(16, 185, 129, 0.85)',
  'rgba(239, 68, 68, 0.85)',
  'rgba(139, 92, 246, 0.85)',
  'rgba(236, 72, 153, 0.85)',
]

const PieChartComponent = ({ data, selectedCategory, onCategoryClick }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0)

  const formatAmount = (amount) =>
    `₪${amount.toLocaleString('he-IL', { minimumFractionDigits: 2 })}`

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0]
      const percentage = ((data.value / total) * 100).toFixed(1)
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">{data.name}</p>
          <p className="text-teal font-medium">{formatAmount(data.value)}</p>
          <p className="text-sm text-gray-500">{percentage}% of total</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="card card-hover">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-50">
          <PieChart size={24} className="text-teal-600" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-600">Spending Breakdown</p>
          <h3 className="text-xl font-semibold text-gray-900">By Category</h3>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={420}>
        <RechartsPieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            outerRadius={120}
            fill="#8884d8"
            dataKey="value"
            onClick={(data) => onCategoryClick && onCategoryClick(data.name)}
            style={{ cursor: 'pointer' }}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
                stroke="#FFFFFF"
                strokeWidth={1}
                opacity={selectedCategory && selectedCategory !== entry.name ? 0.4 : 1}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  )
}

export default PieChartComponent
