const modes = ['School', 'College', 'Skills', 'Placements']

const ModeSwitcher = ({ value = 'Skills', onChange }) => (
  <div className="mode-panel rounded-2xl border border-app bg-surface p-3">
    <div className="mb-3 flex items-center justify-between gap-3">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted">Learning Mode</p>
      <span className="mode-panel-dot" aria-hidden="true" />
    </div>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {modes.map((mode) => {
        const selected = value === mode
        return (
          <button
            key={mode}
            type="button"
            onClick={() => onChange?.(mode)}
            className={`h-10 rounded-xl border px-3 text-xs font-black uppercase tracking-[0.08em] transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/25 ${
              selected
                ? 'border-accent bg-accent text-stone-950'
                : 'border-app bg-elevated text-secondary hover:text-primary'
            }`}
          >
            {mode}
          </button>
        )
      })}
    </div>
  </div>
)

export default ModeSwitcher
