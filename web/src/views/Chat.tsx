import { useEffect, useRef, useState } from 'react'
import type { Listing, Message } from '../types.ts'
import { formatPrice, genId, relativeDate } from '../utils.ts'
import { app, dbExec, dbQuery } from '../sdk.ts'
import { BackButton, CenterMessage, EmptyState } from '../shared.tsx'

export function ChatView({ listingId, buyerId, onBack, onOpenListing }: {
  listingId: string
  buyerId: string
  onBack: () => void
  onOpenListing: () => void
}) {
  const [listing, setListing] = useState<Listing | null | 'missing'>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const me = app.auth.user
  const scrollRef = useRef<HTMLDivElement>(null)

  // Load listing once.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const rows = await dbQuery<Listing>(`SELECT * FROM listings WHERE id = ? LIMIT 1`, [listingId])
      if (!cancelled) setListing(rows[0] ?? 'missing')
    })()
    return () => { cancelled = true }
  }, [listingId])

  // Poll messages every 4 seconds. Pauses while the tab is hidden.
  useEffect(() => {
    let cancelled = false
    let interval: ReturnType<typeof setInterval> | null = null

    async function refresh() {
      const rows = await dbQuery<Message>(
        `SELECT * FROM messages WHERE listing_id = ? AND buyer_id = ? ORDER BY created_at ASC`,
        [listingId, buyerId],
      )
      if (!cancelled) setMessages(rows)
    }

    function start() {
      if (interval !== null) return
      void refresh()
      interval = setInterval(refresh, 4000)
    }
    function stop() {
      if (interval !== null) { clearInterval(interval); interval = null }
    }
    function onVis() { document.hidden ? stop() : start() }

    if (!document.hidden) start()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      cancelled = true
      stop()
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [listingId, buyerId])

  // Auto-scroll to bottom — only when the user is already near the bottom (so we
  // don't yank them mid-scroll while reading older messages). Sending a message
  // keeps you at the bottom anyway because the composer is below the thread.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120
    if (nearBottom) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    }
  }, [messages.length])

  async function send() {
    const trimmed = content.trim()
    if (!trimmed || !me) return
    setSending(true)
    try {
      const msg: Message = {
        id: genId(),
        listing_id: listingId,
        buyer_id: buyerId,
        // seller-sent message keeps the buyer_login as recorded on first message
        buyer_login: listing && listing !== 'missing' && listing.seller_id === me.id
          ? null
          : me.login ?? null,
        sender_id: me.id,
        sender_login: me.login ?? null,
        content: trimmed,
        created_at: Date.now(),
      }
      await dbExec(
        `INSERT INTO messages (id, listing_id, buyer_id, buyer_login, sender_id, sender_login, content, created_at)
         VALUES (?, ?, ?, COALESCE(?, (SELECT buyer_login FROM messages WHERE listing_id = ? AND buyer_id = ? LIMIT 1)), ?, ?, ?, ?)`,
        [msg.id, msg.listing_id, msg.buyer_id, msg.buyer_login, msg.listing_id, msg.buyer_id, msg.sender_id, msg.sender_login, msg.content, msg.created_at],
      )
      setMessages(m => [...m, msg])
      setContent('')
    } catch (e) {
      console.error('Send failed', e)
    } finally {
      setSending(false)
    }
  }

  if (listing === null) return <CenterMessage text="Loading chat…" />
  if (listing === 'missing') {
    return (
      <div>
        <BackButton onClick={onBack} />
        <EmptyState title="Listing not found" hint="It may have been removed." />
      </div>
    )
  }

  const iAmSeller = me?.id === listing.seller_id
  const iAmBuyer = me?.id === buyerId
  const allowed = iAmSeller || iAmBuyer
  if (!allowed) {
    return (
      <div>
        <BackButton onClick={onBack} />
        <EmptyState title="Conversation not available" hint="You're not part of this thread." />
      </div>
    )
  }
  if (iAmSeller && buyerId === me?.id) {
    return (
      <div>
        <BackButton onClick={onBack} />
        <EmptyState title="That's your own listing" hint="You can't message yourself. Edit the listing instead." />
      </div>
    )
  }
  const counterpartyLogin = iAmSeller
    ? (messages.find(m => m.sender_id === buyerId)?.sender_login ?? messages.find(m => m.buyer_login)?.buyer_login ?? 'buyer')
    : (listing.seller_login ?? 'seller')

  return (
    <div className="mx-auto max-w-2xl">
      <BackButton onClick={onBack} />
      <button
        onClick={onOpenListing}
        className="mb-4 flex w-full items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--card-gradient)] p-3 text-left shadow-[var(--shadow-card)] hover:border-[var(--line-strong)]"
      >
        <div>
          <p className="display-font text-base font-semibold">{listing.title}</p>
          <p className="text-xs text-[var(--muted)]">
            {formatPrice(listing.price_cents)} · with @{counterpartyLogin} · {iAmSeller ? 'buyer thread' : 'seller thread'}
          </p>
        </div>
      </button>

      <div
        ref={scrollRef}
        className="mb-3 h-[55vh] overflow-y-auto rounded-2xl border border-[var(--line)] bg-[var(--glass)] p-4"
      >
        {messages.length === 0 ? (
          <p className="py-12 text-center text-sm text-[var(--muted)]">
            No messages yet. Say hi.
          </p>
        ) : (
          <div className="space-y-2">
            {messages.map(m => {
              const mine = m.sender_id === me?.id
              return (
                <div key={m.id} className={'flex ' + (mine ? 'justify-end' : 'justify-start')}>
                  <div
                    className={
                      'max-w-[80%] rounded-2xl px-3 py-2 text-sm ' +
                      (mine
                        ? 'bg-[var(--accent)] text-white'
                        : 'border border-[var(--line)] bg-[var(--paper-deep)]')
                    }
                  >
                    {!mine && (
                      <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide opacity-70">
                        @{m.sender_login ?? 'user'}
                      </p>
                    )}
                    <p className="whitespace-pre-wrap break-words">{m.content}</p>
                    <p className={'mt-1 text-[10px] ' + (mine ? 'text-white/70' : 'text-[var(--muted)]')}>
                      {relativeDate(m.created_at)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <form
        onSubmit={e => { e.preventDefault(); void send() }}
        className="flex items-end gap-2"
      >
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void send()
            }
          }}
          maxLength={2000}
          placeholder={iAmSeller ? 'Reply to buyer…' : 'Message the seller…'}
          rows={2}
          className="flex-1 resize-none rounded-2xl border border-[var(--line)] bg-[var(--glass)] px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={sending || !content.trim()}
          className="rounded-2xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white hover:bg-[var(--accent-deep)] disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  )
}
