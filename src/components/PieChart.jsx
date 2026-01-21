import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

const COLORS = ['#14B8A6', '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#EF4444', '#6366F1']

const PieChartComponent = ({ data, selectedCategory, onCategoryClick }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0)

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0]
      const percentage = ((data.value / total) * 100).toFixed(1)
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">{data.name}</p>
          <p className="text-teal font-medium">${data.value.toFixed(2)}</p>
          <p className="text-sm text-gray-500">{percentage}% of total</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Spending by Category</h3>
      <ResponsiveContainer width="100%" height={400}>
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
                fill={selectedCategory === entry.name ? COLORS[index % COLORS.length] : COLORS[index % COLORS.length]}
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
