import { useEffect, useState } from 'react'
import { ProShell } from '@proappstore/sdk/shell'
import type { View } from './types.ts'
import { app, migrations } from './sdk.ts'
import { CenterMessage } from './shared.tsx'
import { TopNav } from './views/TopNav.tsx'
import { BrowseView } from './views/Browse.tsx'
import { DetailView } from './views/Detail.tsx'
import { PostView } from './views/Post.tsx'
import { MyListingsView } from './views/Mine.tsx'
import { SavedView } from './views/Saved.tsx'
import { InboxView } from './views/Inbox.tsx'
import { ChatView } from './views/Chat.tsx'

export default function App() {
  return (
    <ProShell app={app} appName="Carsads">
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

  if (migrationError) return <DatabaseError msg={migrationError} />
  if (!migrationsRan) return <CenterMessage text="Loading…" />

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24">
      <TopNav view={view} setView={setView} />
      {view.kind === 'browse' && (
        <BrowseView onOpen={id => setView({ kind: 'detail', id })} />
      )}
      {view.kind === 'detail' && (
        <DetailView
          id={view.id}
          onBack={() => setView({ kind: 'browse' })}
          onEdit={id => setView({ kind: 'edit', id })}
          onOpen={id => setView({ kind: 'detail', id })}
          onMessage={listingId => {
            const buyerId = app.auth.user?.id
            if (!buyerId) return
            setView({ kind: 'chat', listingId, buyerId })
          }}
        />
      )}
      {view.kind === 'post' && (
        <PostView mode="create" onDone={id => setView({ kind: 'detail', id })} onCancel={() => setView({ kind: 'browse' })} />
      )}
      {view.kind === 'edit' && (
        <PostView mode="edit" listingId={view.id} onDone={id => setView({ kind: 'detail', id })} onCancel={() => setView({ kind: 'detail', id: view.id })} />
      )}
      {view.kind === 'mine' && (
        <MyListingsView onOpen={id => setView({ kind: 'detail', id })} onPost={() => setView({ kind: 'post' })} />
      )}
      {view.kind === 'saved' && <SavedView onOpen={id => setView({ kind: 'detail', id })} />}
      {view.kind === 'inbox' && (
        <InboxView
          onOpenThread={(listingId, buyerId) => setView({ kind: 'chat', listingId, buyerId })}
          onOpenListing={id => setView({ kind: 'detail', id })}
        />
      )}
      {view.kind === 'chat' && (
        <ChatView
          listingId={view.listingId}
          buyerId={view.buyerId}
          onBack={() => setView({ kind: 'inbox' })}
          onOpenListing={() => setView({ kind: 'detail', id: view.listingId })}
        />
      )}
    </div>
  )
}

function DatabaseError({ msg }: { msg: string }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-12 text-center">
      <p className="display-font text-xl font-bold text-[var(--error)]">Database error</p>
      <p className="mt-2 text-sm text-[var(--muted)]">
        The data worker isn't reachable. If this is a fresh install, the D1 database hasn't been provisioned yet.
      </p>
      <pre className="mt-4 overflow-auto rounded-xl bg-[var(--panel-quiet)] p-3 text-left text-xs text-[var(--muted)]">{msg}</pre>
    </div>
  )
}
