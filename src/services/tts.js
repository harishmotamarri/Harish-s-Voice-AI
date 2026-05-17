/**
 * src/services/tts.js
 * Text-to-Speech via ElevenLabs.
 * STUB — full implementation in Step 5.
 */
async function synthesize(text, callSid) {
  // Step 5 will:
  //  1. Send text to ElevenLabs with Harish's cloned voice ID
  //  2. Save audio as .mp3 to /audio/ folder (or upload to Supabase Storage)
  //  3. Return public URL that Twilio can fetch
  throw new Error('ElevenLabs TTS not yet implemented — using Twilio Say fallback');
}

module.exports = { synthesize };
