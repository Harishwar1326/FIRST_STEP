const IconButton = ({ className = '', label, children, ...props }) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border border-app bg-surface text-secondary transition hover:border-accent hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/25 ${className}`}
    {...props}
  >
    {children}
  </button>
)

export default IconButton
