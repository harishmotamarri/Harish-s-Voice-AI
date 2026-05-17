/**
 * src/routes/logs.js
 * REST API to browse call history stored in Supabase.
 *
 * GET /logs/calls            — recent calls
 * GET /logs/calls/:callSid   — full transcript for one call
 */
const express = require('express');
const db      = require('../db/queries');
const logger  = require('../utils/logger');

const router = express.Router();

// Recent calls list
router.get('/calls', async (req, res) => {
  try {
    const limit  = parseInt(req.query.limit  || '20', 10);
    const offset = parseInt(req.query.offset || '0',  10);
    const calls  = await db.getRecentCalls(limit, offset);
    res.json({ ok: true, count: calls.length, calls });
  } catch (err) {
    logger.error('GET /logs/calls error', { error: err.message });
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Full transcript for a single call
router.get('/calls/:callSid', async (req, res) => {
  try {
    const log = await db.getFullCallLog(req.params.callSid);
    res.json({ ok: true, ...log });
  } catch (err) {
    logger.error('GET /logs/calls/:callSid error', { error: err.message });
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
