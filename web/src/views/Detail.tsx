import { useEffect, useState } from 'react'
import type { Listing, ListingPhoto, ListingWithPhotos } from '../types.ts'
import { formatPrice, relativeDate } from '../utils.ts'
import { app, dbQuery } from '../sdk.ts'
import { BackButton, CenterMessage, EmptyState, ListingCard } from '../shared.tsx'
import { Lightbox } from './Lightbox.tsx'
import { SpecsGrid } from './SpecsGrid.tsx'

export function DetailView({ id, onBack, onEdit, onOpen, onMessage }: {
  id: string
  onBack: () => void
  onEdit: (id: string) => void
  onOpen: (id: string) => void
  onMessage: (listingId: string) => void
}) {
  const [data, setData] = useState<ListingWithPhotos | null | 'missing'>(null)
  const [me, setMe] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [photoIdx, setPhotoIdx] = useState(0)
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)
  const [similar, setSimilar] = useState<ListingWithPhotos[]>([])

  useEffect(() => {
    let cancelled = false
    // Reset per-listing state so the previous listing's data doesn't flash through.
    setData(null)
    setSimilar([])
    setPhotoIdx(0)
    setLightboxIdx(null)
    ;(async () => {
      const [rows, photos, fav] = await Promise.all([
        dbQuery<Listing>(`SELECT * FROM listings WHERE id = ? LIMIT 1`, [id]),
        dbQuery<ListingPhoto>(`SELECT * FROM listing_photos WHERE listing_id = ? ORDER BY position ASC`, [id]),
        app.kv.get(`fav:${id}`).catch(() => null),
      ])
      if (cancelled) return
      const l = rows[0]
      if (!l) { setData('missing'); return }
      setData({ ...l, photos })
      setMe(app.auth.user?.id ?? null)
      setSaved(!!fav)

      // Record in recently-viewed (KV-backed, deduped, last 10).
      try {
        const raw = await app.kv.get<unknown>('recent')
        const prev: { id: string; ts: number }[] = Array.isArray(raw)
          ? raw.filter((r): r is { id: string; ts: number } =>
              !!r && typeof r === 'object' && typeof (r as { id?: unknown }).id === 'string',
            )
          : []
        const next = [{ id, ts: Date.now() }, ...prev.filter(r => r.id !== id)].slice(0, 10)
        await app.kv.set('recent', next)
      } catch {
        // non-fatal — recently-viewed is a soft feature
      }

      // Fetch similar listings: same make OR same body_type, exclude self.
      const similarRows = await dbQuery<Listing>(
        `SELECT * FROM listings
         WHERE status = 'active' AND id != ?
           AND (make = ? OR body_type = ?)
         ORDER BY created_at DESC LIMIT 3`,
        [l.id, l.make, l.body_type],
      )
      if (cancelled || similarRows.length === 0) return
      const similarIds = similarRows.map(r => r.id)
      const similarPhotos = await dbQuery<ListingPhoto>(
        `SELECT * FROM listing_photos WHERE listing_id IN (${similarIds.map(() => '?').join(',')}) ORDER BY position ASC`,
        similarIds,
      )
      const byId = new Map<string, ListingPhoto[]>()
      for (const p of similarPhotos) {
        if (!byId.has(p.listing_id)) byId.set(p.listing_id, [])
        byId.get(p.listing_id)!.push(p)
      }
      if (!cancelled) setSimilar(similarRows.map(r => ({ ...r, photos: byId.get(r.id) || [] })))
    })()
    return () => { cancelled = true }
  }, [id])

  // Keyboard navigation while lightbox is open.
  useEffect(() => {
    if (lightboxIdx === null) return
    const onKey = (e: KeyboardEvent) => {
      const photos = data && data !== 'missing' ? data.photos : []
      if (e.key === 'Escape') setLightboxIdx(null)
      else if (e.key === 'ArrowRight' && photos.length > 0) {
        setLightboxIdx(i => (i === null ? null : (i + 1) % photos.length))
      } else if (e.key === 'ArrowLeft' && photos.length > 0) {
        setLightboxIdx(i => (i === null ? null : (i - 1 + photos.length) % photos.length))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightboxIdx, data])

  async function toggleSave() {
    if (saved) {
      await app.kv.delete(`fav:${id}`)
      setSaved(false)
    } else {
      await app.kv.set(`fav:${id}`, { saved_at: Date.now() })
      setSaved(true)
    }
  }

  if (data === null) return <CenterMessage text="Loading listing…" />
  if (data === 'missing') {
    return (
      <div>
        <BackButton onClick={onBack} />
        <EmptyState title="Listing not found" hint="It may have been removed or marked sold." />
      </div>
    )
  }

  const l = data
  const isOwner = me && me === l.seller_id
  const cover = l.photos[photoIdx]?.url

  return (
    <div>
      <BackButton onClick={onBack} />
      <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--card-gradient)] shadow-[var(--shadow-card)]">
        <div className="relative aspect-[16/10] w-full bg-[var(--paper-deep)]">
          {cover ? (
            <button
              onClick={() => setLightboxIdx(photoIdx)}
              className="block h-full w-full"
              aria-label="Open full-size photo"
            >
              <img src={cover} alt={l.title} className="h-full w-full object-cover" />
            </button>
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-[var(--muted)]">No photo</div>
          )}
          {l.photos.length > 1 && (
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2 px-3">
              {l.photos.map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => setPhotoIdx(i)}
                  className={
                    'h-2 w-8 rounded-full ' +
                    (i === photoIdx ? 'bg-white' : 'bg-white/40')
                  }
                  aria-label={`Photo ${i + 1}`}
                />
              ))}
            </div>
          )}
          {l.status === 'sold' && (
            <span className="absolute left-3 top-3 rounded-full bg-[var(--ink)] px-3 py-1 text-xs font-semibold text-[var(--paper)]">SOLD</span>
          )}
        </div>

        <div className="grid gap-6 p-6 md:grid-cols-3">
          <div className="md:col-span-2">
            <div className="flex items-start justify-between gap-4">
              <h1 className="display-font text-2xl font-bold leading-tight md:text-3xl">{l.title}</h1>
              <span className="display-font text-2xl font-bold text-[var(--accent-deep)] md:text-3xl">
                {formatPrice(l.price_cents)}
              </span>
            </div>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Posted {relativeDate(l.created_at)} {l.seller_login ? `by @${l.seller_login}` : ''}
            </p>

            <SpecsGrid l={l} />

            {l.description && (
              <div className="mt-6">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">Description</h2>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{l.description}</p>
              </div>
            )}

            {l.lat !== null && l.lng !== null && (
              <div className="mt-6 overflow-hidden rounded-xl border border-[var(--line)]">
                <iframe
                  src={app.maps.embedUrl(l.lat, l.lng)}
                  className="h-56 w-full border-0"
                  title="Listing location"
                />
              </div>
            )}
          </div>

          <aside className="space-y-3">
            {isOwner ? (
              <button
                onClick={() => onEdit(l.id)}
                className="w-full rounded-2xl border border-[var(--line)] bg-[var(--glass)] px-4 py-3 text-sm font-semibold hover:bg-[var(--glass-hover)]"
              >
                Edit listing
              </button>
            ) : (
              <>
                <button
                  onClick={() => onMessage(l.id)}
                  className="w-full rounded-2xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--accent-deep)]"
                >
                  Message seller
                </button>
                {l.contact_email && (
                  <a
                    href={`mailto:${l.contact_email}?subject=${encodeURIComponent('Re: ' + l.title)}`}
                    className="block w-full rounded-2xl border border-[var(--line)] bg-[var(--glass)] px-4 py-3 text-center text-sm font-semibold hover:bg-[var(--glass-hover)]"
                  >
                    Or email
                  </a>
                )}
              </>
            )}
            <button
              onClick={toggleSave}
              className={
                'w-full rounded-2xl border px-4 py-3 text-sm font-semibold ' +
                (saved
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-deep)]'
                  : 'border-[var(--line)] bg-[var(--glass)] hover:bg-[var(--glass-hover)]')
              }
            >
              {saved ? 'Saved ✓' : 'Save listing'}
            </button>
          </aside>
        </div>
      </div>

      {similar.length > 0 && (
        <section className="mt-10">
          <h2 className="display-font mb-4 text-lg font-bold">You might also like</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map(s => (
              <ListingCard key={s.id} listing={s} onClick={() => onOpen(s.id)} />
            ))}
          </div>
        </section>
      )}

      {lightboxIdx !== null && l.photos[lightboxIdx] && (
        <Lightbox
          photos={l.photos}
          index={lightboxIdx}
          title={l.title}
          onClose={() => setLightboxIdx(null)}
          onChange={i => { setLightboxIdx(i); setPhotoIdx(i) }}
        />
      )}
    </div>
  )
}

