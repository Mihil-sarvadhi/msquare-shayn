CREATE TABLE IF NOT EXISTS connector_health (
  id              SERIAL PRIMARY KEY,
  connector_name  TEXT UNIQUE,
  last_sync_at    TIMESTAMPTZ,
  status          TEXT DEFAULT 'unknown',
  error_message   TEXT,
  records_synced  INTEGER DEFAULT 0,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO connector_health (connector_name, status)
VALUES ('shopify', 'unknown'), ('meta_ads', 'unknown'), ('ithink', 'unknown')
ON CONFLICT (connector_name) DO NOTHING;
