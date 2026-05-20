import type { Message } from '../types.ts'
import { relativeDate } from '../utils.ts'

export function MessageBubble({ m, mine }: { m: Message; mine: boolean }) {
  return (
    <div className={'flex ' + (mine ? 'justify-end' : 'justify-start')}>
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
}
