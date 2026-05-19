import { useState, useEffect, useRef, useMemo } from 'react'
import { initPro } from '@proappstore/sdk'
import { ProShell } from '@proappstore/sdk/shell'
import { useProSubscription } from '@proappstore/sdk/hooks'
import type {
  Listing,
  ListingPhoto,
  ListingWithPhotos,
  View,
  Filters,
} from './types.ts'
import { EMPTY_FILTERS, FUEL_TYPES, TRANSMISSIONS, BODY_TYPES } from './types.ts'
import {
  formatPrice,
  formatMileage,
  relativeDate,
  parsePrice,
  parseInt0,
  imagePathFor,
  YEAR_OPTIONS,
  genId,
} from './utils.ts'

const app = initPro({
  appId: 'carsads',
  dataApiBase: 'https://data-carsads.proappstore.online',
})

// ─── DB helpers ─────────────────────────────────────────────────────────────

async function dbQuery<T>(sql: string, params?: unknown[]): Promise<T[]> {
  try {
    const r = await app.db.query<T>(sql, params)
    return r.rows
  } catch (err) {
    console.error('DB query failed:', sql, err)
    return []
  }
}

async function dbExec(sql: string, params?: unknown[]) {
  return app.db.execute(sql, params)
}

// ─── Schema migrations (data-worker tracks applied versions) ────────────────

const migrations = [
  {
    name: '0001_init',
    sql: `
      CREATE TABLE IF NOT EXISTS listings (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        make TEXT NOT NULL,
        model TEXT NOT NULL,
        year INTEGER NOT NULL,
        price_cents INTEGER NOT NULL,
        mileage_km INTEGER NOT NULL,
        fuel_type TEXT,
        transmission TEXT,
        body_type TEXT,
        color TEXT,
        description TEXT,
        location TEXT NOT NULL,
        lat REAL,
        lng REAL,
        contact_email TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        seller_id TEXT NOT NULL,
        seller_login TEXT,
        created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS listing_photos (
        id TEXT PRIMARY KEY,
        listing_id TEXT NOT NULL,
        url TEXT NOT NULL,
        position INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
      CREATE INDEX IF NOT EXISTS idx_listings_seller ON listings(seller_id);
      CREATE INDEX IF NOT EXISTS idx_listings_make ON listings(make);
      CREATE INDEX IF NOT EXISTS idx_photos_listing ON listing_photos(listing_id)
    `,
  },
]

// ─── Constants ──────────────────────────────────────────────────────────────

const COMMON_MAKES = [
  'Toyota', 'Honda', 'Ford', 'BMW', 'Mercedes-Benz', 'Volkswagen',
  'Mazda', 'Hyundai', 'Kia', 'Subaru', 'Nissan', 'Audi', 'Tesla', 'Other',
]

// ─── Root ───────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <ProShell app={app} appName="Carsads" allowFree={true}>
      <CarsadsApp />
    </ProShell>
  )
}

function CarsadsApp() {
  const [view, setView] = useState<View>({ kind: 'browse' })
  const [migrationsRan, setMigrationsRan] = useState(false)
  const [migrationError, setMigrationError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    app.db
      .migrate(migrations)
      .then(() => { if (!cancelled) setMigrationsRan(true) })
      .catch(err => {
        console.error('Migration failed:', err)
        if (!cancelled) setMigrationError(String(err))
      })
    return () => { cancelled = true }
  }, [])

  if (migrationError) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12 text-center">
        <p className="display-font text-xl font-bold text-[var(--error)]">Database error</p>
        <p className="mt-2 text-sm text-[var(--muted)]">
          The data worker isn't reachable. If this is a fresh install, the D1 database hasn't been provisioned yet.
        </p>
        <pre className="mt-4 overflow-auto rounded-xl bg-[var(--panel-quiet)] p-3 text-left text-xs text-[var(--muted)]">{migrationError}</pre>
      </div>
    )
  }

  if (!migrationsRan) {
    return <CenterMessage text="Loading…" />
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24">
      <TopNav view={view} setView={setView} />
      {view.kind === 'browse' && <BrowseView onOpen={id => setView({ kind: 'detail', id })} />}
      {view.kind === 'detail' && (
        <DetailView
          id={view.id}
          onBack={() => setView({ kind: 'browse' })}
          onEdit={id => setView({ kind: 'edit', id })}
        />
      )}
      {view.kind === 'post' && (
        <ProGate>
          <PostView mode="create" onDone={id => setView({ kind: 'detail', id })} onCancel={() => setView({ kind: 'browse' })} />
        </ProGate>
      )}
      {view.kind === 'edit' && (
        <ProGate>
          <PostView mode="edit" listingId={view.id} onDone={id => setView({ kind: 'detail', id })} onCancel={() => setView({ kind: 'detail', id: view.id })} />
        </ProGate>
      )}
      {view.kind === 'mine' && (
        <MyListingsView onOpen={id => setView({ kind: 'detail', id })} onPost={() => setView({ kind: 'post' })} />
      )}
      {view.kind === 'saved' && <SavedView onOpen={id => setView({ kind: 'detail', id })} />}
    </div>
  )
}

// ─── Pro gate (post requires subscription) ─────────────────────────────────

function ProGate({ children }: { children: React.ReactNode }) {
  const { isPro, loading, upgrade } = useProSubscription(app)
  if (loading) return <CenterMessage text="Checking subscription…" />
  if (isPro) return <>{children}</>
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="display-font text-2xl font-bold">Pro required to post</p>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Posting a listing needs an active ProAppStore subscription. Browsing and saving are free.
      </p>
      <button
        onClick={() => upgrade()}
        className="mt-6 rounded-2xl bg-[var(--accent)] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent-deep)]"
      >
        Upgrade to Pro
      </button>
    </div>
  )
}

// ─── Top nav ────────────────────────────────────────────────────────────────

function TopNav({ view, setView }: { view: View; setView: (v: View) => void }) {
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
    <nav className="mb-6 flex flex-wrap items-center justify-end gap-1 pt-2">
      <Tab active={view.kind === 'browse'} label="Browse" onClick={() => setView({ kind: 'browse' })} />
      <Tab active={view.kind === 'saved'} label="Saved" onClick={() => setView({ kind: 'saved' })} />
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

// ─── Browse ─────────────────────────────────────────────────────────────────

function BrowseView({ onOpen }: { onOpen: (id: string) => void }) {
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
    return items.filter(l => {
      if (filters.make && l.make !== filters.make) return false
      if (minP !== null && l.price_cents < minP) return false
      if (maxP !== null && l.price_cents > maxP) return false
      if (l.year < minY || l.year > maxY) return false
      if (q && !(l.title + ' ' + l.make + ' ' + l.model + ' ' + l.location).toLowerCase().includes(q)) return false
      return true
    })
  }, [items, filters])

  return (
    <div>
      <FilterBar filters={filters} setFilters={setFilters} />
      {!items ? (
        <CenterMessage text="Loading listings…" />
      ) : filtered && filtered.length === 0 ? (
        <EmptyState
          title={items.length === 0 ? 'No listings yet' : 'No matches'}
          hint={items.length === 0 ? 'Be the first to post one.' : 'Try clearing some filters.'}
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
  return (
    <div className="mb-6 grid grid-cols-2 gap-2 md:grid-cols-7">
      <input
        type="text"
        placeholder="Search…"
        value={filters.q}
        onChange={e => update({ q: e.target.value })}
        className="col-span-2 rounded-xl border border-[var(--line)] bg-[var(--glass)] px-3 py-2 text-sm md:col-span-2"
      />
      <select
        value={filters.make}
        onChange={e => update({ make: e.target.value })}
        className="rounded-xl border border-[var(--line)] bg-[var(--glass)] px-3 py-2 text-sm"
      >
        <option value="">Any make</option>
        {COMMON_MAKES.map(m => <option key={m} value={m}>{m}</option>)}
      </select>
      <input
        type="text"
        inputMode="numeric"
        placeholder="Min price"
        value={filters.minPrice}
        onChange={e => update({ minPrice: e.target.value })}
        className="rounded-xl border border-[var(--line)] bg-[var(--glass)] px-3 py-2 text-sm"
      />
      <input
        type="text"
        inputMode="numeric"
        placeholder="Max price"
        value={filters.maxPrice}
        onChange={e => update({ maxPrice: e.target.value })}
        className="rounded-xl border border-[var(--line)] bg-[var(--glass)] px-3 py-2 text-sm"
      />
      <select
        value={filters.minYear}
        onChange={e => update({ minYear: e.target.value })}
        className="rounded-xl border border-[var(--line)] bg-[var(--glass)] px-3 py-2 text-sm"
      >
        <option value="">Year from</option>
        {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
      </select>
      <select
        value={filters.maxYear}
        onChange={e => update({ maxYear: e.target.value })}
        className="rounded-xl border border-[var(--line)] bg-[var(--glass)] px-3 py-2 text-sm"
      >
        <option value="">Year to</option>
        {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  )
}

function ListingCard({ listing, onClick }: { listing: ListingWithPhotos; onClick: () => void }) {
  const cover = listing.photos[0]?.url
  return (
    <button
      onClick={onClick}
      className="text-left overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--card-gradient)] shadow-[var(--shadow-card)] hover:border-[var(--line-strong)]"
    >
      <div className="aspect-[4/3] w-full bg-[var(--paper-deep)] overflow-hidden">
        {cover ? (
          <img src={cover} alt={listing.title} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-[var(--muted)]">No photo</div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="display-font text-base font-semibold leading-tight">{listing.title}</h3>
          <span className="text-sm font-bold text-[var(--accent-deep)]">{formatPrice(listing.price_cents)}</span>
        </div>
        <p className="mt-1 text-xs text-[var(--muted)]">
          {listing.year} · {formatMileage(listing.mileage_km)} · {listing.location}
        </p>
        <p className="mt-2 text-[10px] uppercase tracking-wide text-[var(--muted)]">
          {relativeDate(listing.created_at)}
        </p>
      </div>
    </button>
  )
}

// ─── Detail ─────────────────────────────────────────────────────────────────

function DetailView({ id, onBack, onEdit }: { id: string; onBack: () => void; onEdit: (id: string) => void }) {
  const [data, setData] = useState<ListingWithPhotos | null | 'missing'>(null)
  const [me, setMe] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [photoIdx, setPhotoIdx] = useState(0)

  useEffect(() => {
    let cancelled = false
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
    })()
    return () => { cancelled = true }
  }, [id])

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
            <img src={cover} alt={l.title} className="h-full w-full object-cover" />
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
            ) : l.contact_email ? (
              <a
                href={`mailto:${l.contact_email}?subject=${encodeURIComponent('Re: ' + l.title)}`}
                className="block w-full rounded-2xl bg-[var(--accent)] px-4 py-3 text-center text-sm font-semibold text-white hover:bg-[var(--accent-deep)]"
              >
                Contact seller
              </a>
            ) : (
              <p className="text-xs text-[var(--muted)]">Seller hasn't shared contact details.</p>
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
    </div>
  )
}

function SpecsGrid({ l }: { l: Listing }) {
  const items: [string, string | null][] = [
    ['Year', String(l.year)],
    ['Mileage', formatMileage(l.mileage_km)],
    ['Make', l.make],
    ['Model', l.model],
    ['Body', l.body_type],
    ['Fuel', l.fuel_type],
    ['Transmission', l.transmission],
    ['Color', l.color],
    ['Location', l.location],
  ]
  return (
    <dl className="mt-5 grid grid-cols-2 gap-3 rounded-xl border border-[var(--line)] bg-[var(--panel-quiet)] p-4 sm:grid-cols-3">
      {items.filter(([, v]) => v).map(([k, v]) => (
        <div key={k}>
          <dt className="text-[10px] uppercase tracking-wide text-[var(--muted)]">{k}</dt>
          <dd className="text-sm font-medium">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

// ─── Post / Edit ────────────────────────────────────────────────────────────

interface FormState {
  title: string
  make: string
  model: string
  year: string
  price: string
  mileage: string
  fuel_type: string
  transmission: string
  body_type: string
  color: string
  description: string
  location: string
  contact_email: string
  lat: number | null
  lng: number | null
}

const EMPTY_FORM: FormState = {
  title: '',
  make: '',
  model: '',
  year: '',
  price: '',
  mileage: '',
  fuel_type: '',
  transmission: '',
  body_type: '',
  color: '',
  description: '',
  location: '',
  contact_email: '',
  lat: null,
  lng: null,
}

function PostView({
  mode,
  listingId,
  onDone,
  onCancel,
}: {
  mode: 'create' | 'edit'
  listingId?: string
  onDone: (id: string) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [photos, setPhotos] = useState<string[]>([])
  const [loaded, setLoaded] = useState(mode === 'create')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const idRef = useRef<string>(listingId ?? genId())

  useEffect(() => {
    if (mode !== 'edit' || !listingId) return
    let cancelled = false
    ;(async () => {
      const [rows, ps] = await Promise.all([
        dbQuery<Listing>(`SELECT * FROM listings WHERE id = ? LIMIT 1`, [listingId]),
        dbQuery<ListingPhoto>(`SELECT * FROM listing_photos WHERE listing_id = ? ORDER BY position ASC`, [listingId]),
      ])
      if (cancelled) return
      const l = rows[0]
      if (l) {
        setForm({
          title: l.title,
          make: l.make,
          model: l.model,
          year: String(l.year),
          price: (l.price_cents / 100).toString(),
          mileage: String(l.mileage_km),
          fuel_type: l.fuel_type ?? '',
          transmission: l.transmission ?? '',
          body_type: l.body_type ?? '',
          color: l.color ?? '',
          description: l.description ?? '',
          location: l.location,
          contact_email: l.contact_email ?? '',
          lat: l.lat,
          lng: l.lng,
        })
        setPhotos(ps.map(p => p.url))
      }
      setLoaded(true)
    })()
    return () => { cancelled = true }
  }, [mode, listingId])

  const update = (patch: Partial<FormState>) => setForm(f => ({ ...f, ...patch }))

  async function handleUpload(files: FileList | null) {
    if (!files) return
    const uploads = Array.from(files).slice(0, 8 - photos.length)
    for (const file of uploads) {
      try {
        const path = imagePathFor(idRef.current, file.name)
        await app.storage.uploadPublic(path, file, file.type)
        setPhotos(p => [...p, app.storage.publicUrl(path)])
      } catch (e) {
        setError('Upload failed: ' + (e as Error).message)
      }
    }
  }

  async function handleGeocode() {
    if (!form.location.trim()) return
    try {
      const results = await app.maps.geocode(form.location, 1)
      if (results[0]) update({ lat: results[0].lat, lng: results[0].lng })
    } catch (e) {
      console.warn('Geocode failed:', e)
    }
  }

  async function submit() {
    setError(null)
    const priceCents = parsePrice(form.price)
    const mileage = parseInt0(form.mileage)
    const year = parseInt0(form.year)
    if (!form.title.trim()) return setError('Title is required.')
    if (!form.make.trim()) return setError('Make is required.')
    if (!form.model.trim()) return setError('Model is required.')
    if (!year) return setError('Year is required.')
    if (priceCents === null || priceCents <= 0) return setError('A valid price is required.')
    if (!mileage && mileage !== 0) return setError('Mileage is required.')
    if (!form.location.trim()) return setError('Location is required.')

    setSubmitting(true)
    try {
      const user = app.auth.user
      if (!user) throw new Error('Not signed in.')
      const id = idRef.current
      const now = Date.now()

      if (mode === 'create') {
        await dbExec(
          `INSERT INTO listings (id, title, make, model, year, price_cents, mileage_km,
            fuel_type, transmission, body_type, color, description, location, lat, lng,
            contact_email, status, seller_id, seller_login, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
          [
            id, form.title.trim(), form.make.trim(), form.model.trim(), year, priceCents, mileage,
            form.fuel_type || null, form.transmission || null, form.body_type || null,
            form.color || null, form.description || null, form.location.trim(),
            form.lat, form.lng, form.contact_email || null,
            user.id, user.login ?? null, now,
          ],
        )
      } else {
        await dbExec(
          `UPDATE listings SET title=?, make=?, model=?, year=?, price_cents=?, mileage_km=?,
             fuel_type=?, transmission=?, body_type=?, color=?, description=?, location=?,
             lat=?, lng=?, contact_email=?
           WHERE id = ? AND seller_id = ?`,
          [
            form.title.trim(), form.make.trim(), form.model.trim(), year, priceCents, mileage,
            form.fuel_type || null, form.transmission || null, form.body_type || null,
            form.color || null, form.description || null, form.location.trim(),
            form.lat, form.lng, form.contact_email || null,
            id, user.id,
          ],
        )
        await dbExec(`DELETE FROM listing_photos WHERE listing_id = ?`, [id])
      }

      for (let i = 0; i < photos.length; i++) {
        await dbExec(
          `INSERT INTO listing_photos (id, listing_id, url, position) VALUES (?, ?, ?, ?)`,
          [genId(), id, photos[i], i],
        )
      }
      onDone(id)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  if (!loaded) return <CenterMessage text="Loading…" />

  return (
    <div className="mx-auto max-w-2xl">
      <BackButton onClick={onCancel} />
      <h1 className="display-font mb-6 text-2xl font-bold">{mode === 'create' ? 'Post a listing' : 'Edit listing'}</h1>

      <div className="space-y-5 rounded-2xl border border-[var(--line)] bg-[var(--card-gradient)] p-6 shadow-[var(--shadow-card)]">
        <Field label="Title">
          <input
            type="text"
            placeholder="2019 Mazda CX-5 GT — low km, one owner"
            value={form.title}
            onChange={e => update({ title: e.target.value })}
            className="w-full rounded-xl border border-[var(--line)] bg-[var(--glass)] px-3 py-2 text-sm"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Make">
            <select
              value={form.make}
              onChange={e => update({ make: e.target.value })}
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--glass)] px-3 py-2 text-sm"
            >
              <option value="">Choose…</option>
              {COMMON_MAKES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="Model">
            <input
              type="text"
              value={form.model}
              onChange={e => update({ model: e.target.value })}
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--glass)] px-3 py-2 text-sm"
            />
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Year">
            <select
              value={form.year}
              onChange={e => update({ year: e.target.value })}
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--glass)] px-3 py-2 text-sm"
            >
              <option value="">—</option>
              {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </Field>
          <Field label="Price ($)">
            <input
              type="text"
              inputMode="numeric"
              placeholder="25000"
              value={form.price}
              onChange={e => update({ price: e.target.value })}
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--glass)] px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Mileage (km)">
            <input
              type="text"
              inputMode="numeric"
              placeholder="45000"
              value={form.mileage}
              onChange={e => update({ mileage: e.target.value })}
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--glass)] px-3 py-2 text-sm"
            />
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Fuel">
            <select
              value={form.fuel_type}
              onChange={e => update({ fuel_type: e.target.value })}
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--glass)] px-3 py-2 text-sm"
            >
              <option value="">—</option>
              {FUEL_TYPES.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </Field>
          <Field label="Transmission">
            <select
              value={form.transmission}
              onChange={e => update({ transmission: e.target.value })}
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--glass)] px-3 py-2 text-sm"
            >
              <option value="">—</option>
              {TRANSMISSIONS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Body">
            <select
              value={form.body_type}
              onChange={e => update({ body_type: e.target.value })}
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--glass)] px-3 py-2 text-sm"
            >
              <option value="">—</option>
              {BODY_TYPES.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Color">
            <input
              type="text"
              value={form.color}
              onChange={e => update({ color: e.target.value })}
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--glass)] px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Contact email">
            <input
              type="email"
              placeholder="you@example.com"
              value={form.contact_email}
              onChange={e => update({ contact_email: e.target.value })}
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--glass)] px-3 py-2 text-sm"
            />
          </Field>
        </div>

        <Field label="Location">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Sydney, NSW"
              value={form.location}
              onChange={e => update({ location: e.target.value, lat: null, lng: null })}
              onBlur={handleGeocode}
              className="flex-1 rounded-xl border border-[var(--line)] bg-[var(--glass)] px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={handleGeocode}
              className="rounded-xl border border-[var(--line)] bg-[var(--glass)] px-3 py-2 text-xs font-semibold hover:bg-[var(--glass-hover)]"
            >
              Find on map
            </button>
          </div>
          {form.lat !== null && form.lng !== null && (
            <p className="mt-1 text-xs text-[var(--mint-deep)]">✓ Pin set ({form.lat.toFixed(3)}, {form.lng.toFixed(3)})</p>
          )}
        </Field>

        <Field label="Description">
          <textarea
            rows={5}
            placeholder="Service history, condition, what's included…"
            value={form.description}
            onChange={e => update({ description: e.target.value })}
            className="w-full rounded-xl border border-[var(--line)] bg-[var(--glass)] px-3 py-2 text-sm"
          />
        </Field>

        <Field label={`Photos (${photos.length}/8)`}>
          <div className="grid grid-cols-4 gap-2">
            {photos.map((url, i) => (
              <div key={url} className="relative aspect-square overflow-hidden rounded-lg border border-[var(--line)]">
                <img src={url} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setPhotos(p => p.filter((_, j) => j !== i))}
                  className="absolute right-1 top-1 rounded-full bg-black/70 px-2 text-xs text-white"
                  aria-label="Remove photo"
                >
                  ×
                </button>
              </div>
            ))}
            {photos.length < 8 && (
              <label className="flex aspect-square cursor-pointer items-center justify-center rounded-lg border border-dashed border-[var(--line-strong)] bg-[var(--glass)] text-xs text-[var(--muted)] hover:bg-[var(--glass-hover)]">
                + Add
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={e => handleUpload(e.target.files)}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </Field>

        {error && <p className="text-sm text-[var(--error)]">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onCancel}
            className="rounded-2xl border border-[var(--line)] bg-[var(--glass)] px-4 py-2 text-sm font-semibold hover:bg-[var(--glass-hover)]"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="rounded-2xl bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-deep)] disabled:opacity-50"
          >
            {submitting ? 'Saving…' : mode === 'create' ? 'Post listing' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{label}</span>
      {children}
    </label>
  )
}

// ─── My listings ────────────────────────────────────────────────────────────

function MyListingsView({ onOpen, onPost }: { onOpen: (id: string) => void; onPost: () => void }) {
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
    await dbExec(`DELETE FROM listing_photos WHERE listing_id = ?`, [id])
    await dbExec(`DELETE FROM listings WHERE id = ?`, [id])
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

// ─── Saved ──────────────────────────────────────────────────────────────────

function SavedView({ onOpen }: { onOpen: (id: string) => void }) {
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

// ─── Shared bits ────────────────────────────────────────────────────────────

function CenterMessage({ text }: { text: string }) {
  return (
    <div className="flex min-h-[40dvh] items-center justify-center">
      <p className="text-sm text-[var(--muted)]">{text}</p>
    </div>
  )
}

function EmptyState({ title, hint, action }: { title: string; hint: string; action?: React.ReactNode }) {
  return (
    <div className="flex min-h-[40dvh] flex-col items-center justify-center gap-3 text-center">
      <p className="display-font text-xl font-bold">{title}</p>
      <p className="text-sm text-[var(--muted)]">{hint}</p>
      {action}
    </div>
  )
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="mb-4 rounded-full border border-[var(--line)] bg-[var(--glass)] px-3 py-1 text-xs font-semibold hover:bg-[var(--glass-hover)]"
    >
      ← Back
    </button>
  )
}
