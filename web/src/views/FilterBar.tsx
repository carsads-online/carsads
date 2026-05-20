import type { Filters, Sort } from '../types.ts'
import {
  BODY_TYPES,
  COMMON_MAKES,
  FUEL_TYPES,
  SORT_LABELS,
} from '../types.ts'
import { YEAR_OPTIONS } from '../utils.ts'

const inputClass = "rounded-xl border border-[var(--line)] bg-[var(--glass)] px-3 py-2 text-sm"

export function FilterBar({ filters, setFilters }: { filters: Filters; setFilters: (f: Filters) => void }) {
  const update = (patch: Partial<Filters>) => setFilters({ ...filters, ...patch })
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
