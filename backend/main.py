import os
import cv2
import numpy as np
import soundfile as sf
import ollama
import asyncio
import json
import random
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from faster_whisper import WhisperModel
from kokoro import KPipeline
from moviepy import VideoFileClip, AudioFileClip, CompositeAudioClip

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="."), name="static")

class EditPlan(BaseModel):
    start_time: float
    end_time: float
    intro_script: str
    outro_script: str

@app.post("/generate-director-cut/")
async def generate_director_cut(file: UploadFile = File(...)):
    async def process_pipeline():
        video_path = f"temp_{file.filename}"
        
        base_name = os.path.splitext(file.filename)[0]
        final_filename = f"final_cut_{base_name}.mp4"
        
        yield "data: 1/5 - Saving uploaded video to local disk...\n\n"
        with open(video_path, "wb") as buffer:
            buffer.write(await file.read())

        yield "data: 2/5 - Extracting audio and generating word-level timestamps...\n\n"
        whisper_data = await asyncio.to_thread(_run_whisper, video_path)

        yield "data: 3/5 - Analyzing visual motion energy (OpenCV)....\n\n"
        energy_scores = await asyncio.to_thread(_run_opencv, video_path)

        yield "data: 4/5 - Consulting Local AI Director for edit plan (Ollama)...\n\n"
        edit_plan = await asyncio.to_thread(_run_ollama, whisper_data, energy_scores)

        yield "data: 5/5 - Synthesizing voiceover (Kokoro) and rendering final video...\n\n"
        await asyncio.to_thread(_render_final_video, video_path, edit_plan, final_filename)

        final_payload = {
            "status": "DONE",
            "video_url": f"http://localhost:8000/static/{final_filename}",
            "plan": edit_plan.model_dump()
        }
        yield f"data: {json.dumps(final_payload)}\n\n"
        
        if os.path.exists(video_path):
            os.remove(video_path)

    return StreamingResponse(process_pipeline(), media_type="text/event-stream")

def _run_whisper(video_path: str):
    model = WhisperModel("base", device="cpu", compute_type="int8")
    segments, info = model.transcribe(video_path, word_timestamps=True)
    return list(segments)

def _run_opencv(video_path: str):
    cap = cv2.VideoCapture(video_path)
    ret, prev_frame = cap.read()
    if not ret: return []
    prev_gray = cv2.cvtColor(prev_frame, cv2.COLOR_BGR2GRAY)
    
    energy_scores = []
    while True:
        ret, frame = cap.read()
        if not ret: break
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        frame_delta = cv2.absdiff(prev_gray, gray)
        thresh = cv2.threshold(frame_delta, 25, 255, cv2.THRESH_BINARY)[1]
        energy_scores.append(np.sum(thresh))
        prev_gray = gray
    cap.release()
    return energy_scores

def _run_ollama(transcription, energy) -> EditPlan:
    prompt = f"""
    You are an expert video editor. Based on the transcription and visual energy provided, 
    select the most engaging 5-second clip. Provide a start_time, end_time, 
    and a short 10-word intro and outro script.
    Transcription: {str(transcription)[:200]}...
    """
    response = ollama.chat(
        model='llama3.1',
        messages=[{'role': 'user', 'content': prompt}],
        format=EditPlan.model_json_schema(),
    )
    return EditPlan.model_validate_json(response.message.content)

def _render_final_video(video_path: str, plan: EditPlan, final_filename: str):
    pipeline = KPipeline(lang_code='a')
    audio_chunks = [chunk for _, _, chunk in pipeline(plan.intro_script, voice='am_adam')]
    sf.write('intro_vo.wav', np.concatenate(audio_chunks), 24000)

    try:
        video = VideoFileClip(video_path)
        
        # Safeguard timestamps
        safe_start = max(0, min(plan.start_time, video.duration - 1)) 
        safe_end = min(plan.end_time, video.duration)
        if safe_start >= safe_end:
            safe_start = 0
            safe_end = video.duration

        subclip = video.subclipped(safe_start, safe_end)
        
        audio_layers = []
        
        # Layer A: The AI Voiceover (Main Audio, Volume 100%)
        tts_audio = AudioFileClip('intro_vo.wav').with_start(0)
        audio_layers.append(tts_audio)
        
        # Layer B: The Original Video Audio (Ducked to 15%)
        if subclip.audio is not None:
            ducked_original = subclip.audio.with_volume_scaled(0.15)
            audio_layers.append(ducked_original)
            
        # Layer C: Music Logic (User Override vs. AI Autonomous Selection)
        selected_music = None
        
        # 1. First, check if the user forced a specific track
        if os.path.exists("bg_music.mp3"):
            selected_music = "bg_music.mp3"
        else:
            # 2. If no specific track, let the AI randomly select from the library
            library_dir = "ai_music_library"
            if os.path.exists(library_dir):
                available_tracks = [f for f in os.listdir(library_dir) if f.endswith('.mp3')]
                if available_tracks:
                    selected_music = os.path.join(library_dir, random.choice(available_tracks))
                    print(f"> AI Director autonomously selected background track: {selected_music}")

        # Process and apply the selected music
        if selected_music:
            try:
                song = AudioFileClip(selected_music).with_start(0)
                
                # Safeguard: Ensure the music isn't longer than the video clip
                song_duration = min(song.duration, safe_end - safe_start)
                song = song.subclipped(0, song_duration)
                
                # Duck the music volume so it sits nicely behind the voice
                song = song.with_volume_scaled(0.2)
                audio_layers.append(song)
            except Exception as e:
                print(f"Error loading background music: {e}")
            
        # Combine all audio layers into one master track
        mixed_audio = CompositeAudioClip(audio_layers)
        final_clip = subclip.with_audio(mixed_audio)
        
        # Render the final MP4
        final_clip.write_videofile(final_filename, codec="libx264", audio_codec="aac")
    finally:
        if 'video' in locals(): video.close()
        if os.path.exists('intro_vo.wav'): os.remove('intro_vo.wav')