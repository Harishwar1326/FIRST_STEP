const tones = {
  default: 'border-app bg-elevated text-secondary',
  accent: 'border-accent/40 bg-accent/12 text-primary',
  success: 'border-success/40 bg-success/15 text-primary',
  danger: 'border-red-500/30 bg-red-500/10 text-red-300',
}

const Badge = ({ tone = 'default', className = '', children }) => (
  <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.12em] ${tones[tone]} ${className}`}>
    {children}
  </span>
)

export default Badge
