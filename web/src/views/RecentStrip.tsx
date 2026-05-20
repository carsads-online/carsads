import { useEffect, useState } from 'react'
import type { Listing, ListingPhoto, ListingWithPhotos } from '../types.ts'
import { formatPrice } from '../utils.ts'
import { app, dbQuery } from '../sdk.ts'

export function RecentStrip({ onOpen }: { onOpen: (id: string) => void }) {
  const [recent, setRecent] = useState<ListingWithPhotos[]>([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const raw = await app.kv.get<unknown>('recent').catch(() => null)
      const stored: { id: string; ts: number }[] = Array.isArray(raw)
        ? raw.filter((r): r is { id: string; ts: number } =>
            !!r && typeof r === 'object' && typeof (r as { id?: unknown }).id === 'string',
          )
        : []
      const ids = stored.slice(0, 5).map(r => r.id)
      if (ids.length === 0) return
      const rows = await dbQuery<Listing>(
        `SELECT * FROM listings WHERE id IN (${ids.map(() => '?').join(',')})`,
        ids,
      )
      // Preserve KV order
      const rowMap = new Map(rows.map(r => [r.id, r]))
      const ordered = ids.map(id => rowMap.get(id)).filter((r): r is Listing => !!r)
      const ph = ordered.length
        ? await dbQuery<ListingPhoto>(
            `SELECT * FROM listing_photos WHERE listing_id IN (${ordered.map(() => '?').join(',')}) AND position = 0`,
            ordered.map(r => r.id),
          )
        : []
      const coverById = new Map<string, ListingPhoto[]>()
      for (const p of ph) coverById.set(p.listing_id, [p])
      if (!cancelled) setRecent(ordered.map(r => ({ ...r, photos: coverById.get(r.id) ?? [] })))
    })()
    return () => { cancelled = true }
  }, [])

  if (recent.length === 0) return null

  return (
    <section className="mb-6">
      <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">Recently viewed</h2>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
        {recent.map(r => (
          <button
            key={r.id}
            onClick={() => onOpen(r.id)}
            className="flex w-40 flex-none flex-col overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--card-gradient)] text-left shadow-[var(--shadow-card)] hover:border-[var(--line-strong)]"
          >
            <div className="aspect-[4/3] w-full bg-[var(--paper-deep)]">
              {r.photos[0]?.url ? (
                <img src={r.photos[0].url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[10px] text-[var(--muted)]">No photo</div>
              )}
            </div>
            <div className="p-2">
              <p className="display-font line-clamp-1 text-xs font-semibold">{r.title}</p>
              <p className="mt-0.5 text-[10px] text-[var(--accent-deep)]">{formatPrice(r.price_cents)}</p>
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}
