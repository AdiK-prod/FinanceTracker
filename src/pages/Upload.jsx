import { useNavigate } from 'react-router-dom'
import UploadZone from '../components/UploadZone'

const Upload = () => {
  const navigate = useNavigate()

  const handleUpload = () => {
    // Visual only - navigate to tagging screen
    navigate('/tagging')
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Upload Expenses
        </h1>
        <p className="text-gray-600">
          Upload your bank statements or expense files to get started
        </p>
      </div>

      <UploadZone onUpload={handleUpload} />
    </div>
  )
}

export default Upload
