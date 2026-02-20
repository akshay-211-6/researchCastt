import { useState, useRef, useEffect } from "react";
import { uploadPDF, startGeneration, pollStatus, sendChat, submitQuiz, audioUrl, captionsUrl, downloadUrl } from "./api.js";

// ─── Icons ────────────────────────────────────────────────────────────────────
const Icons = {
  Upload: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>),
  Play: () => (<svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M8 5.14v14l11-7-11-7z" /></svg>),
  Pause: () => (<svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>),
  Download: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>),
  Chat: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" /></svg>),
  Trophy: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" /></svg>),
  Book: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>),
  Send: () => (<svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" /></svg>),
  Close: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>),
};

// ─── Mock Quiz Data ───────────────────────────────────────────────────────────
const MOCK_QUIZ = [
  { q: "What is the primary contribution of this research?", options: ["A novel training dataset", "A new attention mechanism", "A benchmark for LLM evaluation", "A compression algorithm"], correct: 1 },
  { q: "Which metric showed the most significant improvement?", options: ["BLEU score", "Perplexity", "F1 score", "ROUGE-L"], correct: 2 },
];

// ─── Waveform ─────────────────────────────────────────────────────────────────
function Waveform({ isPlaying }) {
  return (
    <div className="flex items-center gap-0.5 h-8">
      {Array.from({ length: 32 }).map((_, i) => (
        <div key={i} className="w-1 rounded-full bg-amber-400" style={{ height: `${20 + Math.sin(i * 0.8) * 12}px`, opacity: isPlaying ? 1 : 0.3, animation: isPlaying ? `pulse ${0.4 + (i % 5) * 0.1}s ease-in-out infinite alternate` : "none", animationDelay: `${i * 30}ms` }} />
      ))}
    </div>
  );
}

// ─── Upload Zone ──────────────────────────────────────────────────────────────
function UploadZone({ onUpload }) {
  const [dragging, setDragging]   = useState(false);
  const [voicePair, setVoicePair] = useState("FM");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const fileRef                   = useRef();

  const handleFile = async (file) => {
    if (!file || !file.name.endsWith(".pdf")) {
      setError("Please upload a PDF file."); return;
    }
    setLoading(true); setError("");
    try {
      const doc = await uploadPDF(file, voicePair);
      onUpload(doc.job_id, doc);
    } catch (e) {
      setError("Upload failed: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6" style={{ background: "var(--bg)" }}>
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl pointer-events-none" style={{ background: "radial-gradient(circle, #f59e0b, transparent)" }} />
      <div className="relative z-10 max-w-2xl w-full">
        <div className="text-center mb-12">
          <p className="text-xs tracking-[0.4em] uppercase mb-3" style={{ color: "var(--accent)", fontFamily: "var(--font-mono)" }}>✦ AI-Powered Learning ✦</p>
          <h1 className="text-5xl font-black leading-tight mb-3" style={{ fontFamily: "var(--font-display)", color: "var(--fg)" }}>
            Paper to <span style={{ color: "var(--accent)" }}>Podcast</span>
          </h1>
          <p className="text-lg" style={{ color: "var(--fg-muted)", fontFamily: "var(--font-body)" }}>Drop a dense research paper. Get an engaging, gamified podcast.</p>
        </div>

        <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />

        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
          onClick={() => !loading && fileRef.current.click()}
          className="cursor-pointer rounded-2xl border-2 border-dashed p-16 text-center transition-all duration-300"
          style={{ borderColor: dragging ? "var(--accent)" : "var(--border)", background: dragging ? "rgba(245,158,11,0.05)" : "var(--surface)" }}
        >
          {loading ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-full border-4 border-t-amber-400 border-r-amber-400 border-b-transparent border-l-transparent animate-spin" />
              <p style={{ color: "var(--fg-muted)", fontFamily: "var(--font-body)" }}>Uploading & parsing PDF...</p>
            </div>
          ) : (
            <>
              <div className="flex justify-center mb-4">
                <div className="p-4 rounded-xl" style={{ background: "rgba(245,158,11,0.1)", color: "var(--accent)" }}><Icons.Upload /></div>
              </div>
              <p className="text-lg font-semibold mb-1" style={{ color: "var(--fg)", fontFamily: "var(--font-display)" }}>Drop your PDF here</p>
              <p className="text-sm" style={{ color: "var(--fg-muted)" }}>or click to browse · Max 50MB</p>
            </>
          )}
        </div>

        {error && <p className="mt-3 text-center text-sm text-red-400">{error}</p>}

        <div className="mt-6">
          <p className="text-xs font-semibold tracking-widest uppercase mb-3 text-center" style={{ color: "var(--fg-muted)", fontFamily: "var(--font-mono)" }}>Host Voice Pairing</p>
          <div className="grid grid-cols-3 gap-3">
            {[{ id: "MM", label: "Male × Male", emoji: "👨👨" }, { id: "FM", label: "Female × Male", emoji: "👩👨" }, { id: "FF", label: "Female × Female", emoji: "👩👩" }].map((opt) => (
              <button key={opt.id} onClick={() => setVoicePair(opt.id)} className="py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200"
                style={{ background: voicePair === opt.id ? "var(--accent)" : "var(--surface)", color: voicePair === opt.id ? "#000" : "var(--fg-muted)", border: `1px solid ${voicePair === opt.id ? "var(--accent)" : "var(--border)"}` }}>
                <div className="text-lg mb-1">{opt.emoji}</div>{opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Processing Screen ────────────────────────────────────────────────────────
function ProcessingScreen({ jobId, onDone }) {
  const [progress, setProgress] = useState(0);
  const [message, setMessage]   = useState("Starting...");
  const [steps, setSteps]       = useState([
    { label: "Parsing PDF structure & equations", done: false },
    { label: "Generating two-host podcast script", done: false },
    { label: "Synthesising voices with TTS", done: false },
    { label: "Mixing background Lo-Fi track", done: false },
    { label: "Finalising podcast", done: false },
  ]);

  useEffect(() => {
    // Start generation then poll
    startGeneration(jobId).then(() => {
      const interval = setInterval(async () => {
        try {
          const status = await pollStatus(jobId);
          setProgress(status.progress_pct || 0);
          setMessage(status.message || "");

          // Update step checkmarks based on progress
          setSteps(prev => prev.map((s, i) => ({ ...s, done: status.progress_pct > i * 20 })));

          if (status.status === "done") {
            clearInterval(interval);
            onDone(status.result);
          }
          if (status.status === "error") {
            clearInterval(interval);
            alert("Error: " + status.message);
          }
        } catch (e) {
          console.error("Poll error:", e);
        }
      }, 2500);
      return () => clearInterval(interval);
    });
  }, [jobId]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6" style={{ background: "var(--bg)" }}>
      <div className="max-w-md w-full text-center">
        <div className="mb-8 flex justify-center">
          <div className="w-24 h-24 rounded-full flex items-center justify-center" style={{ background: "rgba(245,158,11,0.1)" }}>
            <div className="w-16 h-16 rounded-full border-4 border-t-amber-400 border-r-amber-400 border-b-transparent border-l-transparent animate-spin" />
          </div>
        </div>
        <h2 className="text-3xl font-black mb-2" style={{ fontFamily: "var(--font-display)", color: "var(--fg)" }}>Brewing your podcast</h2>
        <p className="text-sm mb-4" style={{ color: "var(--fg-muted)" }}>{message}</p>
        <div className="w-full rounded-full h-2 mb-8" style={{ background: "var(--surface)" }}>
          <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: "linear-gradient(90deg, #f59e0b, #f97316)" }} />
        </div>
        <div className="space-y-3 text-left">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: step.done ? "var(--accent)" : "var(--surface)", border: step.done ? "none" : "1px solid var(--border)" }}>
                {step.done && <span className="text-black text-xs font-bold">✓</span>}
              </div>
              <span className="text-sm" style={{ color: step.done ? "var(--fg)" : "var(--fg-muted)", fontFamily: "var(--font-body)" }}>{step.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Chat Panel ───────────────────────────────────────────────────────────────
function ChatPanel({ jobId, onClose }) {
  const [msgs, setMsgs]   = useState([{ role: "ai", text: "Ask me anything about the paper! 📄" }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input;
    setInput("");
    setMsgs(m => [...m, { role: "user", text: userMsg }]);
    setLoading(true);
    try {
      const history = msgs.map(m => ({ role: m.role === "ai" ? "assistant" : "user", content: m.text }));
      const res = await sendChat(jobId, userMsg, history);
      setMsgs(m => [...m, { role: "ai", text: res.reply }]);
    } catch (e) {
      setMsgs(m => [...m, { role: "ai", text: "Sorry, I couldn't connect to the server." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--surface)" }}>
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2">
          <span style={{ color: "var(--accent)" }}><Icons.Chat /></span>
          <span className="font-bold text-sm" style={{ fontFamily: "var(--font-display)", color: "var(--fg)" }}>Paper Chatbot</span>
        </div>
        <button onClick={onClose} style={{ color: "var(--fg-muted)" }}><Icons.Close /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className="max-w-xs text-sm px-3 py-2 rounded-xl leading-relaxed"
              style={{ background: m.role === "user" ? "var(--accent)" : "var(--bg)", color: m.role === "user" ? "#000" : "var(--fg)", fontFamily: "var(--font-body)" }}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && <div className="flex justify-start"><div className="px-3 py-2 rounded-xl text-sm" style={{ background: "var(--bg)", color: "var(--fg-muted)" }}>Thinking...</div></div>}
      </div>
      <div className="p-3 border-t flex gap-2" style={{ borderColor: "var(--border)" }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()}
          placeholder="Ask about the paper..." className="flex-1 text-sm px-3 py-2 rounded-lg outline-none"
          style={{ background: "var(--bg)", color: "var(--fg)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }} />
        <button onClick={send} className="p-2 rounded-lg" style={{ background: "var(--accent)", color: "#000" }}><Icons.Send /></button>
      </div>
    </div>
  );
}

// ─── Quiz Modal ───────────────────────────────────────────────────────────────
function QuizModal({ questions, jobId, onClose, onComplete }) {
  const quiz = questions?.length > 0 ? questions : MOCK_QUIZ.map(q => ({ question: q.q, options: q.options, correct_index: q.correct, explanation: "" }));
  const [current, setCurrent]   = useState(0);
  const [selected, setSelected] = useState(null);
  const [answers, setAnswers]   = useState([]);
  const [done, setDone]         = useState(false);
  const [result, setResult]     = useState(null);

  const q = quiz[current];

  const choose = (i) => { if (selected !== null) return; setSelected(i); };

  const next = async () => {
    const newAnswers = [...answers, selected];
    if (current < quiz.length - 1) {
      setAnswers(newAnswers); setCurrent(c => c + 1); setSelected(null);
    } else {
      try {
        const res = await submitQuiz(jobId, newAnswers);
        setResult(res); setDone(true);
        onComplete(res.score);
      } catch {
        setDone(true); setResult({ score: newAnswers.filter((a, i) => a === quiz[i].correct_index).length, total: quiz.length, points_earned: 0, feedback: [] });
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}>
      <div className="w-full max-w-lg rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="p-6">
          {!done ? (
            <>
              <div className="flex items-center justify-between mb-6">
                <span className="text-xs font-bold tracking-widest uppercase" style={{ color: "var(--accent)", fontFamily: "var(--font-mono)" }}>Question {current + 1} / {quiz.length}</span>
                <div className="flex gap-1">{quiz.map((_, i) => <div key={i} className="w-6 h-1 rounded-full" style={{ background: i <= current ? "var(--accent)" : "var(--border)" }} />)}</div>
              </div>
              <p className="text-lg font-bold mb-6" style={{ fontFamily: "var(--font-display)", color: "var(--fg)" }}>{q.question}</p>
              <div className="space-y-2">
                {q.options.map((opt, i) => {
                  let bg = "var(--bg)", border = "var(--border)";
                  if (selected !== null) {
                    if (i === q.correct_index) { bg = "rgba(16,185,129,0.15)"; border = "#10b981"; }
                    else if (i === selected) { bg = "rgba(239,68,68,0.15)"; border = "#ef4444"; }
                  }
                  return (
                    <button key={i} onClick={() => choose(i)} className="w-full text-left px-4 py-3 rounded-xl text-sm transition-all duration-200"
                      style={{ background: bg, border: `1px solid ${border}`, color: "var(--fg)", fontFamily: "var(--font-body)" }}>
                      <span className="font-bold mr-2" style={{ color: "var(--accent)" }}>{["A","B","C","D"][i]}.</span>{opt}
                    </button>
                  );
                })}
              </div>
              {selected !== null && (
                <button onClick={next} className="mt-6 w-full py-3 rounded-xl font-bold text-sm" style={{ background: "var(--accent)", color: "#000", fontFamily: "var(--font-display)" }}>
                  {current < quiz.length - 1 ? "Next Question →" : "See Results"}
                </button>
              )}
            </>
          ) : (
            <div className="text-center py-6">
              <div className="text-5xl mb-4">{result?.score === quiz.length ? "🏆" : result?.score >= quiz.length/2 ? "🎉" : "📚"}</div>
              <h3 className="text-2xl font-black mb-2" style={{ fontFamily: "var(--font-display)", color: "var(--fg)" }}>{result?.score} / {result?.total} Correct</h3>
              <p className="text-sm mb-2" style={{ color: "var(--fg-muted)" }}>You earned <span style={{ color: "var(--accent)", fontWeight: "bold" }}>+{result?.points_earned} points!</span></p>
              <button onClick={onClose} className="mt-6 px-8 py-3 rounded-xl font-bold text-sm" style={{ background: "var(--accent)", color: "#000", fontFamily: "var(--font-display)" }}>Back to Player</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Player Screen ────────────────────────────────────────────────────────────
function PlayerScreen({ jobId, podcastData, doc }) {
  const audioRef                  = useRef();
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress]   = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration]   = useState(0);
  const [activeTab, setActiveTab] = useState("chapters");
  const [showChat, setShowChat]   = useState(false);
  const [showQuiz, setShowQuiz]   = useState(false);
  const [points, setPoints]       = useState(0);
  const [activeChapter, setActiveChapter] = useState(0);
  const [showReminder, setShowReminder]   = useState(false);
  const [caption, setCaption]     = useState({ host: "A", text: "Welcome to your podcast! Press play to begin." });

  const chapters = podcastData?.chapters || [];
  const questions = [];

  // Save/restore resume position
  useEffect(() => {
    const saved = localStorage.getItem(`resume_${jobId}`);
    if (saved && audioRef.current) audioRef.current.currentTime = parseFloat(saved);
  }, [jobId]);

  // Reminder after 5s of pausing
  useEffect(() => {
    let timer;
    if (!isPlaying && currentTime > 5) timer = setTimeout(() => setShowReminder(true), 5000);
    return () => clearTimeout(timer);
  }, [isPlaying]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) { audioRef.current.pause(); } else { audioRef.current.play(); }
    setIsPlaying(p => !p);
  };

  const onTimeUpdate = () => {
    if (!audioRef.current) return;
    const t = audioRef.current.currentTime;
    const d = audioRef.current.duration || 1;
    setCurrentTime(t);
    setProgress((t / d) * 100);
    localStorage.setItem(`resume_${jobId}`, t);

    // Update active chapter
    const chIdx = chapters.findIndex((ch, i) => {
      const next = chapters[i + 1];
      return t >= ch.start_sec && (!next || t < next.start_sec);
    });
    if (chIdx !== -1) setActiveChapter(chIdx);
  };

  const seek = (e) => {
    if (!audioRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = pct * audioRef.current.duration;
  };

  const seekToChapter = (ch) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = ch.start_sec;
    audioRef.current.play();
    setIsPlaying(true);
  };

  const fmt = (s) => { const m = Math.floor(s/60); return `${m}:${String(Math.floor(s%60)).padStart(2,"0")}`; };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      {/* Hidden audio element */}
      <audio ref={audioRef} src={audioUrl(jobId)} onTimeUpdate={onTimeUpdate} onLoadedMetadata={e => setDuration(e.target.duration)} onEnded={() => setIsPlaying(false)} />

      {/* Reminder Toast */}
      {showReminder && (
        <div className="fixed top-4 right-4 z-50 max-w-xs rounded-xl p-4 shadow-2xl flex gap-3 items-start" style={{ background: "var(--surface)", border: "1px solid var(--accent)" }}>
          <span className="text-xl">🎧</span>
          <div className="flex-1">
            <p className="text-sm font-bold" style={{ color: "var(--fg)", fontFamily: "var(--font-display)" }}>Still there?</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--fg-muted)" }}>Your podcast is paused. Resume anytime!</p>
            <button onClick={() => { setShowReminder(false); togglePlay(); }} className="mt-2 text-xs font-bold px-3 py-1 rounded-lg" style={{ background: "var(--accent)", color: "#000" }}>Resume Now</button>
          </div>
          <button onClick={() => setShowReminder(false)} style={{ color: "var(--fg-muted)" }}><Icons.Close /></button>
        </div>
      )}

      {showQuiz && <QuizModal questions={questions} jobId={jobId} onClose={() => setShowQuiz(false)} onComplete={(s) => { setPoints(p => p + s); setShowQuiz(false); }} />}

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
        <h1 className="text-xl font-black" style={{ fontFamily: "var(--font-display)", color: "var(--fg)" }}>Paper<span style={{ color: "var(--accent)" }}>Cast</span></h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: "rgba(245,158,11,0.1)" }}>
            <Icons.Trophy /><span className="text-sm font-bold" style={{ color: "var(--accent)", fontFamily: "var(--font-mono)" }}>{points} pts</span>
          </div>
          <button onClick={() => setShowChat(s => !s)} className="p-2 rounded-xl" style={{ background: showChat ? "var(--accent)" : "var(--surface)", color: showChat ? "#000" : "var(--fg-muted)", border: "1px solid var(--border)" }}><Icons.Chat /></button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Paper info */}
          <div className="px-6 py-6 border-b" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-start gap-4 mb-6">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: "rgba(245,158,11,0.1)" }}>📄</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: "var(--accent)", fontFamily: "var(--font-mono)" }}>Now Playing</p>
                <h2 className="text-lg font-black leading-tight" style={{ fontFamily: "var(--font-display)", color: "var(--fg)" }}>{doc?.metadata?.title || "Your Podcast"}</h2>
                <p className="text-xs mt-0.5" style={{ color: "var(--fg-muted)" }}>{doc?.metadata?.authors || ""} · {doc?.total_pages || "?"} pages</p>
              </div>
              <a href={downloadUrl(jobId)} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg flex-shrink-0" style={{ background: "var(--surface)", color: "var(--fg-muted)", border: "1px solid var(--border)" }}>
                <Icons.Download /><span>MP3</span>
              </a>
            </div>

            {/* Progress bar */}
            <div>
              <div className="flex justify-between text-xs mb-2" style={{ color: "var(--fg-muted)", fontFamily: "var(--font-mono)" }}>
                <span>{fmt(currentTime)}</span><span>{fmt(duration)}</span>
              </div>
              <div className="relative h-2 rounded-full cursor-pointer" style={{ background: "var(--surface)" }} onClick={seek}>
                <div className="h-full rounded-full" style={{ width: `${progress}%`, background: "linear-gradient(90deg, #f59e0b, #f97316)" }} />
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4 mt-4">
              <button onClick={togglePlay} className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg" style={{ background: "var(--accent)", color: "#000" }}>
                {isPlaying ? <Icons.Pause /> : <Icons.Play />}
              </button>
            </div>
            <div className="flex justify-center mt-3"><Waveform isPlaying={isPlaying} /></div>
          </div>

          {/* Caption */}
          <div className="px-6 py-4 border-b" style={{ borderColor: "var(--border)", background: "rgba(245,158,11,0.03)" }}>
            <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: "var(--fg-muted)", fontFamily: "var(--font-mono)" }}>Live Captions</p>
            <p className="text-sm leading-relaxed" style={{ color: "var(--fg)", fontFamily: "var(--font-body)" }}>
              <span className="font-bold mr-1" style={{ color: "#f59e0b" }}>Host A:</span>{caption.text}
            </p>
          </div>

          {/* Tabs */}
          <div className="flex border-b" style={{ borderColor: "var(--border)" }}>
            {[{ id: "chapters", label: "Chapters", icon: "≡" }, { id: "study", label: "Study Guide", icon: "📋" }].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className="flex-1 py-3 text-xs font-semibold tracking-wide transition-colors"
                style={{ color: activeTab === tab.id ? "var(--accent)" : "var(--fg-muted)", borderBottom: activeTab === tab.id ? "2px solid var(--accent)" : "2px solid transparent", fontFamily: "var(--font-mono)" }}>
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            {activeTab === "chapters" && (
              <div className="space-y-2">
                {chapters.length > 0 ? chapters.map((ch, i) => (
                  <button key={ch.id} onClick={() => { setActiveChapter(i); seekToChapter(ch); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all"
                    style={{ background: activeChapter === i ? "rgba(245,158,11,0.1)" : "transparent", border: `1px solid ${activeChapter === i ? "var(--accent)" : "transparent"}` }}>
                    <span className="text-xs font-bold w-12 flex-shrink-0" style={{ color: "var(--fg-muted)", fontFamily: "var(--font-mono)" }}>{fmt(ch.start_sec)}</span>
                    <span className="text-sm flex-1" style={{ color: "var(--fg)", fontWeight: activeChapter === i ? 700 : 400 }}>{ch.title}</span>
                  </button>
                )) : <p className="text-sm text-center py-8" style={{ color: "var(--fg-muted)" }}>Chapters will appear here once your podcast is generated.</p>}
              </div>
            )}
            {activeTab === "study" && (
              <div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--fg)", fontFamily: "var(--font-body)" }}>
                  {doc?.sections?.slice(0,3).map(s => `## ${s.title}\n${s.body.slice(0,400)}...\n\n`).join("") || "Study guide will be available after generation completes."}
                </p>
              </div>
            )}
          </div>

          {/* Quiz CTA */}
          <div className="px-6 py-3 border-t" style={{ borderColor: "var(--border)" }}>
            <button onClick={() => setShowQuiz(true)} className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg, #f59e0b, #f97316)", color: "#000", fontFamily: "var(--font-display)" }}>
              <Icons.Trophy /> Test Your Knowledge — Take the Quiz
            </button>
          </div>
        </main>

        {showChat && (
          <aside className="w-72 border-l flex flex-col" style={{ borderColor: "var(--border)" }}>
            <ChatPanel jobId={jobId} onClose={() => setShowChat(false)} />
          </aside>
        )}
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen]           = useState("upload");
  const [jobId, setJobId]             = useState(null);
  const [doc, setDoc]                 = useState(null);
  const [podcastData, setPodcastData] = useState(null);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;700&display=swap');
        :root { --bg:#0d0d0f; --surface:#161618; --border:#2a2a2e; --fg:#f0ede8; --fg-muted:#6b6872; --accent:#f59e0b; --font-display:'Playfair Display',Georgia,serif; --font-body:'DM Sans',sans-serif; --font-mono:'JetBrains Mono',monospace; }
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        body{background:var(--bg);color:var(--fg);font-family:var(--font-body);}
        ::-webkit-scrollbar{width:4px;} ::-webkit-scrollbar-track{background:var(--bg);} ::-webkit-scrollbar-thumb{background:var(--border);border-radius:2px;}
        @keyframes pulse{from{transform:scaleY(0.4);}to{transform:scaleY(1);}}
      `}</style>

      {screen === "upload" && (
        <UploadZone onUpload={(id, parsedDoc) => { setJobId(id); setDoc(parsedDoc); setScreen("processing"); }} />
      )}
      {screen === "processing" && (
        <ProcessingScreen jobId={jobId} onDone={(result) => { setPodcastData(result); setScreen("player"); }} />
      )}
      {screen === "player" && (
        <PlayerScreen jobId={jobId} podcastData={podcastData} doc={doc} />
      )}
    </>
  );
}