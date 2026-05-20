/**
 * src/server.js
 * Entry point — Express app wiring.
 */
require('dotenv').config();
const express = require('express');
const path    = require('path');
const logger  = require('./utils/logger');

const voiceRoutes   = require('./routes/voice');
const processRoutes = require('./routes/process');
const logsRoutes    = require('./routes/logs');

const llm = require('./services/llm');
const tts = require('./services/tts');
const pipeline = require('./services/pipeline');
const db  = require('./db/queries');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.urlencoded({ extended: false })); // Twilio sends form-encoded
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
const AUDIO_DIR = process.env.NODE_ENV === 'production' 
  ? '/tmp/audio' 
  : path.join(__dirname, '../audio');
app.use('/audio', express.static(AUDIO_DIR));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/voice',   voiceRoutes);
app.use('/process', processRoutes);
app.use('/logs',    logsRoutes);

app.post('/web/start', async (req, res) => {
  try {
    const { callSid } = req.body;
    await db.createCall(callSid, 'Browser Mic', 'Harish');
    await db.updateCallStatus(callSid, 'in-progress');

    const greetingText = 'Hello, cheppu ra, enduku call chesav?';
    await db.addTranscript(callSid, 'assistant', greetingText);
    const audioUrl = await tts.synthesize(greetingText, callSid + '_greeting');

    res.json({
      text: greetingText,
      audioUrl: audioUrl,
      callSid: callSid
    });
  } catch (err) {
    logger.error('Web start error', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

app.post('/web/process', async (req, res) => {
  try {
    const { text, callSid } = req.body;
    if (!text) return res.status(400).json({ error: 'text is required' });
    const sid = callSid || 'web_demo_' + Date.now();
    await db.updateCallStatus(sid, 'in-progress');

    const result = await pipeline.process({
      callSid: sid,
      speechResult: text,
      recordingUrl: null
    });

    res.json({
      text: result.replyText,
      audioUrl: result.audioUrl,
      callSid: sid,
      shouldHangup: result.shouldHangup
    });
  } catch (err) {
    logger.error('Web process error', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Harish Voice AI',
    version: '2.0.0',
    db: 'supabase',
    time: new Date().toISOString()
  });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  logger.error('Unhandled error', { path: req.path, error: err.message });
  res.status(500).json({ error: 'Internal server error' });
});
const { warmCache } = require('./services/tts');
// ── Start ─────────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    logger.info(`🚀  Harish Voice AI started on port ${PORT}`);
    logger.info(`    Health: http://localhost:${PORT}/health`);
    logger.info(`    DB:     Supabase`);
    logger.info(`    Env:    ${process.env.NODE_ENV || 'development'}`);
    const { warmCache } = require('./services/tts');
  });
}

module.exports = app;
