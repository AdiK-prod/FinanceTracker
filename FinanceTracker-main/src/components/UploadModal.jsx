import { X } from 'lucide-react'
import UploadZone from './UploadZone'

const UploadModal = ({ isOpen, onClose, onUploadComplete }) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Upload Expenses</h2>
            <p className="text-sm text-gray-600 mt-1">Import transactions from CSV or Excel files</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <UploadZone onConfirmUpload={onUploadComplete} />
        </div>
      </div>
    </div>
  )
}

export default UploadModal
