const variants = {
  primary: 'border-[#183f39] bg-[#183f39] text-white hover:bg-[#245c50]',
  secondary: 'border-app bg-surface text-primary hover:border-accent hover:text-primary',
  ghost: 'border-transparent bg-transparent text-secondary hover:bg-elevated hover:text-primary',
}

const sizes = {
  sm: 'h-9 px-3 text-xs',
  md: 'h-11 px-4 text-sm',
  lg: 'h-12 px-5 text-sm',
}

const Button = ({ as: Component = 'button', variant = 'primary', size = 'md', className = '', children, ...props }) => {
  return (
    <Component
      className={`inline-flex items-center justify-center gap-2 rounded-xl border font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/25 disabled:pointer-events-none disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </Component>
  )
}

export default Button
