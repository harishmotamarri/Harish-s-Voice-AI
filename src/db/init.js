/**
 * src/db/init.js
 * Run once: node src/db/init.js
 * Creates the Supabase tables for calls and transcripts.
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function initDB() {
  console.log('🔧  Initialising Supabase schema …');

  // ── calls ──────────────────────────────────────────────────────────────────
  const { error: callsErr } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS calls (
        id              TEXT PRIMARY KEY,          -- Twilio CallSid
        from_number     TEXT NOT NULL,
        to_number       TEXT NOT NULL,
        status          TEXT DEFAULT 'initiated',  -- initiated | in-progress | completed | failed
        started_at      TIMESTAMPTZ DEFAULT NOW(),
        ended_at        TIMESTAMPTZ,
        duration_sec    INTEGER,
        turn_count      INTEGER DEFAULT 0
      );
    `
  });
  if (callsErr) throw new Error('calls table: ' + callsErr.message);
  console.log('  ✅  calls table ready');

  // ── transcripts ────────────────────────────────────────────────────────────
  const { error: txErr } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS transcripts (
        id          BIGSERIAL PRIMARY KEY,
        call_id     TEXT REFERENCES calls(id) ON DELETE CASCADE,
        speaker     TEXT NOT NULL,               -- 'user' | 'assistant'
        message     TEXT NOT NULL,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_transcripts_call_id ON transcripts(call_id);
    `
  });
  if (txErr) throw new Error('transcripts table: ' + txErr.message);
  console.log('  ✅  transcripts table ready');

  console.log('\n🎉  Supabase schema initialised successfully!');
  console.log('    Open your Supabase dashboard → Table Editor to verify.\n');
}

initDB().catch(err => {
  console.error('❌  DB init failed:', err.message);
  console.error('\n💡  Tip: Make sure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env');
  console.error('    If exec_sql RPC is missing, run the SQL manually in Supabase → SQL Editor.\n');
  process.exit(1);
});
