# 📞 Harish Voice AI Assistant
### Real-time Telugu+English Voice AI · Twilio · Whisper · GPT-4o · ElevenLabs · **Supabase**

---

## 🗺️ Build Roadmap

| Step | What We Build | Status |
|------|--------------|--------|
| 1 | Architecture + Project Setup | ✅ Done |
| 1b | **Supabase DB (replaces SQLite)** | ✅ Done |
| 2 | Twilio Call Handling + Webhook Server | ✅ Done |
| 3 | Speech-to-Text (Whisper API) | 🔜 Next |
| 4 | LLM Response Engine (GPT-4o) | 🔜 |
| 5 | TTS — ElevenLabs Voice Cloning | 🔜 |
| 6 | Full Conversation Loop | 🔜 |
| 7 | Testing + ngrok | 🔜 |
| 8 | Deployment (Render/Railway) | 🔜 |

---

## 🚀 Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Set up environment variables
```bash
cp .env.example .env
# Edit .env with your real keys (see API Keys section below)
```

### 3. Set up Supabase (2 minutes)
1. Go to [supabase.com](https://supabase.com) → New Project (free tier)
2. Copy **Project URL** → `SUPABASE_URL` in `.env`
3. Copy **service_role key** (Settings → API) → `SUPABASE_SERVICE_ROLE_KEY` in `.env`
4. Go to **SQL Editor** → paste `supabase-schema.sql` → click Run

### 4. Verify setup
```bash
node tests/verify-setup.js
```

### 5. Start server
```bash
npm run dev
```

### 6. Expose to internet (for Twilio webhooks)
```bash
# Install ngrok: https://ngrok.com
ngrok http 3000
# Copy the https://xxxx.ngrok.io URL → paste as BASE_URL in .env
```

### 7. Configure Twilio
1. [Twilio Console](https://console.twilio.com) → Phone Numbers → your number
2. Voice Configuration → Webhook:
   - **When a call comes in:** `https://your-ngrok-url.ngrok.io/voice/incoming` (POST)
   - **Call Status Changes:** `https://your-ngrok-url.ngrok.io/voice/status` (POST)
3. Save

### 8. Test — call your Twilio number! 📞

---

## 🔑 API Keys — Where to Get Them

| Service | Where | Free Tier |
|---------|-------|-----------|
| **Twilio** | [console.twilio.com](https://console.twilio.com) | $15 trial credit |
| **OpenAI** | [platform.openai.com](https://platform.openai.com) | Pay-as-you-go |
| **Supabase** | [supabase.com](https://supabase.com) | 500MB free forever |
| **ElevenLabs** | [elevenlabs.io](https://elevenlabs.io) | 10k chars/month free |

---

## 📁 Project Structure

```
harish-voice-ai/
├── src/
│   ├── server.js              # Express entry point
│   ├── db/
│   │   ├── client.js          # Supabase singleton client
│   │   ├── init.js            # Schema initialiser
│   │   └── queries.js         # All DB operations
│   ├── routes/
│   │   ├── voice.js           # Twilio webhooks (Step 2)
│   │   ├── process.js         # Internal test endpoint
│   │   └── logs.js            # Call log REST API
│   ├── services/
│   │   ├── pipeline.js        # STT → LLM → TTS orchestrator
│   │   ├── stt.js             # Whisper (Step 3)
│   │   ├── llm.js             # GPT-4o + Harish personality
│   │   └── tts.js             # ElevenLabs (Step 5)
│   └── utils/
│       └── logger.js          # Winston logger
├── tests/
│   └── verify-setup.js        # Pre-flight checks
├── audio/                     # Generated TTS audio files
├── logs/                      # App logs
├── supabase-schema.sql        # Paste into Supabase SQL Editor
└── .env.example
```

---

## 🔗 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Server health check |
| POST | `/voice/incoming` | Twilio incoming call webhook |
| POST | `/voice/gather` | Twilio speech result webhook |
| POST | `/voice/status` | Twilio call status updates |
| POST | `/process/test` | Test AI pipeline directly |
| GET | `/logs/calls` | List recent calls |
| GET | `/logs/calls/:sid` | Full transcript for a call |

---

## 🧪 Testing Without a Real Call

```bash
# Test the AI pipeline directly
curl -X POST http://localhost:3000/process/test \
  -H "Content-Type: application/json" \
  -d '{"callSid":"TEST001","text":"Haa Harish, ela unnav?"}'
```

---

## 💰 Cost Estimate (Monthly)

| Service | Free Tier | Paid (est.) |
|---------|-----------|-------------|
| Supabase | ✅ 500MB free | $25/mo |
| Twilio | $15 trial | ~$1/100 min |
| OpenAI GPT-4o | — | ~$0.005/call |
| ElevenLabs | 10k chars free | $5/mo |
| **Total** | **~$0** | **~$10/mo** |



By Harish Motamarri.