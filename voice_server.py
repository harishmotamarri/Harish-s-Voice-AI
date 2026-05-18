from flask import Flask, request, send_file, jsonify
from TTS.api import TTS
import os, uuid, torch

app = Flask(__name__)

# Load XTTS v2 model — downloads automatically first time (~2GB)
print("Loading XTTS v2 model...")
device = "cuda" if torch.cuda.is_available() else "cpu"
tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to(device)
print("Model loaded!")

REFERENCE_VOICE = "reference.mp3"  # your recorded voice
AUDIO_DIR = "audio"
os.makedirs(AUDIO_DIR, exist_ok=True)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "model": "xtts_v2"})

@app.route('/synthesize', methods=['POST'])
def synthesize():
    data = request.json
    text = data.get('text', '')

    if not text:
        return jsonify({"error": "text required"}), 400

    if not os.path.exists(REFERENCE_VOICE):
        return jsonify({"error": "reference.mp3 not found"}), 400

    filename = f"{uuid.uuid4()}.mp3"
    filepath = os.path.join(AUDIO_DIR, filename)

    # Clone your voice and speak the text
    tts.tts_to_file(
        text=text,
        speaker_wav=REFERENCE_VOICE,
        language="en",       # 'en' handles Tanglish best
        file_path=filepath
    )

    print(f"Generated: {filename}")
    return send_file(filepath, mimetype='audio/mpeg')

if __name__ == '__main__':
    print("Starting voice server on port 5000...")
    app.run(host='0.0.0.0', port=5000, debug=False)
