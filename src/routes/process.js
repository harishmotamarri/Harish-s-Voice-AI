/**
 * src/routes/process.js
 * Internal test route — simulate a conversation turn without a real call.
 *
 * POST /process/test
 *  Body: { callSid, text }
 */
const express = require('express');
const twilio = require('twilio');
const pipeline = require('../services/pipeline');
const logger = require('../utils/logger');

const router = express.Router();

router.post('/test', async (req, res) => {
  const { callSid = 'TEST_CALL_001', text } = req.body;

  if (!text) return res.status(400).json({ error: 'text is required' });

  try {
    const result = await pipeline.process({
      callSid,
      speechResult: text,
      recordingUrl: null
    });
    res.json({ ok: true, ...result });
  } catch (err) {
    logger.error('POST /process/test error', { error: err.message });
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/call-me', async (req, res) => {
  try {
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    const call = await client.calls.create({
      url: `${process.env.BASE_URL}/voice/incoming`,
      to: '+917658909216',   // 👈 replace with your number
      from: process.env.TWILIO_PHONE_NUMBER
    });

    console.log("Call initiated:", call.sid);

    res.json({
      success: true,
      callSid: call.sid
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
