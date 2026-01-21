import { useState } from 'react'
import { Upload, FileText } from 'lucide-react'

const UploadZone = ({ onUpload }) => {
  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    // Visual only - no actual file processing
  }

  return (
    <div className="space-y-6">
      {/* Drag and Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-16 text-center transition-all duration-200 ${
          isDragging
            ? 'border-teal bg-teal/5'
            : 'border-gray-300 hover:border-teal/50 bg-white'
        }`}
      >
        <Upload
          size={48}
          className={`mx-auto mb-4 ${
            isDragging ? 'text-teal' : 'text-gray-400'
          }`}
        />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Drop your expense file here
        </h3>
        <p className="text-gray-500 mb-4">
          Supports CSV and XLSX files
        </p>
        <button
          onClick={onUpload}
          className="px-6 py-2 bg-teal text-white rounded-md hover:bg-teal/90 transition-all duration-200 font-medium"
        >
          Choose File
        </button>
      </div>

      {/* Sample File Link */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <div className="flex items-center gap-3 text-gray-700">
          <FileText size={20} />
          <div>
            <p className="font-medium">Need a sample file?</p>
            <a
              href="#"
              className="text-blue-600 hover:text-blue-700 text-sm"
              onClick={(e) => e.preventDefault()}
            >
              Download sample CSV template
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UploadZone
