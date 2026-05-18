/**
 * src/services/stt.js
 * Speech-to-Text via OpenAI Whisper API
 */
require('dotenv').config();
const axios = require('axios');
const FormData = require('form-data');
const logger = require('../utils/logger');

async function transcribe(recordingUrl) {
  // 1. Download audio from Twilio
  const audioResponse = await axios.get(recordingUrl + '.mp3', {
    responseType: 'arraybuffer',
    auth: {
      username: process.env.TWILIO_ACCOUNT_SID,
      password: process.env.TWILIO_AUTH_TOKEN
    }
  });

  logger.debug('Audio downloaded from Twilio', { bytes: audioResponse.data.byteLength });

  // 2. Send to Whisper
  const form = new FormData();
  form.append('file', Buffer.from(audioResponse.data), {
    filename: 'audio.mp3',
    contentType: 'audio/mpeg'
  });
  form.append('model', 'whisper-1');
  form.append('language', 'te');          // Telugu
  form.append('prompt', 'Telugu and English mixed conversation, Hyderabad style');

  const whisperResponse = await axios.post(
    'https://api.openai.com/v1/audio/transcriptions',
    form,
    {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      }
    }
  );

  const text = whisperResponse.data.text.trim();
  logger.info('Whisper STT result', { text });
  return text;
}

module.exports = { transcribe };