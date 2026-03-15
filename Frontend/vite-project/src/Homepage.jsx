
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";

function useCounter(target, duration = 2000, start = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime = null;
    const step = (ts) => {
      if (!startTime) startTime = ts;
      const p = Math.min((ts - startTime) / duration, 1);
      setValue(Math.floor(p * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return value;
}

export default function HomePage() {
  const navigate = useNavigate();
  const statsRef = useRef(null);
  const [statsOn, setStatsOn] = useState(false);
  const acc     = useCounter(97,  2200, statsOn);
  const samples = useCounter(1200,2800, statsOn);
  const ms      = useCounter(120, 1800, statsOn);

  useEffect(() => {
    const ob = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setStatsOn(true); },
      { threshold: 0.3 }
    );
    if (statsRef.current) ob.observe(statsRef.current);
    return () => ob.disconnect();
  }, []);

  const features = [
    {
      icon: "👁",
      title: "Eye Fatigue Tracking",
      desc: "Measures blink rate and eye closure time using 468 facial landmarks. Detects microsleeps before they cause accidents underground.",
      accent: "#f5a623",
    },
    {
      icon: "🧠",
      title: "ML Risk Prediction",
      desc: "Random Forest model trained on real mining shift data. Classifies fatigue as Normal, Moderate, or High in under 120ms.",
      accent: "#e8e8e8",
    },
    {
      icon: "📡",
      title: "Sensor Fusion",
      desc: "Combines camera data with heart rate, shift hours, ambient temperature and gas levels for accurate underground detection.",
      accent: "#f5a623",
    },
    {
      icon: "⚠",
      title: "Instant Alert",
      desc: "High fatigue triggers an immediate on-screen warning. No delay, no guesswork — designed for split-second safety decisions.",
      accent: "#ff4444",
    },
  ];

  const steps = [
    { num:"01", title:"Enter Shift Data",    desc:"Input heart rate, hours worked, pit temperature and gas readings from your instruments." },
    { num:"02", title:"Face the Camera",     desc:"Position yourself in front of the camera. Works in low-light mining environments." },
    { num:"03", title:"20-Second Scan",      desc:"System tracks your eyes and head movement for 20 seconds — no special equipment needed." },
    { num:"04", title:"Act on the Result",   desc:"Green = continue. Yellow = take a break. Red = stop work immediately and report." },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Barlow:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body {
          background: #0e0c0a;
          color: #c8c0b0;
          font-family: 'Barlow', sans-serif;
          overflow-x: hidden;
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #2a2520; border-radius: 2px; }

        @keyframes fadeUp   { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:none} }
        @keyframes warnblink{ 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes scandown { 0%{top:-4px} 100%{top:100%} }
        @keyframes flicker  { 0%,100%{opacity:1} 92%{opacity:1} 93%{opacity:0.4} 94%{opacity:1} 97%{opacity:0.7} 98%{opacity:1} }
        @keyframes shake    { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-2px)} 75%{transform:translateX(2px)} }

        .fade-up  { animation: fadeUp 0.8s ease forwards; opacity: 0; }
        .d1 { animation-delay: 0.05s; }
        .d2 { animation-delay: 0.15s; }
        .d3 { animation-delay: 0.25s; }
        .d4 { animation-delay: 0.35s; }

        .card-hover { transition: transform 0.25s, border-color 0.25s; cursor: default; }
        .card-hover:hover { transform: translateY(-4px); }

        .warning-stripe {
          background: repeating-linear-gradient(
            -45deg,
            #f5a62322,
            #f5a62322 8px,
            transparent 8px,
            transparent 20px
          );
        }
      `}</style>

      {/* ── grain overlay ── */}
      <div style={{
        position:"fixed", inset:0, zIndex:0, pointerEvents:"none", opacity:0.06,
        backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        backgroundSize:"200px 200px",
      }}/>

      {/* ── horizontal scan line ── */}
      <div style={{
        position:"fixed", left:0, right:0, height:2, zIndex:200, pointerEvents:"none",
        background:"linear-gradient(90deg, transparent, rgba(245,166,35,0.15), transparent)",
        animation:"scandown 8s linear infinite",
      }}/>

      {/* ── NAVBAR ─────────────────────────────────────────────────────── */}
      <nav style={{
        position:"fixed", top:0, left:0, right:0, zIndex:100,
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"0 48px", height:60,
        background:"rgba(14,12,10,0.95)", backdropFilter:"blur(10px)",
        borderBottom:"2px solid #2a2520",
      }}>
        {/* Logo */}
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{
            width:32, height:32, background:"#f5a623",
            clipPath:"polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
            display:"flex", alignItems:"center", justifyContent:"center",
            animation:"warnblink 3s ease-in-out infinite",
          }}/>
          <span style={{
            fontFamily:"'Oswald'", fontSize:20, fontWeight:700,
            letterSpacing:3, color:"#e8e0d0", textTransform:"uppercase",
          }}>
            Mine<span style={{ color:"#f5a623" }}>Watch</span>
          </span>
          <div style={{
            marginLeft:8, padding:"2px 8px",
            background:"rgba(245,166,35,0.1)", border:"1px solid rgba(245,166,35,0.3)",
            borderRadius:3, fontSize:9, color:"#f5a623", letterSpacing:2,
            fontFamily:"monospace", textTransform:"uppercase",
          }}>FATIGUE SYSTEM</div>
        </div>

        {/* Links */}
        <div style={{ display:"flex", gap:28 }}>
          {[["Features","#features"],["How It Works","#how"],["Levels","#levels"]].map(([label, href]) => (
            <a key={label} href={href} style={{
              fontSize:12, color:"#4a4540", letterSpacing:2, textDecoration:"none",
              textTransform:"uppercase", fontFamily:"'Oswald'", fontWeight:400,
              transition:"color 0.2s",
            }}
              onMouseEnter={e=>e.target.style.color="#c8c0b0"}
              onMouseLeave={e=>e.target.style.color="#4a4540"}
            >{label}</a>
          ))}
        </div>

        <button onClick={() => navigate("/detect")} style={{
          padding:"8px 24px", background:"#f5a623",
          border:"none", borderRadius:4,
          color:"#0e0c0a", fontSize:11, letterSpacing:3,
          fontFamily:"'Oswald'", fontWeight:600, textTransform:"uppercase",
          cursor:"pointer", transition:"all 0.2s",
        }}
          onMouseEnter={e=>e.target.style.background="#ffba4a"}
          onMouseLeave={e=>e.target.style.background="#f5a623"}
        >Start Scan</button>
      </nav>

      {/* ── HERO ───────────────────────────────────────────────────────── */}
      <section style={{
        position:"relative", zIndex:1, minHeight:"100vh",
        display:"flex", flexDirection:"column", justifyContent:"center",
        padding:"120px 48px 80px",
        borderBottom:"2px solid #2a2520",
        overflow:"hidden",
      }}>
        {/* Big background text */}
        <div style={{
          position:"absolute", right:-20, top:"50%", transform:"translateY(-50%)",
          fontFamily:"'Oswald'", fontSize:"28vw", fontWeight:700,
          color:"rgba(245,166,35,0.03)", letterSpacing:-10, pointerEvents:"none",
          lineHeight:1, userSelect:"none",
        }}>SAFE</div>

        {/* Warning stripe top */}
        <div className="warning-stripe" style={{ position:"absolute", top:0, left:0, right:0, height:6 }}/>

        <div style={{ maxWidth:760, position:"relative", zIndex:2 }}>
          {/* Alert badge */}
          <div className="fade-up d1" style={{
            display:"inline-flex", alignItems:"center", gap:8, marginBottom:24,
            padding:"5px 14px 5px 10px",
            background:"rgba(255,68,68,0.1)", border:"1px solid rgba(255,68,68,0.3)",
            borderRadius:3,
          }}>
            <span style={{ fontSize:14 }}>⚠</span>
            <span style={{ fontSize:10, letterSpacing:3, color:"#ff6666", fontFamily:"monospace", textTransform:"uppercase" }}>
              Underground Safety Alert System
            </span>
          </div>

          {/* Headline */}
          <h1 className="fade-up d2" style={{
            fontFamily:"'Oswald'", fontWeight:700,
            fontSize:"clamp(3.5rem,9vw,7.5rem)",
            lineHeight:0.92, letterSpacing:2,
            textTransform:"uppercase", marginBottom:24,
          }}>
            <span style={{ display:"block", color:"#e8e0d0" }}>Don't Let</span>
            <span style={{ display:"block", color:"#f5a623", animation:"flicker 5s infinite" }}>Fatigue</span>
            <span style={{ display:"block", color:"#e8e0d0" }}>Cost a Life</span>
          </h1>

          <p className="fade-up d3" style={{
            fontSize:16, color:"#5a5550", lineHeight:1.9, maxWidth:520, marginBottom:44,
          }}>
            Coal mining is one of the world's most dangerous occupations.
            Fatigue is responsible for <span style={{ color:"#f5a623" }}>30% of mining accidents</span>.
            MineWatch detects driver fatigue in real time — before it becomes a tragedy.
          </p>

          {/* CTAs */}
          <div className="fade-up d4" style={{ display:"flex", gap:14, flexWrap:"wrap" }}>
            <button onClick={() => navigate("/detect")} style={{
              padding:"15px 40px", background:"#f5a623", border:"none",
              borderRadius:4, color:"#0e0c0a",
              fontSize:12, letterSpacing:3, textTransform:"uppercase",
              fontFamily:"'Oswald'", fontWeight:600, cursor:"pointer",
              transition:"all 0.2s", boxShadow:"0 0 30px rgba(245,166,35,0.25)",
            }}
              onMouseEnter={e=>{ e.target.style.background="#ffba4a"; e.target.style.boxShadow="0 0 40px rgba(245,166,35,0.4)"; }}
              onMouseLeave={e=>{ e.target.style.background="#f5a623"; e.target.style.boxShadow="0 0 30px rgba(245,166,35,0.25)"; }}
            >▶ Run Fatigue Scan</button>

            <a href="#how" style={{
              padding:"15px 40px",
              background:"transparent", border:"1px solid #2a2520",
              borderRadius:4, color:"#4a4540",
              fontSize:12, letterSpacing:3, textTransform:"uppercase",
              fontFamily:"'Oswald'", fontWeight:500,
              textDecoration:"none", transition:"all 0.2s",
            }}
              onMouseEnter={e=>{ e.target.style.borderColor="#5a5550"; e.target.style.color="#c8c0b0"; }}
              onMouseLeave={e=>{ e.target.style.borderColor="#2a2520"; e.target.style.color="#4a4540"; }}
            >How It Works ↓</a>
          </div>
        </div>

        {/* Warning stripe bottom */}
        <div className="warning-stripe" style={{ position:"absolute", bottom:0, left:0, right:0, height:6 }}/>
      </section>

      {/* ── STATS ──────────────────────────────────────────────────────── */}
      <section ref={statsRef} style={{
        position:"relative", zIndex:1,
        display:"grid", gridTemplateColumns:"repeat(3,1fr)",
        borderBottom:"2px solid #2a2520",
      }}>
        {[
          { val:acc,     suf:"%",   label:"Detection Accuracy",  sub:"Tested on real shift data" },
          { val:samples, suf:"",    label:"Training Samples",    sub:"Across 3 fatigue levels"   },
          { val:ms,      suf:"ms",  label:"Analysis Speed",      sub:"Per camera frame"          },
        ].map((s, i) => (
          <div key={i} style={{
            padding:"48px 32px", textAlign:"center",
            borderRight: i < 2 ? "1px solid #2a2520" : "none",
            background: i === 1 ? "rgba(245,166,35,0.02)" : "transparent",
          }}>
            <div style={{
              fontFamily:"'Oswald'", fontSize:"clamp(2.8rem,5vw,4.5rem)",
              fontWeight:700, color:"#f5a623", letterSpacing:2,
            }}>{s.val}{s.suf}</div>
            <div style={{ fontSize:13, color:"#c8c0b0", letterSpacing:2, textTransform:"uppercase", fontFamily:"'Oswald'", marginTop:6 }}>{s.label}</div>
            <div style={{ fontSize:11, color:"#3a3530", fontFamily:"monospace", marginTop:4 }}>{s.sub}</div>
          </div>
        ))}
      </section>

      {/* ── FEATURES ───────────────────────────────────────────────────── */}
      <section id="features" style={{ position:"relative", zIndex:1, padding:"90px 48px", maxWidth:1200, margin:"0 auto" }}>
        <div style={{ marginBottom:56 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
            <div style={{ width:24, height:3, background:"#f5a623", borderRadius:2 }}/>
            <span style={{ fontSize:10, letterSpacing:4, color:"#f5a623", fontFamily:"monospace", textTransform:"uppercase" }}>System Capabilities</span>
          </div>
          <h2 style={{ fontFamily:"'Oswald'", fontSize:"clamp(2rem,4vw,3.2rem)", fontWeight:700, color:"#e8e0d0", letterSpacing:2, textTransform:"uppercase" }}>
            Built for the <span style={{ color:"#f5a623" }}>Mine Floor</span>
          </h2>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))", gap:2 }}>
          {features.map((f, i) => (
            <div key={i} className="card-hover" style={{
              padding:"32px 28px",
              background:"#121008",
              border:"1px solid #1e1c18",
              transition:"border-color 0.25s, background 0.25s",
            }}
              onMouseEnter={e=>{ e.currentTarget.style.borderColor="#3a3530"; e.currentTarget.style.background="#161410"; }}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor="#1e1c18"; e.currentTarget.style.background="#121008"; }}
            >
              <div style={{ fontSize:28, marginBottom:18 }}>{f.icon}</div>
              <div style={{ width:28, height:2, background:f.accent, borderRadius:1, marginBottom:16 }}/>
              <h3 style={{ fontFamily:"'Oswald'", fontSize:17, fontWeight:600, color:"#d8d0c0", letterSpacing:1, textTransform:"uppercase", marginBottom:10 }}>{f.title}</h3>
              <p style={{ fontSize:13, color:"#3a3530", lineHeight:1.85 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────────────────────────── */}
      <section id="how" style={{
        position:"relative", zIndex:1, padding:"90px 48px",
        background:"#0b0908",
        borderTop:"2px solid #1e1c18", borderBottom:"2px solid #1e1c18",
      }}>
        <div style={{ maxWidth:1200, margin:"0 auto" }}>
          <div style={{ marginBottom:56 }}>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
              <div style={{ width:24, height:3, background:"#f5a623", borderRadius:2 }}/>
              <span style={{ fontSize:10, letterSpacing:4, color:"#f5a623", fontFamily:"monospace", textTransform:"uppercase" }}>Procedure</span>
            </div>
            <h2 style={{ fontFamily:"'Oswald'", fontSize:"clamp(2rem,4vw,3.2rem)", fontWeight:700, color:"#e8e0d0", letterSpacing:2, textTransform:"uppercase" }}>
              Simple 4-Step <span style={{ color:"#f5a623" }}>Protocol</span>
            </h2>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))", gap:0 }}>
            {steps.map((s, i) => (
              <div key={i} style={{
                padding:"36px 28px",
                borderRight: i < steps.length-1 ? "1px solid #1e1c18" : "none",
                position:"relative",
              }}>
                <div style={{
                  fontFamily:"'Oswald'", fontSize:56, fontWeight:700,
                  color:"#1e1c18", letterSpacing:2, lineHeight:1, marginBottom:16,
                }}>{s.num}</div>
                <h3 style={{
                  fontFamily:"'Oswald'", fontSize:15, fontWeight:600,
                  color:"#c8c0b0", letterSpacing:2, textTransform:"uppercase", marginBottom:10,
                }}>{s.title}</h3>
                <p style={{ fontSize:13, color:"#3a3530", lineHeight:1.85 }}>{s.desc}</p>
                <div style={{
                  position:"absolute", bottom:0, left:28,
                  width:32, height:2, background:"#f5a62344", borderRadius:1,
                }}/>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FATIGUE LEVELS ─────────────────────────────────────────────── */}
      <section id="levels" style={{ position:"relative", zIndex:1, padding:"90px 48px", maxWidth:1200, margin:"0 auto" }}>
        <div style={{ marginBottom:56 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
            <div style={{ width:24, height:3, background:"#f5a623", borderRadius:2 }}/>
            <span style={{ fontSize:10, letterSpacing:4, color:"#f5a623", fontFamily:"monospace", textTransform:"uppercase" }}>Alert Classification</span>
          </div>
          <h2 style={{ fontFamily:"'Oswald'", fontSize:"clamp(2rem,4vw,3.2rem)", fontWeight:700, color:"#e8e0d0", letterSpacing:2, textTransform:"uppercase" }}>
            Fatigue <span style={{ color:"#f5a623" }}>Risk Levels</span>
          </h2>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))", gap:16 }}>
          {[
            {
              code:"L1", label:"NORMAL",   color:"#4caf6e", bg:"rgba(76,175,110,0.06)", border:"rgba(76,175,110,0.2)",
              icon:"●", action:"Continue operations",
              desc:"Alert and focused. Blink rate and eye closure within safe parameters. Head posture stable.",
              range:"Blink 10–20/min · Eye closure <2s · Tilt <5°",
            },
            {
              code:"L2", label:"MODERATE", color:"#f5a623", bg:"rgba(245,166,35,0.06)", border:"rgba(245,166,35,0.25)",
              icon:"◆", action:"Schedule immediate break",
              desc:"Fatigue indicators rising. Eyes getting heavy, slight head drift. Take a 15-minute rest before resuming.",
              range:"Blink 20–35/min · Eye closure 2–5s · Tilt 5–12°",
            },
            {
              code:"L3", label:"HIGH RISK", color:"#ff4444", bg:"rgba(255,68,68,0.06)", border:"rgba(255,68,68,0.25)",
              icon:"▲", action:"STOP — Report to supervisor",
              desc:"Dangerous fatigue detected. Microsleeps and head nodding observed. Do not operate machinery.",
              range:"Blink 35–60/min · Eye closure >5s · Tilt >12°",
            },
          ].map((l, i) => (
            <div key={i} className="card-hover" style={{
              padding:"32px 28px", borderRadius:4,
              background:l.bg, border:`1px solid ${l.border}`,
            }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
                <div style={{
                  fontFamily:"'Oswald'", fontSize:11, letterSpacing:3,
                  color:l.color, textTransform:"uppercase",
                  padding:"3px 10px", border:`1px solid ${l.border}`,
                  borderRadius:2,
                }}>{l.code} — {l.label}</div>
                <span style={{ fontSize:20, color:l.color }}>{l.icon}</span>
              </div>

              <div style={{
                padding:"10px 14px", marginBottom:20,
                background:"rgba(0,0,0,0.3)", borderLeft:`3px solid ${l.color}`,
                borderRadius:"0 4px 4px 0",
              }}>
                <span style={{ fontSize:12, color:l.color, fontFamily:"'Oswald'", letterSpacing:2, textTransform:"uppercase" }}>
                  → {l.action}
                </span>
              </div>

              <p style={{ fontSize:13, color:"#5a5550", lineHeight:1.85, marginBottom:16 }}>{l.desc}</p>
              <div style={{ fontSize:10, color:l.color, fontFamily:"monospace", opacity:0.5, letterSpacing:1 }}>{l.range}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────── */}
      <section style={{
        position:"relative", zIndex:1, padding:"90px 48px",
        background:"#0b0908",
        borderTop:"2px solid #1e1c18",
        overflow:"hidden",
      }}>
        <div className="warning-stripe" style={{ position:"absolute", top:0, left:0, right:0, height:6 }}/>

        {/* Big BG text */}
        <div style={{
          position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center",
          fontFamily:"'Oswald'", fontSize:"20vw", fontWeight:700,
          color:"rgba(245,166,35,0.025)", pointerEvents:"none", userSelect:"none",
          letterSpacing:-8,
        }}>SAFE</div>

        <div style={{ position:"relative", zIndex:2, textAlign:"center", maxWidth:640, margin:"0 auto" }}>
          <div style={{
            display:"inline-flex", alignItems:"center", gap:8, marginBottom:24,
            padding:"6px 16px", background:"rgba(255,68,68,0.1)", border:"1px solid rgba(255,68,68,0.25)", borderRadius:3,
          }}>
            <span style={{ fontSize:12, animation:"warnblink 1s infinite" }}>⚠</span>
            <span style={{ fontSize:10, color:"#ff6666", letterSpacing:3, fontFamily:"monospace", textTransform:"uppercase" }}>
              Every second counts underground
            </span>
          </div>

          <h2 style={{
            fontFamily:"'Oswald'", fontWeight:700,
            fontSize:"clamp(2.5rem,7vw,5.5rem)",
            color:"#e8e0d0", letterSpacing:3, textTransform:"uppercase",
            lineHeight:1, marginBottom:20,
          }}>
            Run Your<br/><span style={{ color:"#f5a623", animation:"flicker 6s infinite" }}>Safety Check</span>
          </h2>

          <p style={{ fontSize:15, color:"#4a4540", lineHeight:1.9, marginBottom:44 }}>
            Takes 20 seconds. No hardware needed.<br/>
            Your safety is worth more than 20 seconds.
          </p>

          <button onClick={() => navigate("/detect")} style={{
            padding:"18px 60px", background:"#f5a623", border:"none",
            borderRadius:4, color:"#0e0c0a",
            fontSize:14, letterSpacing:4, textTransform:"uppercase",
            fontFamily:"'Oswald'", fontWeight:700, cursor:"pointer",
            boxShadow:"0 0 40px rgba(245,166,35,0.3)",
            transition:"all 0.25s",
          }}
            onMouseEnter={e=>{ e.target.style.background="#ffba4a"; e.target.style.boxShadow="0 0 60px rgba(245,166,35,0.5)"; e.target.style.letterSpacing="5px"; }}
            onMouseLeave={e=>{ e.target.style.background="#f5a623"; e.target.style.boxShadow="0 0 40px rgba(245,166,35,0.3)"; e.target.style.letterSpacing="4px"; }}
          >▶ Begin Scan Now</button>
        </div>

        <div className="warning-stripe" style={{ position:"absolute", bottom:0, left:0, right:0, height:6 }}/>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────── */}
      <footer style={{
        position:"relative", zIndex:1, padding:"24px 48px",
        borderTop:"1px solid #1e1c18",
        display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12,
        background:"#080706",
      }}>
        <span style={{ fontFamily:"'Oswald'", fontSize:15, letterSpacing:3, color:"#2a2520", textTransform:"uppercase" }}>
          Mine<span style={{ color:"#f5a623" }}>Watch</span> · Fatigue Detection System
        </span>
        <span style={{ fontSize:10, color:"#2a2520", fontFamily:"monospace", letterSpacing:1 }}>
          Flask · MediaPipe · React · RandomForest — Built for Coal Worker Safety
        </span>
      </footer>
    </>
  );
}