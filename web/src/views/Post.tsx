import { useEffect, useRef, useState } from 'react'
import type { Listing, ListingPhoto } from '../types.ts'
import {
  BODY_TYPES,
  COMMON_MAKES,
  FUEL_TYPES,
  TRANSMISSIONS,
} from '../types.ts'
import {
  genId,
  imagePathFor,
  parseInt0,
  parsePrice,
  YEAR_OPTIONS,
} from '../utils.ts'
import { app, dbQuery } from '../sdk.ts'
import { BackButton, CenterMessage } from '../shared.tsx'

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

export function PostView({
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
  const [uploading, setUploading] = useState(0)
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
    setUploading(u => u + uploads.length)
    try {
      for (const file of uploads) {
        try {
          const path = imagePathFor(idRef.current, file.name)
          const result = await app.storage.uploadPublic(path, file, file.type)
          setPhotos(p => [...p, result.url])
        } catch (e) {
          setError('Upload failed: ' + (e as Error).message)
        } finally {
          setUploading(u => u - 1)
        }
      }
    } catch {
      // setUploading already balanced in finally
    }
  }

  async function handleGeocode() {
    if (!form.location.trim()) return
    if (form.lat !== null && form.lng !== null) return // already pinned for this location
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

      const listingStmt = mode === 'create'
        ? {
            sql: `INSERT INTO listings (id, title, make, model, year, price_cents, mileage_km,
                    fuel_type, transmission, body_type, color, description, location, lat, lng,
                    contact_email, status, seller_id, seller_login, created_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
            params: [
              id, form.title.trim(), form.make.trim(), form.model.trim(), year, priceCents, mileage,
              form.fuel_type || null, form.transmission || null, form.body_type || null,
              form.color || null, form.description || null, form.location.trim(),
              form.lat, form.lng, form.contact_email || null,
              user.id, user.login ?? null, now,
            ],
          }
        : {
            sql: `UPDATE listings SET title=?, make=?, model=?, year=?, price_cents=?, mileage_km=?,
                    fuel_type=?, transmission=?, body_type=?, color=?, description=?, location=?,
                    lat=?, lng=?, contact_email=?
                  WHERE id = ? AND seller_id = ?`,
            params: [
              form.title.trim(), form.make.trim(), form.model.trim(), year, priceCents, mileage,
              form.fuel_type || null, form.transmission || null, form.body_type || null,
              form.color || null, form.description || null, form.location.trim(),
              form.lat, form.lng, form.contact_email || null,
              id, user.id,
            ],
          }

      const photoStmts = [
        ...(mode === 'edit'
          ? [{ sql: `DELETE FROM listing_photos WHERE listing_id = ?`, params: [id] }]
          : []),
        ...photos.map((url, i) => ({
          sql: `INSERT INTO listing_photos (id, listing_id, url, position) VALUES (?, ?, ?, ?)`,
          params: [genId(), id, url, i],
        })),
      ]

      await app.db.batch([listingStmt, ...photoStmts])
      onDone(id)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  if (!loaded) return <CenterMessage text="Loading…" />

  const inputClass = "w-full rounded-xl border border-[var(--line)] bg-[var(--glass)] px-3 py-2 text-sm"

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
            className={inputClass}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Make">
            <select value={form.make} onChange={e => update({ make: e.target.value })} className={inputClass}>
              <option value="">Choose…</option>
              {COMMON_MAKES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="Model">
            <input type="text" value={form.model} onChange={e => update({ model: e.target.value })} className={inputClass} />
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Year">
            <select value={form.year} onChange={e => update({ year: e.target.value })} className={inputClass}>
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
              className={inputClass}
            />
          </Field>
          <Field label="Mileage (km)">
            <input
              type="text"
              inputMode="numeric"
              placeholder="45000"
              value={form.mileage}
              onChange={e => update({ mileage: e.target.value })}
              className={inputClass}
            />
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Fuel">
            <select value={form.fuel_type} onChange={e => update({ fuel_type: e.target.value })} className={inputClass}>
              <option value="">—</option>
              {FUEL_TYPES.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </Field>
          <Field label="Transmission">
            <select value={form.transmission} onChange={e => update({ transmission: e.target.value })} className={inputClass}>
              <option value="">—</option>
              {TRANSMISSIONS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Body">
            <select value={form.body_type} onChange={e => update({ body_type: e.target.value })} className={inputClass}>
              <option value="">—</option>
              {BODY_TYPES.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Color">
            <input type="text" value={form.color} onChange={e => update({ color: e.target.value })} className={inputClass} />
          </Field>
          <Field label="Contact email">
            <input
              type="email"
              placeholder="you@example.com"
              value={form.contact_email}
              onChange={e => update({ contact_email: e.target.value })}
              className={inputClass}
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
              className={`flex-1 ${inputClass}`}
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
            className={inputClass}
          />
        </Field>

        <Field label={`Photos (${photos.length}/8)${uploading > 0 ? ` — uploading ${uploading}…` : ''}`}>
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
            {Array.from({ length: uploading }).map((_, i) => (
              <div key={`pending-${i}`} className="flex aspect-square items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--glass)] text-xs text-[var(--muted)]">
                Uploading…
              </div>
            ))}
            {photos.length + uploading < 8 && (
              <label className="flex aspect-square cursor-pointer items-center justify-center rounded-lg border border-dashed border-[var(--line-strong)] bg-[var(--glass)] text-xs text-[var(--muted)] hover:bg-[var(--glass-hover)]">
                + Add
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={e => { handleUpload(e.target.files); e.target.value = '' }}
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
