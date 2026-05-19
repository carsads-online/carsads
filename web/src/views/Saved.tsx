import { useEffect, useState } from 'react'
import type { Listing, ListingPhoto, ListingWithPhotos } from '../types.ts'
import { app, dbQuery } from '../sdk.ts'
import { CenterMessage, EmptyState, ListingCard } from '../shared.tsx'

export function SavedView({ onOpen }: { onOpen: (id: string) => void }) {
  const [items, setItems] = useState<ListingWithPhotos[] | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const favs = await app.kv.list({ prefix: 'fav:' })
      const ids = favs.map(k => k.slice(4))
      if (ids.length === 0) { if (!cancelled) setItems([]); return }
      const placeholders = ids.map(() => '?').join(',')
      const [rows, photos] = await Promise.all([
        dbQuery<Listing>(`SELECT * FROM listings WHERE id IN (${placeholders})`, ids),
        dbQuery<ListingPhoto>(
          `SELECT * FROM listing_photos WHERE listing_id IN (${placeholders}) ORDER BY position ASC`,
          ids,
        ),
      ])
      const byId = new Map<string, ListingPhoto[]>()
      for (const p of photos) {
        if (!byId.has(p.listing_id)) byId.set(p.listing_id, [])
        byId.get(p.listing_id)!.push(p)
      }
      if (!cancelled) setItems(rows.map(r => ({ ...r, photos: byId.get(r.id) || [] })))
    })()
    return () => { cancelled = true }
  }, [])

  if (!items) return <CenterMessage text="Loading…" />
  if (items.length === 0) {
    return <EmptyState title="Nothing saved yet" hint="Tap Save on any listing to keep it here." />
  }
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map(l => (
        <ListingCard key={l.id} listing={l} onClick={() => onOpen(l.id)} />
      ))}
    </div>
  )
}
