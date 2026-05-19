-- Mirrors the 0001_init migration in web/src/App.tsx so the schema can be
-- applied directly to D1 without going through an authenticated SDK call.
-- Idempotent: safe to re-run.

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
CREATE INDEX IF NOT EXISTS idx_photos_listing ON listing_photos(listing_id);

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
CREATE INDEX IF NOT EXISTS idx_messages_buyer ON messages(buyer_id, created_at);

-- Mark the 0001_init migration as applied so the data-worker /migrate flow
-- (triggered by app.db.migrate on first signed-in load) doesn't try to
-- re-run it. The data-worker creates _migrations itself on first /migrate
-- call, so we create it here too.
CREATE TABLE IF NOT EXISTS _migrations (
  name TEXT PRIMARY KEY,
  applied_at INTEGER NOT NULL
);

INSERT OR IGNORE INTO _migrations (name, applied_at)
  VALUES ('0001_init', strftime('%s', 'now') * 1000);
INSERT OR IGNORE INTO _migrations (name, applied_at)
  VALUES ('0002_messages', strftime('%s', 'now') * 1000);
