/**
 * src/db/queries.js
 * All database operations — calls + transcripts.
 * Uses Supabase JS client (no raw SQL needed for CRUD).
 */
const supabase = require('./client');
const logger   = require('../utils/logger');

// ─── CALLS ────────────────────────────────────────────────────────────────────

/**
 * Create a new call record when Twilio fires the first webhook.
 * @param {string} callSid   – Twilio CallSid (used as primary key)
 * @param {string} from      – Caller's phone number
 * @param {string} to        – Your Twilio number
 */
async function createCall(callSid, from, to) {
  const { data, error } = await supabase
    .from('calls')
    .insert({
      id:          callSid,
      from_number: from,
      to_number:   to,
      status:      'initiated'
    })
    .select()
    .single();

  if (error) {
    logger.error('DB createCall error', { callSid, error: error.message });
    throw error;
  }
  logger.debug('DB createCall OK', { callSid });
  return data;
}

/**
 * Update call status (in-progress, completed, failed).
 */
async function updateCallStatus(callSid, status) {
  const updates = { status };
  if (status === 'completed' || status === 'failed') {
    updates.ended_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('calls')
    .update(updates)
    .eq('id', callSid);

  if (error) logger.error('DB updateCallStatus error', { callSid, error: error.message });
}

/**
 * Increment the conversation turn counter.
 */
async function incrementTurnCount(callSid) {
  // Supabase doesn't have an atomic increment via JS client,
  // so we fetch + update (fine for our low-concurrency use case).
  const { data: call } = await supabase
    .from('calls')
    .select('turn_count')
    .eq('id', callSid)
    .single();

  if (!call) return;

  await supabase
    .from('calls')
    .update({ turn_count: (call.turn_count || 0) + 1 })
    .eq('id', callSid);
}

/**
 * Mark call as completed with final duration.
 */
async function completeCall(callSid, durationSec) {
  const { error } = await supabase
    .from('calls')
    .update({
      status:       'completed',
      ended_at:     new Date().toISOString(),
      duration_sec: durationSec || 0
    })
    .eq('id', callSid);

  if (error) logger.error('DB completeCall error', { callSid, error: error.message });
  else logger.info('Call completed', { callSid, durationSec });
}

// ─── TRANSCRIPTS ──────────────────────────────────────────────────────────────

/**
 * Append a single transcript entry.
 * @param {string} callSid
 * @param {'user'|'assistant'} speaker
 * @param {string} message
 */
async function addTranscript(callSid, speaker, message) {
  const { error } = await supabase
    .from('transcripts')
    .insert({ call_id: callSid, speaker, message });

  if (error) logger.error('DB addTranscript error', { callSid, error: error.message });
  else logger.debug('Transcript saved', { callSid, speaker, preview: message.slice(0, 60) });
}

// ─── QUERIES ──────────────────────────────────────────────────────────────────

/**
 * Get full call log (call metadata + all transcript rows).
 */
async function getFullCallLog(callSid) {
  const { data: call, error: callErr } = await supabase
    .from('calls')
    .select('*')
    .eq('id', callSid)
    .single();

  if (callErr) throw callErr;

  const { data: transcripts, error: txErr } = await supabase
    .from('transcripts')
    .select('*')
    .eq('call_id', callSid)
    .order('created_at', { ascending: true });

  if (txErr) throw txErr;

  return { call, transcripts };
}

/**
 * Get recent calls (most recent first, paginated).
 */
async function getRecentCalls(limit = 20, offset = 0) {
  const { data, error } = await supabase
    .from('calls')
    .select('*')
    .order('started_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data;
}

/**
 * Get conversation history for a call as an array of {role, content} objects
 * — ready to pass directly to the OpenAI messages array.
 */
async function getConversationHistory(callSid) {
  const { data, error } = await supabase
    .from('transcripts')
    .select('speaker, message')
    .eq('call_id', callSid)
    .order('created_at', { ascending: true });

  if (error) throw error;

  // Map 'user'/'assistant' → OpenAI roles (already match)
  return (data || []).map(row => ({
    role:    row.speaker,   // 'user' | 'assistant'
    content: row.message
  }));
}

module.exports = {
  createCall,
  updateCallStatus,
  incrementTurnCount,
  completeCall,
  addTranscript,
  getFullCallLog,
  getRecentCalls,
  getConversationHistory
};
