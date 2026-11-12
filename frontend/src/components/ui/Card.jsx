const Card = ({ as: Component = 'section', className = '', children, ...props }) => (
  <Component className={`rounded-[1.5rem] border border-app bg-surface text-primary shadow-sm ${className}`} {...props}>
    {children}
  </Component>
)

export default Card
