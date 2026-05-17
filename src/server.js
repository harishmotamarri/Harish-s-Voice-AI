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

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.urlencoded({ extended: false })); // Twilio sends form-encoded
app.use(express.json());

// Serve generated audio files (for TTS in Step 5)
app.use('/audio', express.static(path.join(__dirname, '../audio')));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/voice',   voiceRoutes);
app.use('/process', processRoutes);
app.use('/logs',    logsRoutes);

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

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  logger.info(`🚀  Harish Voice AI started on port ${PORT}`);
  logger.info(`    Health: http://localhost:${PORT}/health`);
  logger.info(`    DB:     Supabase`);
  logger.info(`    Env:    ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
