const SectionHeader = ({ eyebrow, title, action, children }) => (
  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
    <div>
      {eyebrow ? <p className="text-[11px] font-black uppercase tracking-[0.16em] text-muted">{eyebrow}</p> : null}
      <h2 className="mt-1 font-display text-xl font-black tracking-tight text-primary sm:text-2xl">{title}</h2>
      {children ? <p className="mt-2 max-w-2xl text-sm leading-6 text-secondary">{children}</p> : null}
    </div>
    {action}
  </div>
)

export default SectionHeader
