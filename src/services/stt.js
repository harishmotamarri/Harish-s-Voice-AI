/**
 * src/services/stt.js
 * Speech-to-Text via OpenAI Whisper.
 * STUB — full implementation in Step 3.
 */
async function transcribe(recordingUrl) {
  // Step 3 will:
  //  1. Download audio from Twilio's RecordingUrl
  //  2. Send to OpenAI Whisper API with language='te' (Telugu)
  //  3. Return transcribed text
  throw new Error('Whisper STT not yet implemented — using Twilio fallback');
}

module.exports = { transcribe };
