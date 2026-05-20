import { initPro } from '@proappstore/sdk'

// Carsads — a pro app on https://proappstore.online
//
// Per-app data worker provisioned by `pas publish`. The platform's current
// canonical pattern is the workers.dev hostname rather than a custom
// proappstore.online subdomain; see PLATFORM-NOTES.md for the convention
// divergence.
export const app = initPro({
  appId: 'carsads',
  dataApiBase: 'https://pas-data-carsads.serge-the-dev.workers.dev',
})

export async function dbQuery<T>(sql: string, params?: unknown[]): Promise<T[]> {
  try {
    const r = await app.db.query<T>(sql, params)
    return r.rows
  } catch (err) {
    console.error('DB query failed:', sql, err)
    return []
  }
}

export async function dbExec(sql: string, params?: unknown[]) {
  return app.db.execute(sql, params)
}

export const migrations = [
  {
    name: '0001_init',
    sql: `
      CREATE TABLE IF NOT EXISTS listings (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        make TEXT NOT NULL,
        model TEXT NOT NULL,
        year INTEGER NOT NULL,
        price_cents INTEGER NOT NULL,
        mileage_km INTEGER NOT NULL,
        fuel_type TEXT,
        transmission TEXT,
        body_type TEXT,
        color TEXT,
        description TEXT,
        location TEXT NOT NULL,
        lat REAL,
        lng REAL,
        contact_email TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        seller_id TEXT NOT NULL,
        seller_login TEXT,
        created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS listing_photos (
        id TEXT PRIMARY KEY,
        listing_id TEXT NOT NULL,
        url TEXT NOT NULL,
        position INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
      CREATE INDEX IF NOT EXISTS idx_listings_seller ON listings(seller_id);
      CREATE INDEX IF NOT EXISTS idx_listings_make ON listings(make);
      CREATE INDEX IF NOT EXISTS idx_photos_listing ON listing_photos(listing_id)
    `,
  },
  {
    name: '0002_messages',
    sql: `
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        listing_id TEXT NOT NULL,
        buyer_id TEXT NOT NULL,
        buyer_login TEXT,
        sender_id TEXT NOT NULL,
        sender_login TEXT,
        content TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(listing_id, buyer_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_messages_buyer ON messages(buyer_id, created_at)
    `,
  },
]
