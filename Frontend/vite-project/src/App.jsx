// import { useState, useRef, useEffect, useCallback } from "react";
// import HomePage from "./Homepage";

// const API = "";
// const FRAME_INTERVAL_MS = 120;
// const SESSION_SECONDS   = 20;
// const EAR_CLOSED        = 0.21;
// const BLINK_CONSEC      = 2;

// const LEVELS = {
//   Normal:   { color: "#00e5a0", icon: "◉", label: "ALERT",     desc: "You're in good shape. Stay focused.",            pct: 33 },
//   Moderate: { color: "#f5c542", icon: "◎", label: "MODERATE",  desc: "Fatigue building. Consider a short break.",      pct: 66 },
//   High:     { color: "#ff4466", icon: "⊗", label: "HIGH RISK", desc: "Dangerous fatigue detected. Stop and rest now.", pct: 100 },
// };

// function useCountdown(target, active) {
//   const [remaining, setRemaining] = useState(target);
//   useEffect(() => {
//     if (!active) { setRemaining(target); return; }
//     const iv = setInterval(() => setRemaining(r => Math.max(0, r - 1)), 1000);
//     return () => clearInterval(iv);
//   }, [active, target]);
//   return remaining;
// }

// function Pill({ label, value, unit, color }) {
//   return (
//     <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:10, padding:"10px 14px", display:"flex", flexDirection:"column", gap:3 }}>
//       <span style={{ fontSize:9, letterSpacing:2, color:"#444", fontFamily:"monospace", textTransform:"uppercase" }}>{label}</span>
//       <span style={{ fontSize:18, fontWeight:700, color:color||"#ccc", fontFamily:"monospace" }}>
//         {value??'—'}
//         {value!=null&&<span style={{ fontSize:10, marginLeft:4, color:"#555" }}>{unit}</span>}
//       </span>
//     </div>
//   );
// }

// function EARBar({ ear }) {
//   const pct = Math.min(1, ear / 0.4) * 100;
//   const col = ear < EAR_CLOSED ? "#ff4466" : "#00e5a0";
//   return (
//     <div style={{ display:"flex", alignItems:"center", gap:10 }}>
//       <span style={{ fontSize:9, letterSpacing:2, color:"#444", fontFamily:"monospace", width:36 }}>EAR</span>
//       <div style={{ flex:1, height:4, background:"#111", borderRadius:4, overflow:"hidden" }}>
//         <div style={{ width:`${pct}%`, height:"100%", background:col, borderRadius:4, transition:"width 0.1s, background 0.2s" }}/>
//       </div>
//       <span style={{ fontSize:11, color:col, fontFamily:"monospace", width:36, textAlign:"right" }}>{ear.toFixed(2)}</span>
//     </div>
//   );
// }

// function ResultCard({ result }) {
//   const cfg = LEVELS[result.fatigue_level] || LEVELS.Normal;
//   return (
//     <div style={{ animation:"fadeIn 0.5s ease", textAlign:"center", padding:"24px 0 8px" }}>
//       <div style={{ fontSize:56, color:cfg.color, filter:`drop-shadow(0 0 24px ${cfg.color}55)`, animation:"pulse 2s infinite" }}>{cfg.icon}</div>
//       <div style={{ marginTop:8, fontSize:10, letterSpacing:4, color:"#444", fontFamily:"monospace", textTransform:"uppercase" }}>Fatigue Level</div>
//       <div style={{ fontSize:32, fontWeight:900, color:cfg.color, letterSpacing:2, fontFamily:"monospace", textShadow:`0 0 28px ${cfg.color}66` }}>{cfg.label}</div>
//       <div style={{ width:"70%", margin:"14px auto 0", height:4, background:"#111", borderRadius:4, overflow:"hidden" }}>
//         <div style={{ width:`${cfg.pct}%`, height:"100%", background:cfg.color, boxShadow:`0 0 12px ${cfg.color}`, borderRadius:4, transition:"width 1s cubic-bezier(.4,0,.2,1)" }}/>
//       </div>
//       <p style={{ marginTop:12, fontSize:12, color:"#666", fontFamily:"monospace", lineHeight:1.7 }}>{cfg.desc}</p>
//       <div style={{ marginTop:20, display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
//         <Pill label="Blink Rate"  value={result.blink_rate}       unit="/min"/>
//         <Pill label="Eye Closure" value={result.eye_closure_time} unit="s"/>
//         <Pill label="Head Tilt"   value={result.head_tilt_angle}  unit="°"/>
//       </div>
//     </div>
//   );
// }

// function SensorPanel({ sensors, setSensors }) {
//   const fields = [
//     { key:"heart_rate",  label:"Heart Rate",  unit:"bpm",  step:1     },
//     { key:"shift_hours", label:"Shift Hours", unit:"hrs",  step:0.5   },
//     { key:"temperature", label:"Temp",        unit:"°C",   step:0.5   },
//     { key:"gas_level",   label:"Gas Level",   unit:"ppm",  step:0.001 },
//   ];
//   return (
//     <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:20 }}>
//       {fields.map(f => (
//         <div key={f.key}>
//           <label style={{ fontSize:9, letterSpacing:2, color:"#444", fontFamily:"monospace", textTransform:"uppercase", display:"block", marginBottom:5 }}>
//             {f.label} <span style={{ color:"#333" }}>({f.unit})</span>
//           </label>
//           <input type="number" step={f.step} value={sensors[f.key]}
//             onChange={e=>setSensors(p=>({...p,[f.key]:e.target.value}))}
//             style={{ width:"100%", padding:"8px 10px", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.09)", borderRadius:7, color:"#ccc", fontSize:13, fontFamily:"monospace", outline:"none" }}
//           />
//         </div>
//       ))}
//     </div>
//   );
// }

// function hexToRgb(hex) {
//   return `${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)}`;
// }

// function BtnStyle(accent, ghost=false) {
//   return {
//     flex:1, padding:"13px 0",
//     background: ghost ? "rgba(255,255,255,0.03)" : `rgba(${hexToRgb(accent)},0.18)`,
//     border:`1px solid ${ghost ? "rgba(255,255,255,0.08)" : `rgba(${hexToRgb(accent)},0.35)`}`,
//     borderRadius:10, color: ghost ? "#555" : accent,
//     fontSize:11, letterSpacing:3, textTransform:"uppercase",
//     fontFamily:"monospace", cursor:"pointer", transition:"all 0.2s",
//     display:"block", width: ghost ? "auto" : "100%",
//   };
// }

// export default function App() {
//   // video + canvas are ALWAYS in DOM so refs are never null
//   const videoRef    = useRef(null);
//   const canvasRef   = useRef(null);
//   const intervalRef = useRef(null);
//   const streamRef   = useRef(null);
//   const sessionRef  = useRef({ frames:0, closedFrames:0, consecClosed:0, blinks:0, rolls:[], startTs:0 });

//   const [phase,    setPhase]   = useState("idle");
//   const [liveStats,setLive]    = useState(null);
//   const [result,   setResult]  = useState(null);
//   const [errorMsg, setError]   = useState("");
//   const [sensors,  setSensors] = useState({ heart_rate:"95", shift_hours:"5", temperature:"32", gas_level:"0.03" });

//   const remaining = useCountdown(SESSION_SECONDS, phase === "recording");

//   const stopCamera = useCallback(() => {
//     if (streamRef.current)  { streamRef.current.getTracks().forEach(t=>t.stop()); streamRef.current=null; }
//     if (intervalRef.current){ clearInterval(intervalRef.current); intervalRef.current=null; }
//   }, []);

//   // startCamera: video element is always mounted so ref is always available
//   const startCamera = useCallback(async () => {
//     setError("");
//     try {
//       const stream = await navigator.mediaDevices.getUserMedia({ video: true });
//       streamRef.current = stream;
//       const video = videoRef.current;
//       video.srcObject = stream;
//       await new Promise((resolve) => {
//         video.onloadedmetadata = () => video.play().then(resolve);
//       });
//       setPhase("ready");
//     } catch(e) {
//       setError(`Camera error: ${e.name} - ${e.message}`);
//       setPhase("error");
//     }
//   }, []);

//   const sendFrame = useCallback(async () => {
//     const video=videoRef.current, canvas=canvasRef.current;
//     if (!video||!canvas||video.readyState<2) return;
//     const ctx=canvas.getContext("2d");
//     canvas.width=video.videoWidth||640; canvas.height=video.videoHeight||480;
//     ctx.drawImage(video,0,0);
//     const b64=canvas.toDataURL("image/jpeg",0.7).split(",")[1];
//     try {
//       const res=await fetch(`${API}/analyze-frame`,{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({image:b64}) });
//       const data=await res.json();
//       if (data.error) return;
//       setLive(data);
//       const s=sessionRef.current;
//       s.frames++;
//       if (data.eyes_closed) { s.consecClosed++; s.closedFrames++; }
//       else { if(s.consecClosed>=BLINK_CONSEC) s.blinks++; s.consecClosed=0; }
//       if (data.face_detected) s.rolls.push(Math.abs(data.roll));
//     } catch { /* skip */ }
//   }, []);

//   const startRecording = useCallback(() => {
//     sessionRef.current={ frames:0, closedFrames:0, consecClosed:0, blinks:0, rolls:[], startTs:Date.now() };
//     setPhase("recording");

//     const begin = () => {
//       intervalRef.current = setInterval(sendFrame, FRAME_INTERVAL_MS);
//     };
//     const video = videoRef.current;
//     if (video.readyState >= 2) {
//       begin();
//     } else {
//       video.addEventListener("canplay", begin, { once: true });
//     }

//     setTimeout(async()=>{
//       clearInterval(intervalRef.current); intervalRef.current=null;
//       setPhase("analyzing");
//       const s=sessionRef.current;
//       const elapsed=(Date.now()-s.startTs)/1000;
//       const fps=s.frames/elapsed||10;
//       const blink_rate=(s.blinks/elapsed)*60;
//       const eye_closure_time=s.closedFrames/fps;
//       const head_tilt_angle=s.rolls.length ? s.rolls.reduce((a,b)=>a+b,0)/s.rolls.length : 0;
//       try {
//         const res=await fetch(`${API}/predict-session`,{
//           method:"POST", headers:{"Content-Type":"application/json"},
//           body:JSON.stringify({
//             blink_rate:+blink_rate.toFixed(2), eye_closure_time:+eye_closure_time.toFixed(2),
//             head_tilt_angle:+head_tilt_angle.toFixed(2),
//             heart_rate:+sensors.heart_rate, shift_hours:+sensors.shift_hours,
//             temperature:+sensors.temperature, gas_level:+sensors.gas_level,
//           }),
//         });
//         const data=await res.json();
//         setResult(data); setPhase("done");
//       } catch {
//         setError("Could not reach Flask API. Check server."); setPhase("error");
//       }
//       stopCamera();
//     }, SESSION_SECONDS*1000);
//   }, [sendFrame, sensors, stopCamera]);

//   const reset = useCallback(()=>{ stopCamera(); setPhase("idle"); setLive(null); setResult(null); setError(""); },[stopCamera]);

//   useEffect(()=>()=>stopCamera(),[stopCamera]);

//   const isRecording=phase==="recording";
//   const showVideo=phase==="ready"||phase==="recording"||phase==="analyzing";
//   const earValue=liveStats ? (liveStats.avg_ear??0) : 0;

//   return (
//     <>
//     <HomePage/>
//       <style>{`
//         @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;700;800&display=swap');
//         *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
//         html,body{background:#060608;min-height:100vh;color:#e2e2e2;font-family:'Syne',sans-serif;}
//         @keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
//         @keyframes pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.07);opacity:.85}}
//         @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
//         @keyframes spin{to{transform:rotate(360deg)}}
//         input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;}
//         ::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-thumb{background:#1e1e1e;border-radius:2px;}
//       `}</style>

//       <div style={{ position:"fixed", inset:0, zIndex:0, pointerEvents:"none",
//         backgroundImage:"radial-gradient(rgba(255,255,255,0.022) 1px,transparent 1px)", backgroundSize:"28px 28px" }}/>

//       {/* video + canvas ALWAYS in DOM, hidden when not needed */}
//       <video ref={videoRef} muted playsInline autoPlay
//         style={{ display:"none", position:"absolute", pointerEvents:"none" }}
//       />
//       <canvas ref={canvasRef} style={{ display:"none" }}/>

//       <div style={{ position:"relative", zIndex:1, minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", padding:"36px 16px 60px" }}>

//         <header style={{ textAlign:"center", marginBottom:32, animation:"fadeIn 0.5s ease" }}>
//           <p style={{ fontSize:9, letterSpacing:5, color:"#2a2a30", fontFamily:"monospace", textTransform:"uppercase", marginBottom:10 }}>◈ Driver Safety System</p>
//           <h1 style={{ fontSize:"clamp(2rem,6vw,3.2rem)", fontWeight:800, lineHeight:1.05, letterSpacing:-1 }}>
//             Fatigue<br/><span style={{ color:"#ff4466", textShadow:"0 0 40px #ff446640" }}>Detection</span>
//           </h1>
//           <p style={{ marginTop:10, fontSize:11, color:"#2e2e2e", fontFamily:"monospace", letterSpacing:1 }}>In-browser webcam · MediaPipe · ML</p>
//         </header>

//         {/* IDLE */}
//         {phase==="idle" && (
//           <div style={{ width:"100%", maxWidth:460, animation:"fadeIn 0.4s ease" }}>
//             <div style={{ background:"rgba(255,255,255,0.025)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:18, padding:"26px 24px 28px" }}>
//               <p style={{ fontSize:10, letterSpacing:3, color:"#333", fontFamily:"monospace", textTransform:"uppercase", marginBottom:18 }}>Sensor Parameters</p>
//               <SensorPanel sensors={sensors} setSensors={setSensors}/>
//               <button onClick={startCamera} style={BtnStyle("#ff4466")}>Enable Camera →</button>
//             </div>
//           </div>
//         )}

//         {/* READY / RECORDING / ANALYZING */}
//         {showVideo && (
//           <div style={{ width:"100%", maxWidth:640, animation:"fadeIn 0.4s ease", display:"flex", flexDirection:"column", gap:16 }}>
//             <div style={{ position:"relative", borderRadius:16, overflow:"hidden",
//               border:`1px solid ${isRecording?"#ff446633":"rgba(255,255,255,0.07)"}`,
//               boxShadow:isRecording?"0 0 40px #ff446620":"none", transition:"box-shadow 0.4s,border-color 0.4s" }}>

//               {/* visible video clone using srcObject */}
//               <VideoDisplay videoRef={videoRef} />

//               {isRecording && (
//                 <div style={{ position:"absolute", top:14, left:14, display:"flex", alignItems:"center", gap:7, background:"rgba(0,0,0,0.6)", borderRadius:20, padding:"5px 12px" }}>
//                   <span style={{ width:7, height:7, borderRadius:"50%", background:"#ff4466", display:"inline-block", animation:"blink 1s infinite" }}/>
//                   <span style={{ fontSize:10, letterSpacing:2, color:"#ff4466", fontFamily:"monospace" }}>REC</span>
//                 </div>
//               )}
//               {isRecording && (
//                 <div style={{ position:"absolute", top:14, right:14, background:"rgba(0,0,0,0.6)", borderRadius:20, padding:"5px 14px", fontSize:12, color:"#aaa", fontFamily:"monospace" }}>
//                   {remaining}s
//                 </div>
//               )}
//               {isRecording && liveStats && (
//                 <div style={{ position:"absolute", bottom:14, left:14, right:14, display:"flex", flexDirection:"column", gap:6 }}>
//                   <EARBar ear={earValue}/>
//                   <div style={{ display:"flex", gap:8 }}>
//                     {["pitch","yaw","roll"].map(k=>(
//                       <span key={k} style={{ fontSize:9, letterSpacing:2, color:"#aaa", fontFamily:"monospace", background:"rgba(0,0,0,0.65)", borderRadius:6, padding:"3px 8px" }}>
//                         {k.toUpperCase()} {liveStats[k]?.toFixed(1)}°
//                       </span>
//                     ))}
//                     <span style={{ marginLeft:"auto", fontSize:9, letterSpacing:1, fontFamily:"monospace", background:"rgba(0,0,0,0.65)", borderRadius:6, padding:"3px 8px",
//                       color:liveStats.face_detected?"#00e5a0":"#ff4466" }}>
//                       {liveStats.face_detected?"FACE ✓":"NO FACE"}
//                     </span>
//                   </div>
//                 </div>
//               )}
//               {phase==="analyzing" && (
//                 <div style={{ position:"absolute", inset:0, background:"rgba(6,6,8,0.75)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:14 }}>
//                   <div style={{ width:36, height:36, border:"2px solid #1a1a1a", borderTop:"2px solid #ff4466", borderRadius:"50%", animation:"spin 0.8s linear infinite" }}/>
//                   <p style={{ fontSize:11, letterSpacing:3, color:"#555", fontFamily:"monospace" }}>ANALYZING</p>
//                 </div>
//               )}
//             </div>

//             {isRecording && liveStats && (
//               <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, animation:"fadeIn 0.3s ease" }}>
//                 <Pill label="L-EAR"   value={liveStats.left_ear?.toFixed(3)}         color={liveStats.left_ear  <EAR_CLOSED?"#ff4466":"#00e5a0"}/>
//                 <Pill label="R-EAR"   value={liveStats.right_ear?.toFixed(3)}        color={liveStats.right_ear <EAR_CLOSED?"#ff4466":"#00e5a0"}/>
//                 <Pill label="Blink L" value={liveStats.blink_score_left?.toFixed(2)}/>
//                 <Pill label="Blink R" value={liveStats.blink_score_right?.toFixed(2)}/>
//               </div>
//             )}

//             {phase==="ready" && (
//               <div style={{ display:"flex", gap:10 }}>
//                 <button onClick={startRecording} style={BtnStyle("#ff4466")}>▶ Start {SESSION_SECONDS}s Session</button>
//                 <button onClick={reset} style={{ ...BtnStyle("#333",true), width:"auto", padding:"13px 20px" }}>Cancel</button>
//               </div>
//             )}
//           </div>
//         )}

//         {/* DONE */}
//         {phase==="done" && result && (
//           <div style={{ width:"100%", maxWidth:460, animation:"fadeIn 0.4s ease" }}>
//             <div style={{ background:"rgba(255,255,255,0.025)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:18, padding:"28px 24px 32px" }}>
//               <ResultCard result={result}/>
//               <button onClick={reset} style={{ ...BtnStyle("#333",true), marginTop:24, width:"100%", padding:"13px 0" }}>↺ New Session</button>
//             </div>
//           </div>
//         )}

//         {/* ERROR */}
//         {(phase==="error"||errorMsg) && (
//           <div style={{ width:"100%", maxWidth:460, marginTop:12, background:"rgba(255,68,102,0.08)", border:"1px solid rgba(255,68,102,0.2)", borderRadius:12, padding:"14px 18px", fontSize:12, color:"#ff6680", fontFamily:"monospace", lineHeight:1.7 }}>
//             ⚠ {errorMsg}
//             <br/>
//             <button onClick={reset} style={{ marginTop:10, background:"none", border:"none", color:"#ff4466", cursor:"pointer", fontFamily:"monospace", fontSize:12, textDecoration:"underline" }}>Reset</button>
//           </div>
//         )}

//         <footer style={{ marginTop:40, fontSize:9, letterSpacing:3, color:"#1a1a1a", fontFamily:"monospace", textTransform:"uppercase" }}>Flask · MediaPipe · React</footer>
//       </div>
//     </>
//   );
// }

// // Separate component to display the video stream visually
// function VideoDisplay({ videoRef }) {
//   const displayRef = useRef(null);

//   useEffect(() => {
//     const display = displayRef.current;
//     const source  = videoRef.current;
//     if (display && source && source.srcObject) {
//       display.srcObject = source.srcObject;
//     }
//   }, [videoRef]);

//   return (
//     <video ref={displayRef} muted playsInline autoPlay
//       style={{ width:"100%", display:"block", transform:"scaleX(-1)" }}
//     />
//   );
// }import React from 'react';
import HomePage from './Homepage';
import Detect from './Detect';

function App() {
  return (
    <>
      <HomePage />
      <Detect />
    </>
  );
}

export default App;