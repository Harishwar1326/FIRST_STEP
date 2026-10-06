const Card = ({ as: Component = 'section', className = '', children, ...props }) => (
  <Component className={`rounded-2xl border border-app bg-surface text-primary ${className}`} {...props}>
    {children}
  </Component>
)

export default Card
