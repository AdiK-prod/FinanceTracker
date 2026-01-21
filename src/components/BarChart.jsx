import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const BarChartComponent = ({ data }) => {
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0]
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">{data.name}</p>
          <p className="text-teal font-medium">${data.value.toFixed(2)}</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Sub-Category Breakdown</h3>
      <ResponsiveContainer width="100%" height={300}>
        <RechartsBarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis
            dataKey="name"
            stroke="#6B7280"
            tick={{ fill: '#6B7280', fontSize: 12 }}
          />
          <YAxis
            stroke="#6B7280"
            tick={{ fill: '#6B7280', fontSize: 12 }}
            tickFormatter={(value) => `$${value}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="value" fill="#14B8A6" radius={[4, 4, 0, 0]} />
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default BarChartComponent
