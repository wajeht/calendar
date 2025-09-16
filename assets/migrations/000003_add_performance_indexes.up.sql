-- Index for GetVisibleCalendars query (hidden = 0 AND data IS NOT NULL)
CREATE INDEX IF NOT EXISTS idx_calendars_visible ON calendars(hidden, data);

-- Index for created_at ordering (used in most queries)
CREATE INDEX IF NOT EXISTS idx_calendars_created_at ON calendars(created_at);

-- Index for URL lookups (unique constraint already exists, but explicit index helps)
-- The UNIQUE constraint on url already creates an index, so this is optional
-- CREATE INDEX IF NOT EXISTS idx_calendars_url ON calendars(url);