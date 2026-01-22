import { useNavigate } from 'react-router-dom'
import { Receipt } from 'lucide-react'

const TransactionList = ({ transactions, limit = 10, isLoading = false }) => {
  const navigate = useNavigate()

  const handleTransactionClick = (transaction) => {
    navigate('/detailed', { state: { category: transaction.mainCategory } })
  }

  return (
    <div className="card card-hover overflow-hidden p-0">
      <div className="px-6 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-50">
            <Receipt size={24} className="text-teal-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">Latest Activity</p>
            <h3 className="text-xl font-semibold text-gray-900">Recent Transactions</h3>
          </div>
        </div>
      </div>
      <div className="divide-y divide-gray-200">
        {isLoading ? (
          <div className="px-6 py-6">
            <div className="h-6 w-full rounded bg-gray-100 animate-pulse" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="px-6 py-8 text-sm text-gray-500">No transactions yet.</div>
        ) : (
          transactions.slice(0, limit).map((transaction, index) => {
            return (
              <div
                key={transaction.id}
                onClick={() => handleTransactionClick(transaction)}
                className={`px-6 py-4 cursor-pointer transition-all duration-300 ease-in-out hover:bg-gray-50 hover:scale-[1.01] ${
                  index % 2 === 1 ? 'bg-gray-50/50' : 'bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <p className="font-medium text-gray-900">{transaction.merchant}</p>
                      <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                        {transaction.main_category || 'Uncategorized'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {new Date(transaction.transaction_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">${transaction.amount.toFixed(2)}</p>
                    {transaction.sub_category && (
                      <p className="text-xs text-gray-500">{transaction.sub_category}</p>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default TransactionList
