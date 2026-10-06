import { ArrowRight } from 'lucide-react'
import Button from './Button'

const EmptyState = ({ title, message, actionLabel, href }) => (
  <div className="rounded-2xl border border-dashed border-app bg-elevated/50 p-6 text-center">
    <div className="mx-auto mb-4 h-10 w-10 rounded-xl border border-app bg-surface" />
    <h3 className="font-display text-base font-black text-primary">{title}</h3>
    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-secondary">{message}</p>
    {actionLabel && href ? (
      <Button as="a" href={href} variant="secondary" size="sm" className="mt-4">
        {actionLabel}
        <ArrowRight size={16} strokeWidth={1.5} />
      </Button>
    ) : null}
  </div>
)

export default EmptyState
