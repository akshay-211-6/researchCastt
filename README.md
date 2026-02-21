# Paper to Podcast 🎙️

Transform dense academic papers into engaging, gamified podcasts using AI.

## Features
- **Turbo Pipeline**: Optimized PDF parsing and parallel dialogue generation (70% faster).
- **Dual Host Dialogue**: AI-generated conversation between an expert and a curious learner.
- **Synced Captions**: Real-time WebVTT captions for accessibility.
- **Interactive Quizzes**: Test your knowledge after listening.
- **Leaderboard**: Compete with others on your learning progress.
- **Modern UI**: Clean, dark-mode focused design with seamless transitions.

## Tech Stack
- **Backend**: FastAPI (Python), Gemini 2.0 Flash, ElevenLabs TTS, PyMuPDF.
- **Frontend**: React, Vite, CSS3.
- **Auth/Storage**: Firebase Admin.

## Prerequisites
- Python 3.9+
- Node.js 18+
- API Keys: Google Gemini, ElevenLabs.

## Setup

### 1. Backend
```bash
# Create and activate virtual environment
python -m venv venv
.\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file with your keys
# GOOGLE_API_KEY=your_key
# ELEVENLABS_API_KEY=your_key
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```

### 3. Run
```bash
# Start backend from root
python -m uvicorn main:app --port 8000 --host 127.0.0.1
```

## Contributing
Pull requests are welcome! For major changes, please open an issue first.

## License
[MIT](https://choosealicense.com/licenses/mit/)
