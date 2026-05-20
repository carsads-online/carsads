import type { ListingWithPhotos } from './types.ts'
import { formatPrice, formatMileage, relativeDate } from './utils.ts'

export function CenterMessage({ text }: { text: string }) {
  return (
    <div className="flex min-h-[40dvh] items-center justify-center">
      <p className="text-sm text-[var(--muted)]">{text}</p>
    </div>
  )
}

export function EmptyState({ title, hint, action }: { title: string; hint: string; action?: React.ReactNode }) {
  return (
    <div className="flex min-h-[40dvh] flex-col items-center justify-center gap-3 text-center">
      <p className="display-font text-xl font-bold">{title}</p>
      <p className="text-sm text-[var(--muted)]">{hint}</p>
      {action}
    </div>
  )
}

export function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="mb-4 rounded-full border border-[var(--line)] bg-[var(--glass)] px-3 py-1 text-xs font-semibold hover:bg-[var(--glass-hover)]"
    >
      ← Back
    </button>
  )
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{label}</span>
      {children}
    </label>
  )
}

export function ListingCard({ listing, onClick }: { listing: ListingWithPhotos; onClick: () => void }) {
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
