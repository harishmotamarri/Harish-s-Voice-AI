require('dotenv').config();
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

const AUDIO_DIR = process.env.NODE_ENV === 'production' 
  ? path.join('/tmp', 'audio') 
  : path.join(__dirname, '../../audio');
  
if (!fs.existsSync(AUDIO_DIR)) fs.mkdirSync(AUDIO_DIR, { recursive: true });

async function synthesize(text, callSid) {
  const filename = `${callSid}_${Date.now()}.mp3`;
  const filepath = path.join(AUDIO_DIR, filename);
  const audioUrl = `${process.env.BASE_URL}/audio/${filename}`;

  const tts = new MsEdgeTTS();
  await tts.setMetadata(
    'en-IN-NeerjaNeural',
    OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3
  );

  // toFile() returns a folder path — use startWithDefaultVoice instead
  const { audioStream } = await tts.toStream(text);

  const chunks = [];
  await new Promise((resolve, reject) => {
    audioStream.on('data', chunk => chunks.push(chunk));
    audioStream.on('end', resolve);
    audioStream.on('error', reject);
  });

  fs.writeFileSync(filepath, Buffer.concat(chunks));
  logger.info('EdgeTTS saved', { filename, audioUrl });
  return audioUrl;
}

module.exports = { synthesize };