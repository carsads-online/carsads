import { useEffect, useState } from 'react'
import type { ThreadSummary } from '../types.ts'
import { relativeDate } from '../utils.ts'
import { app, dbQuery } from '../sdk.ts'
import { CenterMessage, EmptyState } from '../shared.tsx'

export function InboxView({ onOpenThread, onOpenListing }: {
  onOpenThread: (listingId: string, buyerId: string) => void
  onOpenListing: (id: string) => void
}) {
  const [threads, setThreads] = useState<ThreadSummary[] | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const me = app.auth.user?.id
      if (!me) { setThreads([]); return }
      const rows = await dbQuery<ThreadSummary>(
        `SELECT
           m.listing_id, m.buyer_id,
           (SELECT buyer_login FROM messages WHERE listing_id = m.listing_id AND buyer_id = m.buyer_id AND buyer_login IS NOT NULL LIMIT 1) AS buyer_login,
           l.title AS listing_title,
           l.seller_id, l.seller_login,
           (SELECT content FROM messages WHERE listing_id = m.listing_id AND buyer_id = m.buyer_id ORDER BY created_at DESC LIMIT 1) AS latest_content,
           MAX(m.created_at) AS latest_at,
           COUNT(*) AS message_count,
           '' AS listing_cover
         FROM messages m
         JOIN listings l ON l.id = m.listing_id
         WHERE m.buyer_id = ?1 OR l.seller_id = ?1
         GROUP BY m.listing_id, m.buyer_id
         ORDER BY latest_at DESC`,
        [me],
      )
      if (cancelled) return
      // Fetch cover photo (position=0) for each unique listing
      const listingIds = Array.from(new Set(rows.map(r => r.listing_id)))
      const covers = new Map<string, string>()
      if (listingIds.length > 0) {
        const ph = await dbQuery<{ listing_id: string; url: string }>(
          `SELECT listing_id, url FROM listing_photos
           WHERE listing_id IN (${listingIds.map(() => '?').join(',')}) AND position = 0`,
          listingIds,
        )
        for (const p of ph) covers.set(p.listing_id, p.url)
      }
      if (!cancelled) setThreads(rows.map(r => ({ ...r, listing_cover: covers.get(r.listing_id) ?? null })))
    })()
    return () => { cancelled = true }
  }, [])

  if (!threads) return <CenterMessage text="Loading inbox…" />
  if (threads.length === 0) {
    return <EmptyState title="No conversations yet" hint="Message a seller from a listing detail page — or wait for buyers to reach out." />
  }
  const me = app.auth.user?.id
  return (
    <div className="space-y-2">
      {threads.map(t => {
        const iAmSeller = me === t.seller_id
        const counterparty = iAmSeller ? (t.buyer_login ?? 'Anonymous buyer') : (t.seller_login ?? 'Seller')
        return (
          <div
            key={t.listing_id + ':' + t.buyer_id}
            className="flex w-full items-center gap-4 rounded-2xl border border-[var(--line)] bg-[var(--card-gradient)] p-4 shadow-[var(--shadow-card)] hover:border-[var(--line-strong)]"
          >
            <button
              onClick={() => onOpenThread(t.listing_id, t.buyer_id)}
              className="flex flex-1 min-w-0 items-center gap-4 text-left"
            >
              <div className="h-14 w-14 flex-none overflow-hidden rounded-lg bg-[var(--paper-deep)]">
                {t.listing_cover ? (
                  <img src={t.listing_cover} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[10px] text-[var(--muted)]">No photo</div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="display-font truncate text-base font-semibold">{t.listing_title}</span>
                  <span className="flex-none text-[10px] uppercase tracking-wide text-[var(--muted)]">
                    {relativeDate(t.latest_at)}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-[var(--muted)]">
                  {iAmSeller ? 'From ' : 'With '}@{counterparty} · {t.message_count} message{t.message_count === 1 ? '' : 's'}
                </p>
                <p className="mt-1 truncate text-sm">{t.latest_content}</p>
              </div>
            </button>
            <button
              onClick={() => onOpenListing(t.listing_id)}
              className="flex-none rounded-full border border-[var(--line)] bg-[var(--glass)] px-2 py-1 text-[10px] font-semibold text-[var(--muted)] hover:bg-[var(--glass-hover)]"
              aria-label="View listing"
            >
              View
            </button>
          </div>
        )
      })}
    </div>
  )
}
