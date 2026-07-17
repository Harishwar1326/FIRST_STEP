import { motion } from 'framer-motion'
import { Loader2, CheckCircle2, XCircle, FileText, Brain, Sparkles, List } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

const ProcessingIndicator = ({ status, progress }) => {
  const { theme } = useTheme()

  const steps = [
    { icon: FileText, label: 'Parsing', key: 'parsing' },
    { icon: Brain, label: 'OCR', key: 'ocr' },
    { icon: Sparkles, label: 'Embeddings', key: 'embeddings' },
    { icon: List, label: 'Analysis', key: 'analysis' },
    { icon: CheckCircle2, label: 'Complete', key: 'complete' },
  ]

  const getStepStatus = (stepKey) => {
    if (status === 'failed') return 'error'
    if (status === 'processed') return 'completed'
    if (progress && progress.currentStep === stepKey) return 'processing'
    if (progress && progress.completedSteps.includes(stepKey)) return 'completed'
    return 'pending'
  }

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

      <div className="space-y-4">
        {steps.map((step, index) => {
          const stepStatus = getStepStatus(step.key)
          const Icon = step.icon

          return (
            <motion.div
              key={step.key}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`flex items-center gap-4 p-3 rounded-lg ${
                stepStatus === 'processing' 
                  ? 'bg-purple-500/10 border border-purple-500/30' 
                  : stepStatus === 'completed'
                    ? 'bg-green-500/10 border border-green-500/30'
                    : stepStatus === 'error'
                      ? 'bg-red-500/10 border border-red-500/30'
                      : theme === 'dark'
                        ? 'bg-gray-800/30'
                        : 'bg-gray-100'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                stepStatus === 'processing' 
                  ? 'bg-purple-500 text-white' 
                  : stepStatus === 'completed'
                    ? 'bg-green-500 text-white'
                    : stepStatus === 'error'
                      ? 'bg-red-500 text-white'
                      : theme === 'dark'
                        ? 'bg-gray-700 text-gray-400'
                        : 'bg-gray-300 text-gray-600'
              }`}>
                {stepStatus === 'processing' ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : stepStatus === 'completed' ? (
                  <CheckCircle2 size={16} />
                ) : stepStatus === 'error' ? (
                  <XCircle size={16} />
                ) : (
                  <Icon size={16} />
                )}
              </div>
              <span className={`font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                {step.label}
              </span>
              {stepStatus === 'processing' && (
                <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden ml-4">
                  <motion.div
                    className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"
                    initial={{ width: '0%' }}
                    animate={{ width: '60%' }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  />
                </div>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

export default ProcessingIndicator
