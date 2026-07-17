import { motion } from 'framer-motion'
import { useTheme } from '../../context/ThemeContext'

const LearningStyleChart = ({ learningStyle, scores }) => {
  const { theme } = useTheme

  const styles = [
    { name: 'Visual', score: scores?.visual || 75, color: 'from-purple-500 to-indigo-500' },
    { name: 'Auditory', score: scores?.auditory || 60, color: 'from-cyan-500 to-emerald-500' },
    { name: 'Kinesthetic', score: scores?.kinesthetic || 45, color: 'from-amber-500 to-orange-500' },
    { name: 'Reading', score: scores?.reading || 70, color: 'from-pink-500 to-rose-500' },
  ]

  return (
    <div className={`p-6 rounded-2xl ${theme === 'dark' ? 'bg-[#0f131a] border border-gray-800' : 'bg-white border border-gray-200'}`}>
      <h3 className={`text-lg font-semibold mb-6 ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
        Learning Style Analysis
      </h3>
      <div className="space-y-4">
        {styles.map((style, index) => (
          <motion.div
            key={style.name}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                {style.name}
              </span>
              <span className={`text-sm font-semibold ${style.score >= 70 ? 'text-green-400' : style.score >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                {style.score}%
              </span>
            </div>
            <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
              <motion.div
                className={`h-full bg-gradient-to-r ${style.color} rounded-full`}
                initial={{ width: 0 }}
                animate={{ width: `${style.score}%` }}
                transition={{ duration: 1, delay: index * 0.1 }}
              />
            </div>
          </motion.div>
        ))}
      </div>
      <div className={`mt-6 p-4 rounded-xl ${theme === 'dark' ? 'bg-purple-500/10 border border-purple-500/20' : 'bg-purple-50 border border-purple-200'}`}>
        <p className={`text-sm font-medium ${theme === 'dark' ? 'text-purple-300' : 'text-purple-700'}`}>
          Dominant Style: {learningStyle || 'Visual'}
        </p>
        <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          Based on your interaction patterns and quiz performance
        </p>
      </div>
    </div>
  )
}

export default LearningStyleChart
