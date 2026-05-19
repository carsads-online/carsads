import { useEffect, useMemo, useState } from 'react'
import type {
  Filters,
  Listing,
  ListingPhoto,
  ListingWithPhotos,
  Sort,
} from '../types.ts'
import {
  BODY_TYPES,
  COMMON_MAKES,
  EMPTY_FILTERS,
  FUEL_TYPES,
  SORT_LABELS,
} from '../types.ts'
import { formatPrice, parseInt0, parsePrice, YEAR_OPTIONS } from '../utils.ts'
import { app, dbQuery } from '../sdk.ts'
import { CenterMessage, EmptyState, ListingCard } from '../shared.tsx'

export function BrowseView({ onOpen }: { onOpen: (id: string) => void }) {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [items, setItems] = useState<ListingWithPhotos[] | null>(null)
  const [recent, setRecent] = useState<ListingWithPhotos[]>([])

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

  // Recently viewed (KV).
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
      {recent.length > 0 && (
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
      )}
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

function FilterBar({ filters, setFilters }: { filters: Filters; setFilters: (f: Filters) => void }) {
  const update = (patch: Partial<Filters>) => setFilters({ ...filters, ...patch })
  const inputClass = "rounded-xl border border-[var(--line)] bg-[var(--glass)] px-3 py-2 text-sm"
  return (
    <div className="mb-6 space-y-2">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <input
          type="text"
          placeholder="Search…"
          value={filters.q}
          onChange={e => update({ q: e.target.value })}
          className={`col-span-2 ${inputClass}`}
        />
        <select value={filters.make} onChange={e => update({ make: e.target.value })} className={inputClass}>
          <option value="">Any make</option>
          {COMMON_MAKES.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={filters.sort} onChange={e => update({ sort: e.target.value as Sort })} className={inputClass}>
          {(Object.keys(SORT_LABELS) as Sort[]).map(s => (
            <option key={s} value={s}>{SORT_LABELS[s]}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
        <select value={filters.bodyType} onChange={e => update({ bodyType: e.target.value })} className={inputClass}>
          <option value="">Any body</option>
          {BODY_TYPES.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <select value={filters.fuelType} onChange={e => update({ fuelType: e.target.value })} className={inputClass}>
          <option value="">Any fuel</option>
          {FUEL_TYPES.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <input
          type="text"
          inputMode="numeric"
          placeholder="Min price"
          value={filters.minPrice}
          onChange={e => update({ minPrice: e.target.value })}
          className={inputClass}
        />
        <input
          type="text"
          inputMode="numeric"
          placeholder="Max price"
          value={filters.maxPrice}
          onChange={e => update({ maxPrice: e.target.value })}
          className={inputClass}
        />
        <select value={filters.minYear} onChange={e => update({ minYear: e.target.value })} className={inputClass}>
          <option value="">Year from</option>
          {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={filters.maxYear} onChange={e => update({ maxYear: e.target.value })} className={inputClass}>
          <option value="">Year to</option>
          {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
    </div>
  )
}
