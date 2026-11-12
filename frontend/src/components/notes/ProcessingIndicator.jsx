import { motion } from 'framer-motion'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

const ProcessingIndicator = ({ status }) => {
  const { theme } = useTheme()

  return (
    <div className={`p-6 rounded-2xl ${theme === 'dark' ? 'bg-[#0f131a] border border-gray-800' : 'bg-white border border-gray-200'}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
          Processing Document
        </h3>
        {status === 'processing' && (
          <div className="flex items-center gap-2 text-purple-400">
            <Loader2 size={20} className="animate-spin" />
            <span className="text-sm">Processing...</span>
          </div>
        )}
        {status === 'processed' && (
          <div className="flex items-center gap-2 text-green-400">
            <CheckCircle2 size={20} />
            <span className="text-sm">Complete</span>
          </div>
        )}
        {status === 'failed' && (
          <div className="flex items-center gap-2 text-red-400">
            <XCircle size={20} />
            <span className="text-sm">Failed</span>
          </div>
        )}
      </div>

      <p className={`rounded-lg p-4 text-sm font-medium ${theme === 'dark' ? 'bg-gray-800/40 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
        {status === 'processing'
          ? 'Your document is being processed. This status updates when the server finishes.'
          : status === 'processed'
            ? 'The server finished processing this document.'
            : 'The server could not process this document.'}
      </p>
    </div>
  )
}

export default ProcessingIndicator
