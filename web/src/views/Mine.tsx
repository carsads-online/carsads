import { useEffect, useState } from 'react'
import type { Listing } from '../types.ts'
import { formatMileage, formatPrice } from '../utils.ts'
import { app, dbExec, dbQuery } from '../sdk.ts'
import { CenterMessage, EmptyState } from '../shared.tsx'

export function MyListingsView({ onOpen, onPost }: { onOpen: (id: string) => void; onPost: () => void }) {
  const [items, setItems] = useState<Listing[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  async function reload() {
    const user = app.auth.user
    if (!user) { setItems([]); return }
    const rows = await dbQuery<Listing>(
      `SELECT * FROM listings WHERE seller_id = ? ORDER BY created_at DESC`,
      [user.id],
    )
    setItems(rows)
  }

  useEffect(() => { void reload() }, [])

  async function markSold(id: string) {
    setBusy(id)
    await dbExec(`UPDATE listings SET status = 'sold' WHERE id = ?`, [id])
    await reload()
    setBusy(null)
  }

  async function reactivate(id: string) {
    setBusy(id)
    await dbExec(`UPDATE listings SET status = 'active' WHERE id = ?`, [id])
    await reload()
    setBusy(null)
  }

  async function remove(id: string) {
    if (!confirm('Delete this listing? This cannot be undone.')) return
    setBusy(id)
    await app.db.batch([
      { sql: `DELETE FROM listing_photos WHERE listing_id = ?`, params: [id] },
      { sql: `DELETE FROM listings WHERE id = ?`, params: [id] },
    ])
    await reload()
    setBusy(null)
  }

  if (!items) return <CenterMessage text="Loading…" />
  if (items.length === 0) {
    return (
      <EmptyState
        title="No listings yet"
        hint="Post your first car to get started."
        action={<button onClick={onPost} className="rounded-2xl bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-deep)]">+ Post a listing</button>}
      />
    )
  }
  return (
    <div className="space-y-3">
      {items.map(l => (
        <div key={l.id} className="flex items-center gap-4 rounded-2xl border border-[var(--line)] bg-[var(--card-gradient)] p-4 shadow-[var(--shadow-card)]">
          <button onClick={() => onOpen(l.id)} className="flex-1 text-left">
            <div className="flex items-center gap-2">
              <h3 className="display-font text-base font-semibold">{l.title}</h3>
              {l.status === 'sold' && (
                <span className="rounded-full bg-[var(--ink)] px-2 py-0.5 text-[10px] font-semibold text-[var(--paper)]">SOLD</span>
              )}
            </div>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {formatPrice(l.price_cents)} · {l.year} · {formatMileage(l.mileage_km)} · {l.location}
            </p>
          </button>
          <div className="flex gap-2">
            {l.status === 'sold' ? (
              <button onClick={() => reactivate(l.id)} disabled={busy === l.id} className="rounded-xl border border-[var(--line)] bg-[var(--glass)] px-3 py-1.5 text-xs font-semibold hover:bg-[var(--glass-hover)]">
                Reactivate
              </button>
            ) : (
              <button onClick={() => markSold(l.id)} disabled={busy === l.id} className="rounded-xl border border-[var(--line)] bg-[var(--glass)] px-3 py-1.5 text-xs font-semibold hover:bg-[var(--glass-hover)]">
                Mark sold
              </button>
            )}
            <button onClick={() => remove(l.id)} disabled={busy === l.id} className="rounded-xl border border-[var(--line)] bg-[var(--glass)] px-3 py-1.5 text-xs font-semibold text-[var(--error)] hover:bg-[var(--glass-hover)]">
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
