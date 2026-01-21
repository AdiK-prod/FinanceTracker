import { useNavigate } from 'react-router-dom'
import ExpenseTable from '../components/ExpenseTable'

const Tagging = () => {
  const navigate = useNavigate()

  const handleSaveAndContinue = () => {
    navigate('/dashboard')
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Tag Expenses
        </h1>
        <p className="text-gray-600">
          Review and categorize your expenses. Items highlighted in yellow need your attention.
        </p>
      </div>

      <ExpenseTable />

      <div className="mt-8 flex justify-end">
        <button
          onClick={handleSaveAndContinue}
          className="px-6 py-2 bg-teal text-white rounded-md hover:bg-teal/90 transition-all duration-200 font-medium"
        >
          Save & Continue
        </button>
      </div>
    </div>
  )
}

export default Tagging
