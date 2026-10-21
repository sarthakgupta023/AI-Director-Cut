import React, { useState, useRef, useEffect } from 'react';

function App() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('System idle. Awaiting media input...');
  const [videoUrl, setVideoUrl] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [activeFaq, setActiveFaq] = useState(null);

  const fileInputRef = useRef(null);
  const videoRef = useRef(null);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const toggleFaq = (index) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatus(`Loaded: ${e.target.files[0].name}. Ready for extraction.`);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setIsProcessing(true);
      setVideoUrl(null);
      setProgress(5); 
      setStatus('> Initializing local neural engines...');

      const response = await fetch('http://127.0.0.1:8000/generate-director-cut/', {
        method: 'POST',
        body: formData,
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const messages = chunk.split('data: ').filter(msg => msg.trim() !== '');

        for (const msg of messages) {
            const cleanMsg = msg.trim();
            
            if (cleanMsg.includes('1/5')) setProgress(20);
            else if (cleanMsg.includes('2/5')) setProgress(40);
            else if (cleanMsg.includes('3/5')) setProgress(60);
            else if (cleanMsg.includes('4/5')) setProgress(80);
            else if (cleanMsg.includes('5/5')) setProgress(95);
            
            if (cleanMsg.includes('"status": "DONE"')) {
                try {
                    const data = JSON.parse(cleanMsg);
                    setProgress(100);
                    setVideoUrl(`${data.video_url}?t=${new Date().getTime()}`);
                    setStatus('> Process terminated successfully. Masterpiece compiled.');
                    
                    setTimeout(() => {
                      videoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 500);

                } catch (e) {
                    setStatus("> FATAL ERROR: Output stream corrupted.");
                }
            } else {
                setStatus("> " + cleanMsg.replace(/^[0-9]\/5 - /, ''));
            }
        }
      }
    } catch (error) {
      setStatus('> CONNECTION ERROR: Failed to reach backend servers.');
      setProgress(0);
    } finally {
      setIsProcessing(false);
    }
  };

  const faqs = [
    { q: "Is my data completely private?", a: "Yes. The entire pipeline—from Whisper transcription to Llama 3.1 generation—runs completely locally on your hardware. No cloud APIs are pinged." },
    { q: "What types of videos work best?", a: "High-motion videos with clear audio work best. However, our failsafes ensure that even completely silent or static videos will process successfully." },
    { q: "How are the timestamps determined?", a: "We use an OpenCV thresholding script to analyze visual energy (movement) combined with Whisper's word-level timestamps to find the most engaging 5 seconds." }
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;600&family=Outfit:wght@300;400;600;800&display=swap');

        :root {
          --bg-color: #030712;
          --card-bg: rgba(255, 255, 255, 0.02);
          --accent-primary: #3b82f6;
          --accent-secondary: #8b5cf6;
          --text-main: #f8fafc;
          --text-muted: #94a3b8;
          --border-color: rgba(255,255,255,0.08);
        }

        body, html {
          margin: 0; padding: 0;
          background-color: var(--bg-color);
          background-image: radial-gradient(circle at 15% 10%, rgba(59, 130, 246, 0.05), transparent 25%),
                            radial-gradient(circle at 85% 90%, rgba(139, 92, 246, 0.05), transparent 25%);
          color: var(--text-main);
          font-family: 'Outfit', sans-serif;
          scroll-behavior: smooth;
        }

        .page-wrapper {
          opacity: 0; transform: translateY(20px);
          transition: opacity 0.8s ease-out, transform 0.8s ease-out;
        }
        .page-wrapper.visible { opacity: 1; transform: translateY(0); }

        .container { max-width: 1100px; margin: 0 auto; padding: 40px 20px; }

        /* Navbar */
        .nav-bar { display: flex; justify-content: space-between; align-items: center; padding: 20px 0; border-bottom: 1px solid var(--border-color); margin-bottom: 60px; }
        .logo-text { font-weight: 800; font-size: 1.5rem; letter-spacing: -0.5px; background: linear-gradient(to right, #fff, #a78bfa); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .nav-links { display: flex; gap: 20px; font-weight: 600; font-size: 0.95rem; }
        .nav-links a { color: var(--text-muted); text-decoration: none; transition: color 0.3s; cursor: pointer; }
        .nav-links a:hover { color: #fff; }

        /* Hero */
        .hero { text-align: center; margin-bottom: 80px; }
        .hero h1 { font-size: 4.5rem; font-weight: 800; line-height: 1.1; margin: 0 0 20px 0; background: linear-gradient(to right, #60a5fa, #d8b4fe); -webkit-background-clip: text; -webkit-text-fill-color: transparent; letter-spacing: -1.5px; }
        .hero p { font-size: 1.2rem; color: var(--text-muted); max-width: 600px; margin: 0 auto 40px auto; line-height: 1.6; }

        /* AI Processor Box */
        .glass-card { background: var(--card-bg); backdrop-filter: blur(20px); border: 1px solid var(--border-color); border-radius: 24px; padding: 50px; max-width: 800px; margin: 0 auto; box-shadow: 0 30px 60px -15px rgba(0, 0, 0, 0.6); }
        .upload-area { border: 2px dashed rgba(148, 163, 184, 0.3); border-radius: 16px; padding: 50px 20px; text-align: center; transition: all 0.3s ease; cursor: pointer; background: rgba(0,0,0,0.4); margin-bottom: 30px; }
        .upload-area:hover { border-color: var(--accent-primary); background: rgba(59, 130, 246, 0.05); }
        .upload-icon { font-size: 4rem; margin-bottom: 15px; display: block; filter: drop-shadow(0 0 15px rgba(59, 130, 246, 0.4)); }
        
        .action-btn { width: 100%; padding: 18px; border-radius: 12px; border: none; background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary)); color: white; font-size: 1.2rem; font-weight: 600; cursor: pointer; transition: all 0.3s ease; }
        .action-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 15px 30px -10px rgba(139, 92, 246, 0.8); }
        .action-btn:disabled { background: #1e293b; color: #64748b; cursor: not-allowed; }

        /* The Terminal Console */
        .terminal-container { margin-top: 30px; background: #000; border-radius: 12px; padding: 20px; border: 1px solid #1f2937; text-align: left; }
        .terminal-header { display: flex; gap: 8px; margin-bottom: 15px; }
        .terminal-dot { width: 12px; height: 12px; border-radius: 50%; }
        .terminal-text { font-family: 'Fira Code', monospace; font-size: 0.9rem; color: #4ade80; line-height: 1.5; }
        .cursor-blink { animation: blink 1s step-end infinite; }
        
        .progress-bar-bg { width: 100%; height: 4px; background: #1f2937; margin-top: 20px; border-radius: 10px; overflow: hidden; }
        .progress-bar-fill { height: 100%; background: #4ade80; transition: width 0.4s ease; box-shadow: 0 0 10px #4ade80; }

        .video-container { margin-top: 40px; border-radius: 16px; overflow: hidden; background: #000; border: 1px solid var(--border-color); box-shadow: 0 20px 50px -10px rgba(0, 0, 0, 0.8); }
        video { display: block; width: 100%; }

        /* Use Cases & Architecture */
        .section-title { font-size: 2.5rem; text-align: center; margin: 100px 0 50px 0; font-weight: 800; }
        .grid-3 { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px; margin-bottom: 100px; }
        
        .card { background: linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%); border: 1px solid var(--border-color); border-radius: 20px; padding: 40px 30px; transition: transform 0.3s ease; }
        .card:hover { transform: translateY(-5px); border-color: rgba(139, 92, 246, 0.3); }
        .card h3 { font-size: 1.4rem; margin: 0 0 15px 0; color: #fff; }
        .card p { color: var(--text-muted); line-height: 1.6; margin: 0; }

        /* FAQ Accordion */
        .faq-item { border-bottom: 1px solid var(--border-color); margin-bottom: 10px; }
        .faq-question { padding: 20px 0; width: 100%; text-align: left; background: none; border: none; color: #fff; font-size: 1.2rem; font-weight: 600; cursor: pointer; display: flex; justify-content: space-between; align-items: center; font-family: inherit; }
        .faq-answer { padding: 0 0 20px 0; color: var(--text-muted); line-height: 1.6; display: none; }
        .faq-answer.open { display: block; animation: fadeIn 0.4s ease; }

        /* Contact & Footer */
        .contact-box { background: rgba(59, 130, 246, 0.05); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 24px; padding: 60px; text-align: center; margin-bottom: 80px; }
        .contact-box h2 { margin: 0 0 15px 0; font-size: 2rem; }
        .contact-box p { color: var(--text-muted); max-width: 500px; margin: 0 auto 30px auto; line-height: 1.6; }
        
        .contact-buttons { display: flex; gap: 20px; justify-content: center; flex-wrap: wrap; margin-top: 20px; }
        .contact-btn { display: inline-block; padding: 14px 30px; background: #fff; color: #000; font-weight: 800; border-radius: 30px; border: 2px solid #fff; text-decoration: none; transition: all 0.3s ease; }
        .contact-btn:hover { transform: scale(1.05); }
        .contact-btn.outline { background: transparent; color: #fff; }
        .contact-btn.outline:hover { background: rgba(255, 255, 255, 0.1); }

        .footer { display: flex; justify-content: space-between; align-items: center; padding: 40px 0; border-top: 1px solid var(--border-color); color: var(--text-muted); font-size: 0.9rem; }
        .footer a { color: #fff; text-decoration: none; font-weight: 600; }
        .footer a:hover { color: var(--accent-primary); }

        @keyframes blink { 50% { opacity: 0; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        
        @media (max-width: 768px) {
          .hero h1 { font-size: 3rem; }
          .footer { flex-direction: column; gap: 20px; text-align: center; }
        }
      `}</style>

      <div className={`page-wrapper ${isVisible ? 'visible' : ''}`}>
        <div className="container">
          
          <nav className="nav-bar">
            <div className="logo-text">Director Cut</div>
            <div className="nav-links">
              <a href="#architecture">Architecture</a>
              <a href="#faq">FAQ</a>
              <a href="#contact">Contact</a>
            </div>
          </nav>

          <main className="hero">
            <h1>Let AI Edit Your Video.</h1>
            <p>Upload raw footage and let an autonomous pipeline analyze motion, transcribe audio, and stitch together the perfect highlight reel.</p>

            <div className="glass-card">
              <div className="upload-area" onClick={() => !isProcessing && fileInputRef.current.click()}>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="video/*" style={{ display: 'none' }} />
                <span className="upload-icon">📼</span>
                <div style={{ color: '#94a3b8', fontSize: '1.2rem' }}>
                  {file ? <span style={{ color: '#60a5fa', fontWeight: '600' }}>{file.name}</span> : <><span>Click to browse</span> or drag a video file here</>}
                </div>
              </div>

              <button className="action-btn" onClick={handleUpload} disabled={!file || isProcessing}>
                {isProcessing ? 'Compiling Video...' : 'Generate Director Cut'}
              </button>

              {(isProcessing || progress > 0) && (
                <div className="terminal-container">
                  <div className="terminal-header">
                    <div className="terminal-dot" style={{ background: '#ef4444' }}></div>
                    <div className="terminal-dot" style={{ background: '#eab308' }}></div>
                    <div className="terminal-dot" style={{ background: '#22c55e' }}></div>
                  </div>
                  <div className="terminal-text">
                    {status} <span className="cursor-blink">_</span>
                  </div>
                  <div className="progress-bar-bg">
                    <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
                  </div>
                </div>
              )}

              {videoUrl && (
                <div className="video-container" ref={videoRef}>
                  <video controls autoPlay src={videoUrl} />
                </div>
              )}
            </div>
          </main>

          <h2 id="architecture" className="section-title">The Brains Behind the Cut</h2>
          <div className="grid-3">
            <div className="card">
              <h3 style={{fontSize: '2rem'}}>👁️</h3>
              <h3>Computer Vision</h3>
              <p>Powered by OpenCV, the system maps frame-by-frame visual energy to detect physical action hot-spots.</p>
            </div>
            <div className="card">
              <h3 style={{fontSize: '2rem'}}>🧠</h3>
              <h3>Llama 3.1 Director</h3>
              <p>A local LLM acts as the director, processing context metadata to formulate the perfect edit plan.</p>
            </div>
            <div className="card">
              <h3 style={{fontSize: '2rem'}}>🎙️</h3>
              <h3>Neural Audio</h3>
              <p>Whisper rips the word-level timestamps, while Kokoro TTS synthesizes flawless AI voiceovers.</p>
            </div>
          </div>

          <h2 id="faq" className="section-title">Frequently Asked Questions</h2>
          <div style={{ maxWidth: '700px', margin: '0 auto 100px auto' }}>
            {faqs.map((faq, i) => (
              <div key={i} className="faq-item">
                <button className="faq-question" onClick={() => toggleFaq(i)}>
                  {faq.q} <span>{activeFaq === i ? '−' : '+'}</span>
                </button>
                <div className={`faq-answer ${activeFaq === i ? 'open' : ''}`}>
                  {faq.a}
                </div>
              </div>
            ))}
          </div>

          <div id="contact" className="contact-box">
            <h2>Meet the Architect</h2>
            <p>Looking to collaborate on full-stack architecture, complex algorithmic problem-solving, or your next big scalable idea? Let's connect.</p>
            
            <div className="contact-buttons">
              <a href="mailto:tripathianiket2005@gmail.com" className="contact-btn">
                Email Me
              </a>
              <a href="https://portfolio-iota-black-81.vercel.app/" target="_blank" rel="noopener noreferrer" className="contact-btn outline">
                View Developer Portfolio
              </a>
            </div>
          </div>

          <footer className="footer">
            <div>
              &copy; 2026 Director Cut AI. Crafted by <a href="https://www.linkedin.com/in/aniket-tripathi-b1b941291/" target="_blank" rel="noopener noreferrer">Aniket Tripathi</a>.
            </div>
            <div>
              All local processes. All rights reserved.
            </div>
          </footer>

        </div>
      </div>
    </>
  );
}

export default App;