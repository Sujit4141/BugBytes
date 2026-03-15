import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";

const API = "";
const FRAME_INTERVAL_MS = 120;
const SESSION_SECONDS   = 20;
const EAR_CLOSED        = 0.21;
const BLINK_CONSEC      = 2;

const LEVELS = {
  Normal:   { color: "#4caf6e", icon: "●", label: "NORMAL",    action: "Continue operations",         desc: "Alert and focused. Safe to continue work.",    pct: 33  },
  Moderate: { color: "#f5a623", icon: "◆", label: "MODERATE",  action: "Schedule immediate break",    desc: "Fatigue building. Take a 15-minute rest now.", pct: 66  },
  High:     { color: "#ff4444", icon: "▲", label: "HIGH RISK", action: "STOP — Report to supervisor", desc: "Dangerous fatigue. Do not operate machinery.",  pct: 100 },
};

// ── Countdown hook ───────────────────────────────────────────────────
function useCountdown(target, active) {
  const [remaining, setRemaining] = useState(target);
  useEffect(() => {
    if (!active) { setRemaining(target); return; }
    const iv = setInterval(() => setRemaining(r => Math.max(0, r - 1)), 1000);
    return () => clearInterval(iv);
  }, [active, target]);
  return remaining;
}

// ── Pill metric ──────────────────────────────────────────────────────
function Pill({ label, value, unit, color }) {
  return (
    <div style={{ background:"#0e0c0a", border:"1px solid #2a2520", padding:"12px 16px", display:"flex", flexDirection:"column", gap:4 }}>
      <span style={{ fontSize:9, letterSpacing:2, color:"#3a3530", fontFamily:"monospace", textTransform:"uppercase" }}>{label}</span>
      <span style={{ fontSize:20, fontWeight:700, color:color||"#c8c0b0", fontFamily:"'Oswald',monospace", letterSpacing:1 }}>
        {value ?? "—"}
        {value != null && <span style={{ fontSize:10, marginLeft:5, color:"#3a3530", fontWeight:400 }}>{unit}</span>}
      </span>
    </div>
  );
}

// ── EAR bar ──────────────────────────────────────────────────────────
function EARBar({ ear }) {
  const pct = Math.min(1, ear / 0.4) * 100;
  const col = ear < EAR_CLOSED ? "#ff4444" : "#4caf6e";
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
      <span style={{ fontSize:9, letterSpacing:2, color:"#3a3530", fontFamily:"monospace", width:36 }}>EAR</span>
      <div style={{ flex:1, height:3, background:"#1a1815" }}>
        <div style={{ width:`${pct}%`, height:"100%", background:col, transition:"width 0.1s, background 0.2s" }}/>
      </div>
      <span style={{ fontSize:11, color:col, fontFamily:"monospace", width:36, textAlign:"right" }}>{ear.toFixed(2)}</span>
    </div>
  );
}

// ── Result card ──────────────────────────────────────────────────────
function ResultCard({ result, onReset }) {
  const cfg    = LEVELS[result.fatigue_level] || LEVELS.Normal;
  const isHigh = result.fatigue_level === "High";
  return (
    <div style={{ animation:"fadeUp 0.5s ease" }}>
      <div style={{
        padding:"14px 20px", marginBottom:20,
        background:`${cfg.color}11`, border:`2px solid ${cfg.color}44`, borderLeft:`4px solid ${cfg.color}`,
        display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12,
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontSize:24, color:cfg.color, animation: isHigh ? "warnblink 0.8s infinite" : "none" }}>{cfg.icon}</span>
          <div>
            <div style={{ fontFamily:"'Oswald'", fontSize:10, letterSpacing:3, color:"#3a3530", textTransform:"uppercase", marginBottom:2 }}>Fatigue Level</div>
            <div style={{ fontFamily:"'Oswald'", fontSize:28, fontWeight:700, color:cfg.color, letterSpacing:2, lineHeight:1 }}>{cfg.label}</div>
          </div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize:10, color:"#3a3530", fontFamily:"monospace", letterSpacing:1, marginBottom:4 }}>REQUIRED ACTION</div>
          <div style={{ fontFamily:"'Oswald'", fontSize:13, color:cfg.color, letterSpacing:2, textTransform:"uppercase" }}>→ {cfg.action}</div>
        </div>
      </div>
      <div style={{ height:4, background:"#1a1815", marginBottom:16 }}>
        <div style={{ width:`${cfg.pct}%`, height:"100%", background:cfg.color, boxShadow:`0 0 8px ${cfg.color}88`, transition:"width 1s cubic-bezier(.4,0,.2,1)" }}/>
      </div>
      <p style={{ fontSize:13, color:"#4a4540", lineHeight:1.8, marginBottom:20 }}>{cfg.desc}</p>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:2, marginBottom:20 }}>
        <Pill label="Blink Rate"  value={result.blink_rate}       unit="/min" color={cfg.color}/>
        <Pill label="Eye Closure" value={result.eye_closure_time} unit="s"    color={cfg.color}/>
        <Pill label="Head Tilt"   value={result.head_tilt_angle}  unit="°"    color={cfg.color}/>
      </div>
      <button onClick={onReset} style={{
        width:"100%", padding:"13px 0", background:"transparent", border:"1px solid #2a2520",
        color:"#4a4540", fontSize:11, letterSpacing:3, textTransform:"uppercase",
        fontFamily:"'Oswald'", cursor:"pointer", transition:"all 0.2s",
      }}
        onMouseEnter={e=>{ e.target.style.borderColor="#5a5550"; e.target.style.color="#c8c0b0"; }}
        onMouseLeave={e=>{ e.target.style.borderColor="#2a2520"; e.target.style.color="#4a4540"; }}
      >↺ New Scan</button>
    </div>
  );
}

// ── Sensor panel ─────────────────────────────────────────────────────
function SensorPanel({ sensors, setSensors }) {
  const fields = [
    { key:"heart_rate",  label:"Heart Rate", unit:"bpm",  step:1     },
    { key:"shift_hours", label:"Shift Hours",unit:"hrs",  step:0.5   },
    { key:"temperature", label:"Pit Temp",   unit:"°C",   step:0.5   },
    { key:"gas_level",   label:"Gas Level",  unit:"ppm",  step:0.001 },
  ];
  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:2, marginBottom:20 }}>
      {fields.map(f => (
        <div key={f.key} style={{ background:"#0b0908", border:"1px solid #1e1c18", padding:"12px 14px" }}>
          <label style={{ fontSize:9, letterSpacing:2, color:"#3a3530", fontFamily:"monospace", textTransform:"uppercase", display:"block", marginBottom:8 }}>
            {f.label} <span style={{ color:"#2a2520" }}>({f.unit})</span>
          </label>
          <input type="number" step={f.step} value={sensors[f.key]}
            onChange={e => setSensors(p => ({ ...p, [f.key]: e.target.value }))}
            style={{ width:"100%", padding:"6px 0", background:"transparent", border:"none", borderBottom:"1px solid #2a2520", color:"#c8c0b0", fontSize:18, fontFamily:"'Oswald'", outline:"none", letterSpacing:1 }}
          />
        </div>
      ))}
    </div>
  );
}

// ── Video display ────────────────────────────────────────────────────
function VideoDisplay({ videoRef }) {
  const displayRef = useRef(null);
  useEffect(() => {
    const display = displayRef.current;
    const source  = videoRef.current;
    if (display && source && source.srcObject) {
      display.srcObject = source.srcObject;
      display.play().catch(() => {});
    }
  }, [videoRef]);
  return <video ref={displayRef} muted playsInline autoPlay style={{ width:"100%", display:"block", transform:"scaleX(-1)" }}/>;
}

// ── Reaction Time Modal ──────────────────────────────────────────────
const REACTION_ROUNDS = 4;
const COLORS = ["#f5a623", "#4caf6e", "#ff4444", "#4a9eff"];

function ReactionModal({ onClose }) {
  const [stage, setStage]     = useState("intro");   // intro | waiting | ready | clicked | done
  const [round, setRound]     = useState(0);
  const [times, setTimes]     = useState([]);
  const [color, setColor]     = useState("#1a1815");
  const [startTs, setStartTs] = useState(null);
  const [lastTime, setLast]   = useState(null);
  const [early, setEarly]     = useState(false);
  const timerRef = useRef(null);

  const startRound = useCallback(() => {
    setEarly(false);
    setColor("#1a1815");
    setStage("waiting");
    const delay = 1500 + Math.random() * 2500;
    timerRef.current = setTimeout(() => {
      const c = COLORS[Math.floor(Math.random() * COLORS.length)];
      setColor(c);
      setStartTs(Date.now());
      setStage("ready");
    }, delay);
  }, []);

  const handleClick = useCallback(() => {
    if (stage === "waiting") {
      clearTimeout(timerRef.current);
      setEarly(true);
      setStage("clicked");
      return;
    }
    if (stage === "ready") {
      const ms = Date.now() - startTs;
      setLast(ms);
      setTimes(prev => {
        const next = [...prev, ms];
        if (next.length >= REACTION_ROUNDS) {
          setStage("done");
          return next;
        }
        return next;
      });
      setRound(r => r + 1);
      setStage("clicked");
    }
  }, [stage, startTs]);

  const avg = times.length ? Math.round(times.reduce((a,b)=>a+b,0)/times.length) : null;

  const ratingLabel = (ms) => {
    if (ms < 200) return { text:"EXCELLENT", color:"#4caf6e" };
    if (ms < 300) return { text:"GOOD",      color:"#f5a623" };
    if (ms < 400) return { text:"MODERATE",  color:"#f5a623" };
    return              { text:"SLOW — FATIGUE RISK", color:"#ff4444" };
  };

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:500,
      background:"rgba(0,0,0,0.85)", backdropFilter:"blur(6px)",
      display:"flex", alignItems:"center", justifyContent:"center", padding:16,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        width:"100%", maxWidth:480,
        background:"#0e0c0a", border:"2px solid #2a2520", borderTop:"2px solid #f5a62366",
        padding:"28px 24px", position:"relative",
      }}>
        {/* Close */}
        <button onClick={onClose} style={{
          position:"absolute", top:12, right:16, background:"none", border:"none",
          color:"#3a3530", fontSize:18, cursor:"pointer", fontFamily:"monospace",
        }}>✕</button>

        {/* Title */}
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:20 }}>
          <div style={{ width:8, height:8, background:"#f5a623", borderRadius:"50%" }}/>
          <span style={{ fontFamily:"'Oswald'", fontSize:13, letterSpacing:3, color:"#f5a623", textTransform:"uppercase" }}>
            Reaction Time Test
          </span>
        </div>

        {/* INTRO */}
        {stage === "intro" && (
          <div style={{ textAlign:"center" }}>
            <p style={{ fontSize:13, color:"#5a5550", lineHeight:1.9, marginBottom:8 }}>
              A colour will appear after a random delay.<br/>
              <strong style={{ color:"#c8c0b0" }}>Click as fast as you can</strong> when you see it.
            </p>
            <p style={{ fontSize:11, color:"#3a3530", fontFamily:"monospace", marginBottom:24 }}>
              {REACTION_ROUNDS} rounds · Average score displayed at end
            </p>
            <button onClick={() => { setRound(0); setTimes([]); startRound(); }} style={{
              padding:"13px 40px", background:"#f5a623", border:"none",
              color:"#0e0c0a", fontSize:11, letterSpacing:4, textTransform:"uppercase",
              fontFamily:"'Oswald'", fontWeight:700, cursor:"pointer",
            }}>▶ Start Test</button>
          </div>
        )}

        {/* ACTIVE */}
        {(stage === "waiting" || stage === "ready") && (
          <div onClick={handleClick} style={{
            height:200, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
            background: color, border:"2px solid #2a2520",
            cursor:"pointer", transition:"background 0.15s", userSelect:"none",
          }}>
            <span style={{ fontFamily:"'Oswald'", fontSize:14, letterSpacing:3, textTransform:"uppercase",
              color: stage === "ready" ? "#0e0c0a" : "#3a3530" }}>
              {stage === "waiting" ? "Wait for colour..." : "CLICK NOW!"}
            </span>
            {stage === "waiting" && <span style={{ fontSize:11, color:"#3a3530", fontFamily:"monospace", marginTop:8 }}>Round {round + 1} / {REACTION_ROUNDS}</span>}
          </div>
        )}

        {/* RESULT of one round */}
        {stage === "clicked" && (
          <div style={{ textAlign:"center" }}>
            {early ? (
              <>
                <div style={{ fontSize:32, color:"#ff4444", fontFamily:"'Oswald'", letterSpacing:2, marginBottom:8 }}>TOO EARLY!</div>
                <p style={{ fontSize:12, color:"#4a4540", marginBottom:20 }}>You clicked before the colour changed. This round won't count.</p>
              </>
            ) : (
              <>
                <div style={{ fontSize:48, color:"#f5a623", fontFamily:"'Oswald'", fontWeight:700, letterSpacing:2 }}>{lastTime}<span style={{ fontSize:16 }}>ms</span></div>
                <div style={{ fontSize:11, color:"#3a3530", fontFamily:"monospace", marginBottom:20 }}>Round {times.length} / {REACTION_ROUNDS}</div>
              </>
            )}
            <button onClick={() => { if (early) { startRound(); } else if (times.length < REACTION_ROUNDS) { startRound(); } else { setStage("done"); } }} style={{
              padding:"12px 32px", background:"#f5a623", border:"none",
              color:"#0e0c0a", fontSize:11, letterSpacing:3, textTransform:"uppercase",
              fontFamily:"'Oswald'", fontWeight:700, cursor:"pointer",
            }}>{times.length >= REACTION_ROUNDS ? "See Results" : "Next Round →"}</button>
          </div>
        )}

        {/* FINAL */}
        {stage === "done" && avg !== null && (
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:10, letterSpacing:4, color:"#3a3530", fontFamily:"monospace", textTransform:"uppercase", marginBottom:8 }}>Average Reaction Time</div>
            <div style={{ fontSize:56, fontFamily:"'Oswald'", fontWeight:700, color: ratingLabel(avg).color, letterSpacing:2 }}>
              {avg}<span style={{ fontSize:18 }}>ms</span>
            </div>
            <div style={{
              display:"inline-block", marginTop:8, marginBottom:20,
              padding:"4px 16px", border:`1px solid ${ratingLabel(avg).color}44`,
              background:`${ratingLabel(avg).color}11`,
              fontFamily:"'Oswald'", fontSize:13, letterSpacing:3,
              color:ratingLabel(avg).color, textTransform:"uppercase",
            }}>{ratingLabel(avg).text}</div>

            {/* Per-round */}
            <div style={{ display:"grid", gridTemplateColumns:`repeat(${REACTION_ROUNDS},1fr)`, gap:2, marginBottom:20 }}>
              {times.map((t, i) => (
                <div key={i} style={{ background:"#0b0908", border:"1px solid #1e1c18", padding:"8px 4px", textAlign:"center" }}>
                  <div style={{ fontSize:9, color:"#3a3530", fontFamily:"monospace", marginBottom:4 }}>R{i+1}</div>
                  <div style={{ fontSize:16, fontFamily:"'Oswald'", color:"#c8c0b0" }}>{t}<span style={{ fontSize:9 }}>ms</span></div>
                </div>
              ))}
            </div>

            <div style={{ display:"flex", gap:2 }}>
              <button onClick={() => { setRound(0); setTimes([]); setLast(null); startRound(); }} style={{
                flex:1, padding:"12px 0", background:"transparent", border:"1px solid #2a2520",
                color:"#4a4540", fontSize:10, letterSpacing:3, textTransform:"uppercase",
                fontFamily:"'Oswald'", cursor:"pointer", transition:"all 0.2s",
              }}
                onMouseEnter={e=>{ e.target.style.borderColor="#5a5550"; e.target.style.color="#c8c0b0"; }}
                onMouseLeave={e=>{ e.target.style.borderColor="#2a2520"; e.target.style.color="#4a4540"; }}
              >↺ Retry</button>
              <button onClick={onClose} style={{
                flex:1, padding:"12px 0", background:"#f5a623", border:"none",
                color:"#0e0c0a", fontSize:10, letterSpacing:3, textTransform:"uppercase",
                fontFamily:"'Oswald'", fontWeight:700, cursor:"pointer",
              }}>Done</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Detect component ────────────────────────────────────────────
export default function Detect() {
  const navigate    = useNavigate();
  const videoRef    = useRef(null);
  const canvasRef   = useRef(null);
  const intervalRef = useRef(null);
  const streamRef   = useRef(null);
  const sessionRef  = useRef({ frames:0, closedFrames:0, consecClosed:0, blinks:0, rolls:[], startTs:0 });

  const [phase,       setPhase]   = useState("idle");
  const [liveStats,   setLive]    = useState(null);
  const [result,      setResult]  = useState(null);
  const [errorMsg,    setError]   = useState("");
  const [sensors,     setSensors] = useState({ heart_rate:"95", shift_hours:"5", temperature:"32", gas_level:"0.03" });
  const [showReaction,setShowR]   = useState(false);

  const remaining = useCountdown(SESSION_SECONDS, phase === "recording");

  const stopCamera = useCallback(() => {
    if (streamRef.current)  { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (intervalRef.current){ clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  const startCamera = useCallback(async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      const video = videoRef.current;
      video.srcObject = stream;
      await new Promise(resolve => { video.onloadedmetadata = () => video.play().then(resolve); });
      setPhase("ready");
    } catch(e) {
      setError(`Camera error: ${e.name} — ${e.message}`);
      setPhase("error");
    }
  }, []);

  const sendFrame = useCallback(async () => {
    const video = videoRef.current, canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;
    const ctx = canvas.getContext("2d");
    canvas.width = video.videoWidth || 640; canvas.height = video.videoHeight || 480;
    ctx.drawImage(video, 0, 0);
    const b64 = canvas.toDataURL("image/jpeg", 0.7).split(",")[1];
    try {
      const res  = await fetch(`${API}/analyze-frame`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ image: b64 }) });
      const data = await res.json();
      if (data.error) return;
      setLive(data);
      const s = sessionRef.current;
      s.frames++;
      if (data.eyes_closed) { s.consecClosed++; s.closedFrames++; }
      else { if (s.consecClosed >= BLINK_CONSEC) s.blinks++; s.consecClosed = 0; }
      if (data.face_detected) s.rolls.push(Math.abs(data.roll));
    } catch { /* skip */ }
  }, []);

  // stop mid-session
  const stopEarly = useCallback(() => {
    stopCamera();
    setPhase("idle");
    setLive(null);
    setError("");
  }, [stopCamera]);

  const startRecording = useCallback(() => {
    sessionRef.current = { frames:0, closedFrames:0, consecClosed:0, blinks:0, rolls:[], startTs:Date.now() };
    setPhase("recording");
    const begin = () => { intervalRef.current = setInterval(sendFrame, FRAME_INTERVAL_MS); };
    const video = videoRef.current;
    if (video.readyState >= 2) begin();
    else video.addEventListener("canplay", begin, { once: true });

    setTimeout(async () => {
      // check if still recording (user may have stopped early)
      if (!intervalRef.current && sessionRef.current.frames === 0) return;
      clearInterval(intervalRef.current); intervalRef.current = null;
      setPhase("analyzing");
      const s       = sessionRef.current;
      const elapsed = (Date.now() - s.startTs) / 1000;
      const fps     = s.frames / elapsed || 10;
      const blink_rate       = (s.blinks / elapsed) * 60;
      const eye_closure_time = s.closedFrames / fps;
      const head_tilt_angle  = s.rolls.length ? s.rolls.reduce((a,b)=>a+b,0)/s.rolls.length : 0;
      try {
        const res  = await fetch(`${API}/predict-session`, {
          method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({
            blink_rate:+blink_rate.toFixed(2), eye_closure_time:+eye_closure_time.toFixed(2),
            head_tilt_angle:+head_tilt_angle.toFixed(2), heart_rate:+sensors.heart_rate,
            shift_hours:+sensors.shift_hours, temperature:+sensors.temperature, gas_level:+sensors.gas_level,
          }),
        });
        const data = await res.json();
        setResult(data); setPhase("done");
      } catch {
        setError("Could not reach Flask API. Check server."); setPhase("error");
      }
      stopCamera();
    }, SESSION_SECONDS * 1000);
  }, [sendFrame, sensors, stopCamera]);

  const reset = useCallback(() => { stopCamera(); setPhase("idle"); setLive(null); setResult(null); setError(""); }, [stopCamera]);
  useEffect(() => () => stopCamera(), [stopCamera]);

  const isRecording = phase === "recording";
  const showVideo   = phase === "ready" || phase === "recording" || phase === "analyzing";
  const earValue    = liveStats ? (liveStats.avg_ear ?? 0) : 0;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Barlow:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        html, body { background:#0e0c0a; min-height:100vh; color:#c8c0b0; font-family:'Barlow',sans-serif; }
        @keyframes fadeUp    { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }
        @keyframes warnblink { 0%,100%{opacity:1} 50%{opacity:0.2} }
        @keyframes spin      { to{transform:rotate(360deg)} }
        @keyframes scanline  { 0%{top:-4px} 100%{top:100%} }
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance:none; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-thumb { background:#1e1c18; border-radius:2px; }
      `}</style>

      {/* Hidden video + canvas */}
      <video ref={videoRef} muted playsInline autoPlay style={{ display:"none", position:"absolute" }}/>
      <canvas ref={canvasRef} style={{ display:"none" }}/>

      {/* Reaction modal */}
      {showReaction && <ReactionModal onClose={() => setShowR(false)}/>}

      {/* ── NAVBAR (Home button only) ── */}
      <nav style={{
        position:"fixed", top:0, left:0, right:0, zIndex:100,
        height:56, display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"0 32px", background:"rgba(14,12,10,0.95)",
        backdropFilter:"blur(10px)", borderBottom:"2px solid #1e1c18",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:24, height:24, background:"#f5a623",
            clipPath:"polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)",
            animation:"warnblink 3s infinite" }}/>
          <span style={{ fontFamily:"'Oswald'", fontSize:18, fontWeight:700, letterSpacing:3, color:"#e8e0d0" }}>
            Mine<span style={{ color:"#f5a623" }}>Watch</span>
          </span>
          <span style={{ marginLeft:6, padding:"2px 8px", fontSize:9, letterSpacing:2,
            color:"#f5a623", border:"1px solid rgba(245,166,35,0.3)",
            fontFamily:"monospace", textTransform:"uppercase" }}>FATIGUE SCAN</span>
        </div>

        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          {/* Home button only */}
          <button onClick={() => navigate("/")} style={{
            background:"transparent", border:"1px solid #2a2520",
            color:"#4a4540", padding:"6px 18px", fontSize:10, letterSpacing:2,
            fontFamily:"'Oswald'", textTransform:"uppercase", cursor:"pointer", transition:"all 0.2s",
          }}
            onMouseEnter={e=>{ e.target.style.borderColor="#5a5550"; e.target.style.color="#c8c0b0"; }}
            onMouseLeave={e=>{ e.target.style.borderColor="#2a2520"; e.target.style.color="#4a4540"; }}
          >← Home</button>
        </div>
      </nav>

      {/* ── MAIN CONTENT ── */}
      <div style={{ position:"relative", zIndex:1, minHeight:"100vh",
        display:"flex", flexDirection:"column", alignItems:"center", padding:"80px 16px 60px" }}>

        {/* Reaction test button (always visible, above the camera/sensor panel) */}
        <div style={{ width:"100%", maxWidth:660, marginBottom:16, display:"flex", justifyContent:"flex-end" }}>
          <button onClick={() => setShowR(true)} style={{
            background:"transparent", border:"1px solid #f5a62344",
            color:"#f5a623", padding:"8px 20px", fontSize:10, letterSpacing:2,
            fontFamily:"'Oswald'", textTransform:"uppercase", cursor:"pointer", transition:"all 0.2s",
          }}
            onMouseEnter={e=>{ e.target.style.borderColor="#f5a623"; e.target.style.background="rgba(245,166,35,0.08)"; }}
            onMouseLeave={e=>{ e.target.style.borderColor="#f5a62344"; e.target.style.background="transparent"; }}
          >⚡ Reaction Test</button>
        </div>

        {/* ── IDLE ── */}
        {phase === "idle" && (
          <div style={{ width:"100%", maxWidth:500, animation:"fadeUp 0.4s ease" }}>
            <div style={{ background:"#0b0908", border:"2px solid #1e1c18", borderTop:"2px solid #f5a62344" }}>
              <div style={{ padding:"12px 20px", borderBottom:"1px solid #1e1c18", display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ width:8, height:8, background:"#f5a623", borderRadius:"50%" }}/>
                <span style={{ fontSize:10, letterSpacing:3, color:"#f5a623", fontFamily:"monospace", textTransform:"uppercase" }}>
                  Step 1 — Enter Shift Data
                </span>
              </div>
              <div style={{ padding:"20px" }}>
                <SensorPanel sensors={sensors} setSensors={setSensors}/>
                <button onClick={startCamera} style={{
                  width:"100%", padding:"14px 0", background:"#f5a623", border:"none",
                  color:"#0e0c0a", fontSize:11, letterSpacing:4, textTransform:"uppercase",
                  fontFamily:"'Oswald'", fontWeight:700, cursor:"pointer", transition:"all 0.2s",
                }}
                  onMouseEnter={e=>e.target.style.background="#ffba4a"}
                  onMouseLeave={e=>e.target.style.background="#f5a623"}
                >▶ Enable Camera</button>
              </div>
            </div>
          </div>
        )}

        {/* ── VIDEO PHASES ── */}
        {showVideo && (
          <div style={{ width:"100%", maxWidth:660, animation:"fadeUp 0.4s ease", display:"flex", flexDirection:"column", gap:2 }}>
            <div style={{
              position:"relative", overflow:"hidden",
              border:`2px solid ${isRecording ? "#f5a62355" : "#1e1c18"}`,
              boxShadow: isRecording ? "0 0 30px rgba(245,166,35,0.1)" : "none",
              transition:"border-color 0.3s, box-shadow 0.3s",
            }}>
              <VideoDisplay videoRef={videoRef}/>

              {isRecording && (
                <div style={{ position:"absolute", top:12, left:12, display:"flex", alignItems:"center", gap:6,
                  background:"rgba(0,0,0,0.75)", padding:"5px 12px", border:"1px solid rgba(245,166,35,0.3)" }}>
                  <span style={{ width:7, height:7, borderRadius:"50%", background:"#ff4444", display:"inline-block", animation:"warnblink 1s infinite" }}/>
                  <span style={{ fontSize:9, letterSpacing:3, color:"#ff6666", fontFamily:"monospace" }}>RECORDING</span>
                </div>
              )}

              {isRecording && (
                <div style={{ position:"absolute", top:12, right:12, background:"rgba(0,0,0,0.75)", padding:"5px 14px",
                  border:"1px solid #2a2520", fontFamily:"'Oswald'", fontSize:20, color:"#f5a623", letterSpacing:2 }}>
                  {remaining}s
                </div>
              )}

              {isRecording && liveStats && (
                <div style={{ position:"absolute", bottom:12, left:12, right:12, display:"flex", flexDirection:"column", gap:6 }}>
                  <EARBar ear={earValue}/>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                    {["pitch","yaw","roll"].map(k => (
                      <span key={k} style={{ fontSize:9, letterSpacing:2, color:"#6a6560", fontFamily:"monospace",
                        background:"rgba(0,0,0,0.75)", padding:"3px 8px", border:"1px solid #2a2520" }}>
                        {k.toUpperCase()} {liveStats[k]?.toFixed(1)}°
                      </span>
                    ))}
                    <span style={{ marginLeft:"auto", fontSize:9, letterSpacing:1, fontFamily:"monospace",
                      background:"rgba(0,0,0,0.75)", padding:"3px 8px", border:"1px solid #2a2520",
                      color: liveStats.face_detected ? "#4caf6e" : "#ff4444" }}>
                      {liveStats.face_detected ? "FACE ✓" : "NO FACE"}
                    </span>
                  </div>
                </div>
              )}

              {phase === "analyzing" && (
                <div style={{ position:"absolute", inset:0, background:"rgba(14,12,10,0.85)",
                  display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:14 }}>
                  <div style={{ width:40, height:40, border:"2px solid #2a2520", borderTop:"2px solid #f5a623",
                    borderRadius:"50%", animation:"spin 0.8s linear infinite" }}/>
                  <p style={{ fontSize:10, letterSpacing:4, color:"#4a4540", fontFamily:"monospace", textTransform:"uppercase" }}>
                    Processing Data
                  </p>
                </div>
              )}
            </div>

            {isRecording && liveStats && (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:2 }}>
                <Pill label="L-EAR"   value={liveStats.left_ear?.toFixed(3)}         color={liveStats.left_ear  < EAR_CLOSED ? "#ff4444" : "#4caf6e"}/>
                <Pill label="R-EAR"   value={liveStats.right_ear?.toFixed(3)}        color={liveStats.right_ear < EAR_CLOSED ? "#ff4444" : "#4caf6e"}/>
                <Pill label="Blink L" value={liveStats.blink_score_left?.toFixed(2)} color="#f5a623"/>
                <Pill label="Blink R" value={liveStats.blink_score_right?.toFixed(2)}color="#f5a623"/>
              </div>
            )}

            {/* Ready buttons */}
            {phase === "ready" && (
              <div style={{ display:"flex", gap:2, marginTop:2 }}>
                <button onClick={startRecording} style={{
                  flex:1, padding:"14px 0", background:"#f5a623", border:"none",
                  color:"#0e0c0a", fontSize:11, letterSpacing:4, textTransform:"uppercase",
                  fontFamily:"'Oswald'", fontWeight:700, cursor:"pointer", transition:"all 0.2s",
                }}
                  onMouseEnter={e=>e.target.style.background="#ffba4a"}
                  onMouseLeave={e=>e.target.style.background="#f5a623"}
                >▶ Start {SESSION_SECONDS}s Scan</button>
                <button onClick={reset} style={{
                  padding:"14px 24px", background:"transparent", border:"1px solid #2a2520",
                  color:"#4a4540", fontSize:10, letterSpacing:3, textTransform:"uppercase",
                  fontFamily:"'Oswald'", cursor:"pointer", transition:"all 0.2s",
                }}
                  onMouseEnter={e=>{ e.target.style.borderColor="#5a5550"; e.target.style.color="#c8c0b0"; }}
                  onMouseLeave={e=>{ e.target.style.borderColor="#2a2520"; e.target.style.color="#4a4540"; }}
                >Cancel</button>
              </div>
            )}

            {/* ── STOP EARLY button during recording ── */}
            {isRecording && (
              <button onClick={stopEarly} style={{
                width:"100%", padding:"12px 0", background:"rgba(255,68,68,0.08)",
                border:"1px solid rgba(255,68,68,0.3)", color:"#ff6666",
                fontSize:10, letterSpacing:3, textTransform:"uppercase",
                fontFamily:"'Oswald'", cursor:"pointer", transition:"all 0.2s", marginTop:2,
              }}
                onMouseEnter={e=>{ e.target.style.background="rgba(255,68,68,0.16)"; e.target.style.borderColor="rgba(255,68,68,0.5)"; }}
                onMouseLeave={e=>{ e.target.style.background="rgba(255,68,68,0.08)"; e.target.style.borderColor="rgba(255,68,68,0.3)"; }}
              >■ Stop Session Early</button>
            )}
          </div>
        )}

        {/* ── DONE ── */}
        {phase === "done" && result && (
          <div style={{ width:"100%", maxWidth:500, animation:"fadeUp 0.5s ease" }}>
            <div style={{ background:"#0b0908", border:"2px solid #1e1c18", padding:"24px" }}>
              <ResultCard result={result} onReset={reset}/>
            </div>
          </div>
        )}

        {/* ── ERROR ── */}
        {(phase === "error" || errorMsg) && (
          <div style={{ width:"100%", maxWidth:500, marginTop:12,
            background:"rgba(255,68,68,0.06)", border:"1px solid rgba(255,68,68,0.2)",
            borderLeft:"3px solid #ff4444", padding:"14px 18px",
            fontSize:12, color:"#ff6666", fontFamily:"monospace", lineHeight:1.8 }}>
            ⚠ {errorMsg}
            <br/>
            <button onClick={reset} style={{ marginTop:10, background:"none", border:"none",
              color:"#f5a623", cursor:"pointer", fontFamily:"monospace", fontSize:12, textDecoration:"underline" }}>Reset</button>
          </div>
        )}
      </div>
    </>
  );
}