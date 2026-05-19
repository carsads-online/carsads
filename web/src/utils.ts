export function formatPrice(cents: number): string {
  const dollars = Math.round(cents / 100)
  return '$' + dollars.toLocaleString('en-US')
}

export function formatMileage(km: number): string {
  if (km >= 1000) return (km / 1000).toFixed(km % 1000 === 0 ? 0 : 1) + 'k km'
  return km.toLocaleString('en-US') + ' km'
}

export function relativeDate(ts: number): string {
  const diff = Date.now() - ts
  const min = 60_000
  const hr = 60 * min
  const day = 24 * hr
  if (diff < min) return 'just now'
  if (diff < hr) return Math.floor(diff / min) + 'm ago'
  if (diff < day) return Math.floor(diff / hr) + 'h ago'
  if (diff < 7 * day) return Math.floor(diff / day) + 'd ago'
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function parsePrice(input: string): number | null {
  const cleaned = input.replace(/[^\d.]/g, '')
  if (!cleaned) return null
  const dollars = parseFloat(cleaned)
  if (!isFinite(dollars) || dollars < 0) return null
  return Math.round(dollars * 100)
}

export function parseInt0(input: string): number {
  const n = parseInt(input.replace(/[^\d]/g, ''), 10)
  return isFinite(n) ? n : 0
}

export function isSafeUrl(s: string | null | undefined): s is string {
  if (!s) return false
  try {
    const u = new URL(s)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

export function imagePathFor(listingId: string, filename: string): string {
  const ext = filename.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase() || 'jpg'
  return `listings/${listingId}/${crypto.randomUUID()}.${ext}`
}

const CURRENT_YEAR = new Date().getFullYear()
export const YEAR_OPTIONS: number[] = Array.from({ length: CURRENT_YEAR - 1980 + 2 }, (_, i) => CURRENT_YEAR + 1 - i)

export function genId(): string {
  return crypto.randomUUID()
}
