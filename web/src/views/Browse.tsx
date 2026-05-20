import { useEffect, useMemo, useState } from 'react'
import type {
  Filters,
  Listing,
  ListingPhoto,
  ListingWithPhotos,
} from '../types.ts'
import { EMPTY_FILTERS } from '../types.ts'
import { parseInt0, parsePrice } from '../utils.ts'
import { dbQuery } from '../sdk.ts'
import { CenterMessage, EmptyState, ListingCard } from '../shared.tsx'
import { FilterBar } from './FilterBar.tsx'
import { RecentStrip } from './RecentStrip.tsx'

export function BrowseView({ onOpen }: { onOpen: (id: string) => void }) {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [items, setItems] = useState<ListingWithPhotos[] | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const rows = await dbQuery<Listing>(
        `SELECT * FROM listings WHERE status = 'active' ORDER BY created_at DESC LIMIT 200`,
      )
      const photos = rows.length
        ? await dbQuery<ListingPhoto>(
            `SELECT * FROM listing_photos WHERE listing_id IN (${rows.map(() => '?').join(',')}) ORDER BY position ASC`,
            rows.map(r => r.id),
          )
        : []
      const byId = new Map<string, ListingPhoto[]>()
      for (const p of photos) {
        if (!byId.has(p.listing_id)) byId.set(p.listing_id, [])
        byId.get(p.listing_id)!.push(p)
      }
      if (!cancelled) setItems(rows.map(r => ({ ...r, photos: byId.get(r.id) || [] })))
    })()
    return () => { cancelled = true }
  }, [])

  const filtered = useMemo(() => {
    if (!items) return null
    const q = filters.q.trim().toLowerCase()
    const minP = parsePrice(filters.minPrice)
    const maxP = parsePrice(filters.maxPrice)
    const minY = parseInt0(filters.minYear) || 0
    const maxY = parseInt0(filters.maxYear) || 9999
    const matched = items.filter(l => {
      if (filters.make && l.make !== filters.make) return false
      if (filters.bodyType && l.body_type !== filters.bodyType) return false
      if (filters.fuelType && l.fuel_type !== filters.fuelType) return false
      if (minP !== null && l.price_cents < minP) return false
      if (maxP !== null && l.price_cents > maxP) return false
      if (l.year < minY || l.year > maxY) return false
      if (q && !(l.title + ' ' + l.make + ' ' + l.model + ' ' + l.location).toLowerCase().includes(q)) return false
      return true
    })
    const sorted = [...matched]
    switch (filters.sort) {
      case 'price-asc':    sorted.sort((a, b) => a.price_cents - b.price_cents); break
      case 'price-desc':   sorted.sort((a, b) => b.price_cents - a.price_cents); break
      case 'year-desc':    sorted.sort((a, b) => b.year - a.year); break
      case 'mileage-asc':  sorted.sort((a, b) => a.mileage_km - b.mileage_km); break
      case 'newest':       sorted.sort((a, b) => b.created_at - a.created_at); break
    }
    return sorted
  }, [items, filters])

  const hasActiveFilters =
    filters.q !== '' || filters.make !== '' || filters.bodyType !== '' || filters.fuelType !== '' ||
    filters.minPrice !== '' || filters.maxPrice !== '' || filters.minYear !== '' || filters.maxYear !== '' ||
    filters.sort !== 'newest'

  return (
    <div>
      <RecentStrip onOpen={onOpen} />
      <FilterBar filters={filters} setFilters={setFilters} />
      {items && hasActiveFilters && (
        <div className="mb-4 flex items-center justify-between text-xs text-[var(--muted)]">
          <span>
            Showing {filtered?.length ?? 0} of {items.length}
          </span>
          <button
            onClick={() => setFilters(EMPTY_FILTERS)}
            className="font-semibold underline-offset-2 hover:text-[var(--ink)] hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}
      {!items ? (
        <CenterMessage text="Loading listings…" />
      ) : filtered && filtered.length === 0 ? (
        <EmptyState
          title={items.length === 0 ? 'No listings yet' : 'No matches'}
          hint={items.length === 0 ? 'Be the first to post one.' : 'Try clearing some filters.'}
          action={hasActiveFilters ? (
            <button
              onClick={() => setFilters(EMPTY_FILTERS)}
              className="rounded-2xl border border-[var(--line)] bg-[var(--glass)] px-4 py-2 text-sm font-semibold hover:bg-[var(--glass-hover)]"
            >
              Clear filters
            </button>
          ) : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered!.map(l => (
            <ListingCard key={l.id} listing={l} onClick={() => onOpen(l.id)} />
          ))}
        </div>
      )}
    </div>
  )
}
