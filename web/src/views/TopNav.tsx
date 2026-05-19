import type { View } from '../types.ts'

export function TopNav({ view, setView }: { view: View; setView: (v: View) => void }) {
  const Tab = ({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) => (
    <button
      onClick={onClick}
      className={
        'rounded-full px-4 py-1.5 text-sm font-semibold ' +
        (active ? 'bg-[var(--ink)] text-[var(--paper)]' : 'text-[var(--muted)] hover:text-[var(--ink)]')
      }
    >
      {label}
    </button>
  )
  return (
    <nav className="mb-6 flex flex-wrap items-center gap-1 pt-2">
      <button
        onClick={() => setView({ kind: 'browse' })}
        className="display-font mr-auto text-lg font-bold tracking-tight"
      >
        carsads
      </button>
      <Tab active={view.kind === 'browse'} label="Browse" onClick={() => setView({ kind: 'browse' })} />
      <Tab active={view.kind === 'saved'} label="Saved" onClick={() => setView({ kind: 'saved' })} />
      <Tab active={view.kind === 'inbox' || view.kind === 'chat'} label="Inbox" onClick={() => setView({ kind: 'inbox' })} />
      <Tab active={view.kind === 'mine'} label="My listings" onClick={() => setView({ kind: 'mine' })} />
      <button
        onClick={() => setView({ kind: 'post' })}
        className="ml-2 rounded-full bg-[var(--accent)] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[var(--accent-deep)]"
      >
        + Post
      </button>
    </nav>
  )
}
