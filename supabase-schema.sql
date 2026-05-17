-- ============================================================
-- Harish Voice AI — Supabase Schema
-- Paste this into Supabase → SQL Editor → Run
-- ============================================================

-- CALLS table
CREATE TABLE IF NOT EXISTS calls (
  id              TEXT PRIMARY KEY,           -- Twilio CallSid
  from_number     TEXT NOT NULL,
  to_number       TEXT NOT NULL,
  status          TEXT DEFAULT 'initiated',   -- initiated | in-progress | completed | failed
  started_at      TIMESTAMPTZ DEFAULT NOW(),
  ended_at        TIMESTAMPTZ,
  duration_sec    INTEGER,
  turn_count      INTEGER DEFAULT 0
);

-- TRANSCRIPTS table
CREATE TABLE IF NOT EXISTS transcripts (
  id          BIGSERIAL PRIMARY KEY,
  call_id     TEXT REFERENCES calls(id) ON DELETE CASCADE,
  speaker     TEXT NOT NULL,                  -- 'user' | 'assistant'
  message     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by call
CREATE INDEX IF NOT EXISTS idx_transcripts_call_id
  ON transcripts(call_id);

-- Optional: Row Level Security (disable for service role key)
-- ALTER TABLE calls       ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;

SELECT 'Schema created successfully ✅' AS result;
