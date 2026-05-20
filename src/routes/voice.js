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
  if (process.env.NODE_ENV !== 'production') return next();

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
// ─────────────────────────────────────────────────────────────────────────────
router.post('/incoming', validateTwilio, async (req, res) => {
  const { CallSid, From, To, CallStatus } = req.body;
  const twiml = new VoiceResponse();

  logger.info('📞  Incoming call', { CallSid, From, To, CallStatus });

  try {
    await db.createCall(CallSid, From, To);
    const greetingText = 'Hello, cheppu ra, enduku call chesav?';
    await db.addTranscriptOnce(CallSid, 'assistant', greetingText);

    const { synthesize } = require('../services/tts');

    try {
      const greetingAudio = await synthesize(greetingText, CallSid);

      // ✅ FIX 1: play INSIDE gather + speechTimeout '3' instead of 'auto'
      const gather = twiml.gather({
        input:           'speech',
        action:          `${process.env.BASE_URL}/voice/gather`,
        method:          'POST',
        language:        'te-IN',
        speechTimeout:   '3',
        speechModel:     'phone_call',
        profanityFilter: false,
      });
      gather.play(greetingAudio);

    } catch (e) {
      logger.warn('Greeting TTS failed, using fallback Say', { error: e.message });
      buildGatherTwiML(twiml, CallSid, greetingText);
    }

    // ✅ FIX 2: redirect after gather — silent caller loops back, never hangs up
    twiml.redirect({ method: 'POST' }, `${process.env.BASE_URL}/voice/incoming`);

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
// ─────────────────────────────────────────────────────────────────────────────
router.post('/gather', validateTwilio, async (req, res) => {
  const {
    CallSid,
    SpeechResult,
    RecordingUrl,
    Confidence,
    CallStatus
  } = req.body;

  const twiml = new VoiceResponse();

  logger.info('🎤  Speech received', { CallSid, SpeechResult, Confidence, CallStatus });

  // ✅ FIX 3: silence handler — play INSIDE gather + redirect fallback
  if (!SpeechResult && !RecordingUrl) {
    logger.warn('No speech input, asking follow-up', { CallSid });

    try {
      const { replyText, audioUrl } = await pipeline.process({
        callSid: CallSid,
        speechResult: '',
        recordingUrl: null,
        silent: true,
      });

      // ✅ play INSIDE gather
      const gather = twiml.gather({
        input:           'speech',
        action:          `${process.env.BASE_URL}/voice/gather`,
        method:          'POST',
        language:        'te-IN',
        speechTimeout:   '3',
        speechModel:     'phone_call',
        profanityFilter: false,
      });

      if (audioUrl) {
        gather.play(audioUrl);
      } else {
        gather.say({ voice: 'Polly.Aditi-Neural', language: 'en-IN' }, replyText);
      }

    } catch (e) {
      buildGatherTwiML(twiml, CallSid, 'enti ra, cheppu ra, em jarigindi?');
    }

    // ✅ redirect fallback — if still silent, loop back
    twiml.redirect({ method: 'POST' }, `${process.env.BASE_URL}/voice/gather`);
    return res.type('text/xml').send(twiml.toString());
  }

  if (CallStatus === 'completed') {
    logger.info('Call already completed, skipping', { CallSid });
    return res.status(200).send('');
  }

  try {
    const { replyText, audioUrl, shouldHangup } = await pipeline.process({
      callSid:      CallSid,
      speechResult: SpeechResult,
      recordingUrl: RecordingUrl,
    });

    // ✅ Only hang up when user explicitly said bye
    if (shouldHangup) {
      await db.updateCallStatus(CallSid, 'completed');
      if (audioUrl) {
        twiml.play(audioUrl);
      } else {
        twiml.say({ language: 'en-IN' }, replyText);
      }
      twiml.pause({ length: 1 });
      twiml.hangup();
      logger.info('☎️  Hanging up', { CallSid });
      return res.type('text/xml').send(twiml.toString());
    }

    logger.info('🤖  AI reply ready', { CallSid, replyText: replyText.slice(0, 80) });

    // ✅ FIX 4: play INSIDE gather + speechTimeout '3' + redirect fallback
    if (audioUrl) {
      const gather = twiml.gather({
        input:           'speech',
        action:          `${process.env.BASE_URL}/voice/gather`,
        method:          'POST',
        language:        'te-IN',
        speechTimeout:   '3',
        speechModel:     'phone_call',
        profanityFilter: false,
        enhanced:        true,
      });
      gather.play(audioUrl);

    } else {
      buildGatherTwiML(twiml, CallSid, replyText);
    }

    // ✅ redirect — if caller silent after AI speaks, loop back, never hang up
    twiml.redirect({ method: 'POST' }, `${process.env.BASE_URL}/voice/gather`);

    res.type('text/xml').send(twiml.toString());

  } catch (err) {
    logger.error('Pipeline error', { CallSid, error: err.message });
    buildGatherTwiML(twiml, CallSid, 'Sorry, oka chinna problem vacchindi. Malli try cheyyandi.');
    res.type('text/xml').send(twiml.toString());
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /voice/status
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
// Helper — build a <Gather> with <Say> inside + redirect fallback
// ─────────────────────────────────────────────────────────────────────────────
function buildGatherTwiML(twiml, callSid, text) {
  const gather = twiml.gather({
    input:           'speech',
    action:          `${process.env.BASE_URL}/voice/gather`,
    method:          'POST',
    language:        'te-IN',
    speechTimeout:   '3',
    speechModel:     'phone_call',
    profanityFilter: false,
  });

  gather.say({ voice: 'Polly.Aditi-Neural', language: 'en-IN' }, text);

  // Redirect after timeout — never hang up
  twiml.redirect(`${process.env.BASE_URL}/voice/gather`);

  return gather;
}

module.exports = router;
