/**
 * src/routes/voice.js
 * STEP 2 — Twilio Webhook Handlers
 *
 * Endpoints:
 *   POST /voice/incoming   — Twilio calls this when a call arrives
 *   POST /voice/gather     — Twilio sends speech result here
 *   POST /voice/status     — Call status updates (completed, failed…)
 */
require('dotenv').config();
const express = require('express');
const twilio = require('twilio');
const db = require('../db/queries');
const logger = require('../utils/logger');
const pipeline = require('../services/pipeline');

const router = express.Router();
const VoiceResponse = twilio.twiml.VoiceResponse;

// ── Validate Twilio signature in production ───────────────────────────────────
function validateTwilio(req, res, next) {
  if (process.env.NODE_ENV !== 'production') return next(); // skip in dev

  const valid = twilio.validateRequest(
    process.env.TWILIO_AUTH_TOKEN,
    req.headers['x-twilio-signature'],
    process.env.BASE_URL + req.originalUrl,
    req.body
  );

  if (!valid) {
    logger.warn('Invalid Twilio signature', { ip: req.ip });
    return res.status(403).send('Forbidden');
  }
  next();
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /voice/incoming
// Twilio calls this the moment a call arrives.
// We create a DB record and speak the opening greeting.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/incoming', validateTwilio, async (req, res) => {
  const { CallSid, From, To, CallStatus } = req.body;
  const twiml = new VoiceResponse();

  logger.info('📞  Incoming call', { CallSid, From, To, CallStatus });

  try {
    // 1. Persist call record
    await db.createCall(CallSid, From, To);

    // 2. Generate greeting TwiML
    //    We use <Gather> with input="speech" so Twilio records the caller
    //    and POSTs the transcript to /voice/gather.
    const greeting = buildGatherTwiML(
      twiml,
      CallSid,
      'Haa! Meeru call chesaaru. Cheppandi, em kavali?'  // will be replaced by TTS audio in Step 5
    );

    logger.debug('TwiML generated for greeting', { CallSid });
    res.type('text/xml').send(twiml.toString());
  } catch (err) {
    logger.error('Error handling incoming call', { CallSid, error: err.message });
    twiml.say({ language: 'te-IN' }, 'Oops, connection lo problem undi. Malli try cheyyandi.');
    twiml.hangup();
    res.type('text/xml').send(twiml.toString());
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /voice/gather
// Twilio sends the caller's transcribed speech here.
// We run it through the pipeline (STT → LLM → TTS) and reply.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/gather', validateTwilio, async (req, res) => {
  const {
    CallSid,
    SpeechResult,     // Twilio's built-in STT result (used as fallback in Step 3)
    RecordingUrl,     // URL to the audio — sent to Whisper for better accuracy
    Confidence,
    CallStatus
  } = req.body;

  const twiml = new VoiceResponse();

  logger.info('🎤  Speech received', {
    CallSid,
    SpeechResult,
    Confidence,
    CallStatus
  });

  // Caller hung up or no speech detected
  if (!SpeechResult && !RecordingUrl) {
    logger.warn('No speech input, re-prompting', { CallSid });
    buildGatherTwiML(twiml, CallSid, 'Meeru em annaaru? Malli cheppandi.');
    return res.type('text/xml').send(twiml.toString());
  }

  if (CallStatus === 'completed') {
    logger.info('Call already completed, skipping', { CallSid });
    return res.status(200).send('');
  }

  try {
    // 2. Run through AI pipeline: STT (if needed) → LLM → TTS
    const { replyText, audioUrl, shouldHangup } = await pipeline.process({
      callSid: CallSid,
      speechResult: SpeechResult,  // Twilio's built-in transcript (fallback)
      recordingUrl: RecordingUrl   // Whisper will use this in Step 3
    });

    if (shouldHangup) {
      twiml.say({ voice: 'Polly.Aditi' }, replyText);
      twiml.hangup();
      return res.type('text/xml').send(twiml.toString());
    }

    logger.info('🤖  AI reply ready', { CallSid, replyText: replyText.slice(0, 80) });

    // 3. Build response TwiML
    if (audioUrl) {
      // Step 5: play ElevenLabs cloned-voice audio
      const gather = twiml.gather({
        input: 'speech',
        action: `${process.env.BASE_URL}/voice/gather`,
        method: 'POST',
        language: 'te-IN',
        speechTimeout: 'auto',
        speechModel: 'phone_call'
      });
      gather.play(audioUrl);
    } else {
      // Steps 2–4: fallback to Twilio's built-in TTS
      buildGatherTwiML(twiml, CallSid, replyText);
    }

    res.type('text/xml').send(twiml.toString());
  } catch (err) {
    logger.error('Pipeline error', { CallSid, error: err.message });
    buildGatherTwiML(
      twiml, CallSid,
      'Sorry, oka chinna problem vacchindi. Malli try cheyyandi.'
    );
    res.type('text/xml').send(twiml.toString());
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /voice/status
// Twilio fires status callbacks: initiated → ringing → in-progress → completed
// ─────────────────────────────────────────────────────────────────────────────
router.post('/status', validateTwilio, async (req, res) => {
  const { CallSid, CallStatus, CallDuration } = req.body;

  logger.info('📊  Call status update', { CallSid, CallStatus, CallDuration });

  try {
    if (CallStatus === 'completed') {
      await db.completeCall(CallSid, parseInt(CallDuration || '0', 10));
    } else {
      await db.updateCallStatus(CallSid, CallStatus);
    }
  } catch (err) {
    logger.error('Status update DB error', { CallSid, error: err.message });
  }

  res.status(200).send('');
});

// ─────────────────────────────────────────────────────────────────────────────
// Helper — build a <Gather> block with a <Say> inside
// ─────────────────────────────────────────────────────────────────────────────
function buildGatherTwiML(twiml, callSid, text) {
  const gather = twiml.gather({
    input: 'speech',
    action: `${process.env.BASE_URL}/voice/gather`,
    method: 'POST',
    language: 'te-IN',         // Telugu-India
    speechTimeout: 'auto',          // Twilio decides silence boundary
    speechModel: 'phone_call',    // optimised for telephony
    profanityFilter: false
  });

  // Twilio built-in TTS (replaced by ElevenLabs audio in Step 5)
  gather.say(
    {
      voice: 'Polly.Aditi',      // Indian English — closest available
      language: 'hi-IN'            // Hindi EN is clearest for Twilio free tier
    },
    text
  );

  // If caller doesn't speak, re-prompt once then hang up
  twiml.say({ voice: 'Polly.Aditi' }, 'Meeru em annaaru vinipinchaledu. Bye!');
  twiml.hangup();

  return gather;
}

module.exports = router;
