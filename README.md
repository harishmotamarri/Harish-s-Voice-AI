# 📞 Harish Voice AI Assistant

A real-time, bilingual (Telugu + English) conversational Voice AI assistant that mimics the personality of a 19-year-old Hyderabadi college student.

![Screenshot](screenshot.png)

## Demo

Live: [https://harish-s-voice-ai.onrender.com](https://harish-s-voice-ai.onrender.com)

## Overview

### What problem it solves
Traditional voice assistants are robotic, overly formal, and struggle with regional Indian dialects and code-switching (mixing English and local languages like Telugu). Harish Voice AI solves this by acting like a close friend from Hyderabad. It understands natural speech and replies in Tenglish (Romanized Telugu) with authentic local slang.

### Who it is for
Developers interested in low-latency voice agents, hyper-local LLM personalities, Twilio integrations, and interactive real-time telephonic AI agents.

### Key idea behind the project
By linking Twilio call webhooks with a fast AI pipeline—composed of Whisper API for Telugu speech-to-text, Llama 3.1 on Groq for ultra-fast conversational reasoning, and Microsoft Edge TTS for natural Indian-accented speech synthesis—we achieve sub-second response times, logged live into a Supabase database.

## Features

- **Bilingual & Colloquial Understanding**: Transcribes and processes mixed Telugu and English (Tenglish) inputs using OpenAI's Whisper model.
- **Hyper-Local Hyderabadi Personality**: Built-in prompt engineering mimics a 19-year-old CSE student from CMR Institute of Technology, featuring signature expressions like *"ORINII"*, *"picha lite"*, and *"atla emi ledhu ley kaani"*.
- **Live Analytics Dashboard**: Web-based frontend displaying real-time call states, active call timers, and live transcription updates.
- **Fast Response Latency**: Uses Groq's `llama-3.1-8b-instant` and Microsoft Edge TTS to ensure the conversation flows like a real phone call.
- **Robust Conversation Handling**: Preconfigured rules for silence detection, delay deflection (e.g. naturally complaining about signal lag), and automatic call termination.
- **Voice Cloning (Optional)**: Includes a standalone Python Flask server using XTTS v2 to clone and generate audio with a customized voice profile.

## Tech Stack

### Frontend
- HTML5
- CSS3 (Vanilla glassmorphism & dark theme)
- JavaScript (ES6+ with SSE/REST polling)

### Backend
- Node.js (Express)
- Python (Flask - for optional local XTTS server)

### Database
- Supabase (PostgreSQL)

### Tools & APIs
- Twilio (Voice Webhooks & Call Handling)
- Groq Cloud API (Llama 3.1 8B LLM)
- OpenAI API (Whisper STT)
- Microsoft Edge TTS (Indian English Voice)
- ElevenLabs API (Optional cloned voice)
- ngrok (Secure local tunnel)
- Git

## Screenshots

### Home Page
![Home](screenshots/home.png)

### Dashboard / Live Timer
![Dashboard](screenshots/dashboard.png)

## Architecture

```text
       User Call (Mobile Phone)
                 │
                 ▼
          Twilio Carrier
                 │
      (HTTP POST Webhook)
                 │
                 ▼
       Node.js Express App (Render) ◄───► Supabase DB (PostgreSQL)
                 │
    ┌────────────┼────────────┐
    │            │            │
    ▼            ▼            ▼
Whisper STT   Groq LLM    Edge TTS
 (OpenAI)    (Llama 3)   (Microsoft)
    │            │            │
    └───────────►┴───────────►┘
                 │
                 ▼
       TwiML Audio Response
                 │
                 ▼
           Twilio Carrier
                 │
                 ▼
         User hears response
```

## Project Structure

```text
harish-voice-ai/
├── audio/                     # Generated TTS audio cache files
├── logs/                      # Application runtime log files
├── src/
│   ├── db/
│   │   ├── client.js          # Supabase client singleton setup
│   │   ├── init.js            # Table schema verification script
│   │   └── queries.js         # Call log and transcript database queries
│   ├── public/
│   │   └── index.html         # Main dashboard HTML (static assets)
│   ├── routes/
│   │   ├── logs.js            # REST endpoints for active call logs and history
│   │   ├── process.js         # API for pipeline testing and web demo simulations
│   │   └── voice.js           # Twilio inbound/outbound call webhook endpoints
│   ├── services/
│   │   ├── llm.js             # Groq SDK configuration & Hyderabadi Llama rules
│   │   ├── pipeline.js        # Pipeline orchestrator (STT -> LLM -> TTS)
│   │   ├── stt.js             # Whisper API connector
│   │   └── tts.js             # EdgeTTS voice compiler (or ElevenLabs if active)
│   ├── utils/
│   │   └── logger.js          # Winston logger instance
│   ├── views/
│   │   └── timer.html         # Live active call tracker dashboard view
│   └── server.js              # Express server and socket/REST routes setup
├── tests/
│   └── verify-setup.js        # Environment validation and connectivity checks
├── .env.example               # Template file for local configurations
├── package.json               # Package dependencies and run scripts
├── supabase-schema.sql        # Database tables definition for Supabase SQL Editor
├── vercel.json                # Vercel platform deploy settings
└── voice_server.py            # Optional Python XTTS voice clone server
```

## Installation

### Clone Repository

```bash
git clone https://github.com/harishmotamarri/Harish-s-Voice-AI.git
cd harish-voice-ai
```

### Install Dependencies

```bash
npm install
```

### Database Setup

1. Create a free PostgreSQL instance on [Supabase](https://supabase.com).
2. Open the **SQL Editor** in your Supabase project dashboard.
3. Paste the contents of [supabase-schema.sql](file:///c:/Users/motam/Desktop/FOLDERS/PROJECTS/Harish%20Voice%20AI/harish-voice-ai/supabase-schema.sql) and run the query to initialize the database tables.

### Run Pre-flight Checks

Verify that your environmental keys and database are properly configured before starting the application:

```bash
node tests/verify-setup.js
```

### Run Server

```bash
# Development (with nodemon)
npm run dev

# Production
npm start
```

## Environment Variables

Copy `.env.example` to a new `.env` file and populate it with your API keys:

```bash
cp .env.example .env
```

Required variables:

```env
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
OPENAI_API_KEY=your_openai_api_key
GROQ_API_KEY=your_groq_api_key
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
BASE_URL=your_public_ngrok_or_domain_url
```

## API Documentation

### Health Check

```http
GET /health
```

Response:

```json
{
  "status": "ok",
  "service": "Harish Voice AI",
  "version": "2.0.0",
  "db": "supabase",
  "time": "2026-06-15T12:00:00.000Z"
}
```

### Web Trigger Call Simulation

```http
POST /process/test
Content-Type: application/json

{
  "callSid": "TEST_CALL_123",
  "text": "Haa Harish, ela unnav?"
}
```

Response:

```json
{
  "replyText": "Haa ra baagunnanu, nuvvu ela unnavu?",
  "audioUrl": "https://your-domain.com/audio/TEST_CALL_123_1779000000.mp3",
  "shouldHangup": false
}
```

### Call Logs API

```http
GET /logs/calls
```

Response:

```json
[
  {
    "id": "CAxxxxxxxxxxxxxxxxxx",
    "from_number": "+1234567890",
    "status": "completed",
    "started_at": "2026-06-15T10:00:00Z",
    "turn_count": 5
  }
]
```

## Challenges & Learnings

- **Bilingual Tone Control**: Prompting Llama-3.1-8B to reject outputting Telugu Unicode script and instead write phonetically spelled Telugu (Tenglish) in English characters requires precise instruction tuning.
- **Latency Optimization**: The initial stack utilized ElevenLabs for custom voice replication, but network latency during sequential API calls (STT -> LLM -> TTS) exceeded 3.5 seconds. Re-routing the default TTS channel to Microsoft Edge TTS (`en-IN-NeerjaNeural`) brought the latency down to sub-second levels.
- **State Management**: Using Supabase to persist transient active call states allowed the application to safely reload and scale without disrupting the real-time live dashboard.

## Future Improvements

- Add native WebSocket-based streaming using Twilio Media Streams to support complete duplex audio.
- Integrate direct local compilation of the XTTS v2 python model to bypass external API charges completely.
- Refine the custom Telugu transliteration ruleset to catch complex dialect accents.

## Contributing

Contributions are welcome. Please open an issue or submit a pull request.

## License

MIT License

## Author

**Harish Motamarri**
- GitHub: [harishmotamarri](https://github.com/harishmotamarri)
- LinkedIn: [Harish Motamarri](https://linkedin.com/in/harish-motamarri)