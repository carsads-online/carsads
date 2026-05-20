import type { Listing } from '../types.ts'
import { formatMileage } from '../utils.ts'

export function SpecsGrid({ l }: { l: Listing }) {
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
