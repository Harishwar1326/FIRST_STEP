const ProgressBar = ({ value = 0, className = '', tone = 'sun' }) => {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0))

  return (
    <div className={`progress-track progress-track-${tone} h-2 overflow-hidden rounded-full bg-elevated ${className}`} role="progressbar" aria-valuenow={safeValue} aria-valuemin="0" aria-valuemax="100">
      <div className="h-full rounded-full transition-[width] duration-700 motion-reduce:transition-none" style={{ width: `${safeValue}%` }} />
    </div>
  )
}

export default ProgressBar
