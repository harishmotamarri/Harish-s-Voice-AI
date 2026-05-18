/**
 * src/services/pipeline.js
 * Master orchestrator: STT → LLM → TTS → DB
 *
 * Each step is a stub now; Steps 3, 4, 5 fill them in.
 */
const db = require('../db/queries');
const stt = require('./stt');
const llm = require('./llm');
const tts = require('./tts');
const logger = require('../utils/logger');

/**
 * @param {object} params
 * @param {string} params.callSid
 * @param {string} params.speechResult   — Twilio built-in STT (fallback)
 * @param {string} [params.recordingUrl] — Audio URL for Whisper (Step 3)
 * @returns {{ replyText: string, audioUrl: string|null }}
 */
async function process({ callSid, speechResult, recordingUrl }) {
  const startTime = Date.now();

  // ── 1. Speech-to-Text ────────────────────────────────────────────────────
  let userText = speechResult; // fallback

  if (recordingUrl) {
    try {
      userText = await stt.transcribe(recordingUrl);
      logger.info('STT (Whisper) result', { callSid, userText });
    } catch (err) {
      logger.warn('Whisper failed, using Twilio STT fallback', {
        callSid,
        error: err.message
      });
    }
  }

  if (!userText || userText.trim() === '') {
    return {
      replyText: 'Em annaaru vinaleedu. Malli cheppandi.',
      audioUrl: null
    };
  }

  // ── 2. Save user message ─────────────────────────────────────────────────
  await db.addTranscript(callSid, 'user', userText);
  await db.incrementTurnCount(callSid);

  // ── 3. Build conversation history & get LLM reply ────────────────────────
  const history = await db.getConversationHistory(callSid);
  const { reply: replyText, shouldHangup } = await llm.respond(history);

  // Save transcript + generate TTS in parallel
  const [audioUrl] = await Promise.all([
    tts.synthesize(replyText, callSid).catch(err => {
      logger.warn('TTS failed', { callSid, error: err.message });
      return null;
    }),
    db.addTranscript(callSid, 'assistant', replyText)
  ]);


  logger.info('Pipeline complete', {
    callSid,
    latencyMs: Date.now() - startTime,
    hasAudio: !!audioUrl
  });

  return { replyText, audioUrl, shouldHangup };
}

module.exports = { process };
