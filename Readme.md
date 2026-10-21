# 🎬 Director Cut AI

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![Python](https://img.shields.io/badge/python-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54)
![OpenCV](https://img.shields.io/badge/opencv-%23white.svg?style=for-the-badge&logo=opencv&logoColor=white)

**Director Cut AI** is a fully automated, locally-hosted AI video editing pipeline that acts as an autonomous film director. It analyzes raw footage, determines the most engaging highlights, and synthesizes context-aware AI voiceovers—all without relying on cloud APIs.

---

## ✨ Features

* **Multi-Modal AI Analysis:** Combines Computer Vision (motion energy) with Audio Processing (word-level transcription).
* **Autonomous Storyboarding:** Uses local Large Language Models to write a custom intro script based on the context of the footage.
* **Generative Voiceovers:** Synthesizes human-like neural audio specifically tailored to the context of the clip.
* **Zero-Touch Editing:** Upload raw footage, and the system automatically cuts, ducks background audio, layers voiceovers, and adds backing tracks.
* **100% Local & Private:** Powered entirely by on-device AI. No media is sent to third-party cloud servers.

---

## 🧠 System Architecture

* **Frontend:** React.js, Vite, Custom Glassmorphism UI
* **Backend:** Python, FastAPI, Server-Sent Events (SSE)
* **Computer Vision:** OpenCV (Frame-by-frame visual energy mapping)
* **Audio Processing:** Faster-Whisper (Word-level timestamps)
* **AI Director:** Llama 3.1 (via Ollama)
* **Neural Audio Synthesis:** Kokoro-82M TTS
* **Video Rendering:** MoviePy v2.0+

---

## 🚀 Installation & Setup

### Prerequisites
* Python 3.10+
* Node.js & npm
* [Ollama](https://ollama.ai/) installed locally with the `llama3.1` model pulled (`ollama run llama3.1`).

### 1. Backend Setup
Navigate to the backend directory, create a virtual environment, and install dependencies:
```bash
cd backend
python -m venv venv
source venv/Scripts/activate  # On Windows use: venv\Scripts\activate
pip install fastapi uvicorn faster-whisper opencv-python ollama soundfile numpy moviepy
