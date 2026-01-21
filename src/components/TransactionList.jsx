import { useNavigate } from 'react-router-dom'

const TransactionList = ({ transactions, limit = 10 }) => {
  const navigate = useNavigate()

  const handleTransactionClick = (transaction) => {
    navigate('/detailed', { state: { category: transaction.mainCategory } })
  }

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
      </div>
      <div className="divide-y divide-gray-200">
        {transactions.slice(0, limit).map((transaction) => (
          <div
            key={transaction.id}
            onClick={() => handleTransactionClick(transaction)}
            className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <p className="font-medium text-gray-900">{transaction.merchant}</p>
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                    {transaction.mainCategory}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {new Date(transaction.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">${transaction.amount.toFixed(2)}</p>
                {transaction.subCategory && (
                  <p className="text-xs text-gray-500">{transaction.subCategory}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default TransactionList
