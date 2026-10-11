// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Listing, Message } from '../types.ts'
import { ChatView } from '../views/Chat.tsx'

const { dbQuery, dbExec } = vi.hoisted(() => ({ dbQuery: vi.fn(), dbExec: vi.fn() }))

vi.mock('../sdk.ts', () => ({
  app: { auth: { user: { id: 'buyer-1', login: 'buyer' } } },
  dbQuery,
  dbExec,
}))

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const listing = {
  id: 'l1', title: 'Test Car', price_cents: 1_000_000, seller_id: 'seller-1', seller_login: 'seller',
} as Listing

const message: Message = {
  id: 'm1', listing_id: 'l1', buyer_id: 'buyer-1', buyer_login: 'buyer',
  sender_id: 'seller-1', sender_login: 'seller', content: 'Still available', created_at: 1,
}

// Route dbQuery by table so each test controls listing and message results separately.
function mockQueries(opts: { listing?: () => Promise<Listing[]>, messages: () => Promise<Message[]> }) {
  dbQuery.mockImplementation((sql: string) =>
    sql.includes('FROM listings') ? (opts.listing ?? (async () => [listing]))() : opts.messages())
}

let container: HTMLDivElement
let root: Root

async function render() {
  await act(async () => {
    root.render(<ChatView listingId="l1" buyerId="buyer-1" onBack={() => {}} onOpenListing={() => {}} />)
  })
}

const textarea = () => container.querySelector('textarea')!
const form = () => container.querySelector('form')!
const sendButton = () => container.querySelector<HTMLButtonElement>('button[type="submit"]')!

async function type(text: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!
  await act(async () => {
    setter.call(textarea(), text)
    textarea().dispatchEvent(new Event('input', { bubbles: true }))
  })
}

function pressEnter() {
  textarea().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
}

function submit() {
  form().dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
}

beforeEach(() => {
  vi.useFakeTimers()
  dbQuery.mockReset()
  dbExec.mockReset()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  Object.defineProperty(document, 'hidden', { configurable: true, value: false })
  Element.prototype.scrollTo = () => {} // not implemented by jsdom
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('ChatView send', () => {
  it('sends once when Enter and submit fire repeatedly while a send is in flight', async () => {
    mockQueries({ messages: async () => [] })
    let resolveExec!: () => void
    dbExec.mockReturnValue(new Promise<void>(r => { resolveExec = r }))
    await render()
    await type('Is it available?')

    await act(async () => {
      pressEnter()
      pressEnter()
      submit()
      submit()
    })
    expect(dbExec).toHaveBeenCalledTimes(1)

    await act(async () => { resolveExec() })
    expect(textarea().value).toBe('')
  })

  it('keeps the draft and shows an error on failure, then retries successfully', async () => {
    mockQueries({ messages: async () => [] })
    dbExec.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce(undefined)
    await render()
    await type('Is it available?')

    await act(async () => { submit() })
    expect(textarea().value).toBe('Is it available?')
    expect(container.textContent).toContain('Failed to send')
    expect(sendButton().disabled).toBe(false)

    await act(async () => { sendButton().click() })
    expect(dbExec).toHaveBeenCalledTimes(2)
    expect(textarea().value).toBe('')
    expect(container.textContent).not.toContain('Failed to send')
  })
})

describe('ChatView polling', () => {
  it('shows a non-blocking notice on poll failure and recovers on the next poll', async () => {
    let fail = true
    mockQueries({ messages: async () => { if (fail) throw new Error('network'); return [message] } })
    await render()

    expect(container.textContent).toContain('Message refresh failed')
    expect(textarea()).not.toBeNull()

    fail = false
    await act(async () => { await vi.advanceTimersByTimeAsync(4000) })
    expect(container.textContent).not.toContain('Message refresh failed')
    expect(container.textContent).toContain('Still available')
  })

  it('does not start a new poll while the previous one is still in flight', async () => {
    mockQueries({ messages: () => new Promise<Message[]>(() => {}) })
    await render()
    await act(async () => { await vi.advanceTimersByTimeAsync(12_000) })
    const messageQueries = dbQuery.mock.calls.filter(([sql]) => String(sql).includes('FROM messages'))
    expect(messageQueries).toHaveLength(1)
  })

  it('keeps a listing-load error even when message polls succeed', async () => {
    mockQueries({ listing: async () => { throw new Error('db down') }, messages: async () => [message] })
    await render()
    expect(container.textContent).toContain('Failed to load data')

    await act(async () => { await vi.advanceTimersByTimeAsync(8000) })
    expect(container.textContent).toContain('Failed to load data')
    expect(textarea()).toBeNull()
  })
})
