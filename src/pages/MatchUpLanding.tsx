import { useEffect, useRef, useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1: Upload matchup-cage-hq.mp4 to Supabase Storage
//   Dashboard → Storage → New bucket "assets" (public)
//   Upload the file → copy the public URL → paste below
// ─────────────────────────────────────────────────────────────────────────────
const VIDEO_URL = "/matchup-cage-hq.mp4";
// ─────────────────────────────────────────────────────────────────────────────
// Phases keyed to video content (5s, 150 frames)
// ─────────────────────────────────────────────────────────────────────────────
const PHASES = [
  { s: 0.00, num: "01", name: "CAGE DORMANT",    cls: "",      stat: "STANDBY",        dm: null    },
  { s: 0.15, num: "02", name: "NODES ENERGISE",  cls: "amber", stat: "CORNERS FIRING", dm: "amber" },
  { s: 0.38, num: "03", name: "NETWORK ONLINE",  cls: "green", stat: "CIRCUIT ACTIVE", dm: "green" },
  { s: 0.65, num: "04", name: "LOGO ACTIVATED",  cls: "green", stat: "LOGO ONLINE",    dm: "green" },
  { s: 0.85, num: "05", name: "FULLY ACTIVATED", cls: "gold",  stat: "NETWORK LIVE",   dm: "gold"  },
];

const ROLES = [
  { t: "TALENT",    ax: 0,     ay: -1.10 },
  { t: "PROMOTERS", ax: 0.78,  ay: -0.78 },
  { t: "SPONSORS",  ax: 1.15,  ay: 0     },
  { t: "COACHES",   ax: 0.78,  ay: 0.78  },
  { t: "GYMS",      ax: 0,     ay: 1.10  },
  { t: "MEDIA",     ax: -0.78, ay: 0.78  },
  { t: "AGENTS",    ax: -1.15, ay: 0     },
  { t: "VENUES",    ax: -0.78, ay: -0.78 },
];

// ─────────────────────────────────────────────────────────────────────────────
// Colour maps
// ─────────────────────────────────────────────────────────────────────────────
const phaseColour: Record<string, string> = {
  amber: "#C9A84C",
  green: "#39FF6E",
  gold:  "#F0C040",
  "":    "rgba(255,255,255,0.08)",
};

const dotColour: Record<string, string> = {
  amber: "#C9A84C",
  green: "#39FF6E",
  gold:  "#F0C040",
};

const labelColour: Record<string, string> = {
  amber: "rgba(201,168,76,0.65)",
  green: "rgba(57,255,110,0.7)",
  gold:  "#F0C040",
};

// ─────────────────────────────────────────────────────────────────────────────
export default function MatchUpLanding() {
  const trackRef  = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const cageRef   = useRef<HTMLDivElement>(null);
  const vidRef    = useRef<HTMLVideoElement>(null);

  const [progress, setProgress]   = useState(0);
  const [phaseIdx, setPhaseIdx]   = useState(0);
  const [labelPos, setLabelPos]   = useState<{ x: number; y: number }[]>([]);
  const rafRef = useRef(false);

  // ── Scroll → progress ──────────────────────────────────────────────
  useEffect(() => {
    const onScroll = () => {
      if (rafRef.current) return;
      rafRef.current = true;
      requestAnimationFrame(() => {
        const track = trackRef.current;
        if (!track) { rafRef.current = false; return; }
        const range = track.offsetHeight - window.innerHeight;
        const p = Math.max(0, Math.min(1, (window.scrollY - track.offsetTop) / range));
        setProgress(p);

        // Scrub video
        const vid = vidRef.current;
        if (vid && vid.readyState >= 1) {
          const t = p * 5.0;
          if (Math.abs(vid.currentTime - t) > 0.033) vid.currentTime = t;
        }

        // Phase
        let pi = 0;
        for (let i = PHASES.length - 1; i >= 0; i--) {
          if (p >= PHASES[i].s) { pi = i; break; }
        }
        setPhaseIdx(pi);
        rafRef.current = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ── Position role labels ────────────────────────────────────────────
  useEffect(() => {
    const place = () => {
      const sticky = stickyRef.current;
      const cage   = cageRef.current;
      if (!sticky || !cage) return;
      const sr = sticky.getBoundingClientRect();
      const cr = cage.getBoundingClientRect();
      const cx = cr.left - sr.left + cr.width  / 2;
      const cy = cr.top  - sr.top  + cr.height / 2;
      const rx = cr.width  * 0.64;
      const ry = cr.height * 0.55;
      setLabelPos(ROLES.map(r => ({ x: cx + r.ax * rx, y: cy + r.ay * ry })));
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("load", place);
    setTimeout(place, 100);
    return () => { window.removeEventListener("resize", place); window.removeEventListener("load", place); };
  }, []);

  // ── Helpers ─────────────────────────────────────────────────────────
  const ph      = PHASES[phaseIdx];
  const started = progress > 0.01;
  const showDots = progress > 0.12;

  function ambientGlow() {
    if (progress > 0.85) return "radial-gradient(ellipse 70% 65% at 50% 50%, rgba(201,168,76,0.14) 0%, #000 68%)";
    if (progress > 0.38) return "radial-gradient(ellipse 70% 65% at 50% 50%, rgba(57,255,110,0.07) 0%, #000 68%)";
    if (progress > 0.15) return "radial-gradient(ellipse 70% 65% at 50% 50%, rgba(201,130,20,0.07) 0%, #000 68%)";
    return "#000";
  }

  function roleLabelColour(i: number) {
    const t = 0.18 + i * 0.03;
    if (progress <= t) return "transparent";
    if (progress > 0.85) return labelColour.gold;
    if (progress > 0.38) return labelColour.green;
    return labelColour.amber;
  }

  function dotClass(i: number) {
    const threshold = ph.s + i * 0.022;
    if (!ph.dm || progress <= threshold) return "rgba(255,255,255,0.08)";
    return dotColour[ph.dm] ?? "rgba(255,255,255,0.08)";
  }

  function dotGlow(i: number) {
    const threshold = ph.s + i * 0.022;
    if (!ph.dm || progress <= threshold) return "none";
    const c = dotColour[ph.dm ?? ""] ?? "";
    if (!c) return "none";
    return `0 0 6px ${c}`;
  }

  const phColour = phaseColour[ph.cls] ?? "rgba(255,255,255,0.08)";

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <div style={{ background: "#000", color: "#fff", fontFamily: "'Barlow Condensed', sans-serif", overflowX: "hidden" }}>

      {/* ── INTRO ─────────────────────────────────────────────────── */}
      <section style={{
        height: "100vh", background: "#000",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(201,168,76,0.06) 0%, transparent 70%)",
        }} />
        <p style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "0.6rem", letterSpacing: "0.35em", color: "rgba(201,168,76,0.4)", textTransform: "uppercase", marginBottom: "1.5rem" }}>
          [ System Standby — Awaiting Activation ]
        </p>
        <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(5rem,16vw,11rem)", letterSpacing: "0.08em", lineHeight: 0.88, textAlign: "center" }}>
          MATCH<span style={{ color: "#C9A84C" }}>UP</span>
        </h1>
        <p style={{ marginTop: "1.2rem", fontSize: "0.85rem", fontWeight: 300, letterSpacing: "0.28em", color: "rgba(255,255,255,0.2)", textTransform: "uppercase" }}>
          The Professional Network
        </p>
        <div style={{ position: "absolute", bottom: "2.5rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.7rem", fontFamily: "'Share Tech Mono', monospace", fontSize: "0.56rem", letterSpacing: "0.3em", color: "rgba(201,168,76,0.35)" }}>
          <span>Scroll to activate</span>
          <div style={{ width: 1, height: 44, background: "linear-gradient(to bottom, rgba(201,168,76,0.6), transparent)", animation: "ld 2s ease-in-out infinite" }} />
        </div>
      </section>

      {/* ── SCROLL TRACK ──────────────────────────────────────────── */}
      <div ref={trackRef} style={{ position: "relative", height: "500vh" }}>
        <div
          ref={stickyRef}
          style={{
            position: "sticky", top: 0, height: "100vh",
            background: ambientGlow(),
            display: "flex", alignItems: "center", justifyContent: "center",
            overflow: "hidden", transition: "background 1s ease",
          }}
        >
          {/* Cage */}
          <div
            ref={cageRef}
            style={{
              position: "relative",
              width: "min(430px, 82vw)",
              aspectRatio: "816 / 1104",
              zIndex: 1,
            }}
          >
            <video
              ref={vidRef}
              src={VIDEO_URL}
              muted
              playsInline
              preload="auto"
              style={{ width: "100%", height: "100%", display: "block" }}
            />

            {/* Corner brackets */}
            {[
              { pos: { top: -8, left:  -8 }, flip: "" },
              { pos: { top: -8, right: -8 }, flip: "scaleX(-1)" },
              { pos: { bottom: -8, left:  -8 }, flip: "scaleY(-1)" },
              { pos: { bottom: -8, right: -8 }, flip: "scale(-1,-1)" },
            ].map((b, i) => (
              <div key={i} style={{ position: "absolute", width: 20, height: 20, opacity: started ? 1 : 0, transition: "opacity 0.6s ease", transform: b.flip, ...b.pos }}>
                <svg viewBox="0 0 20 20" fill="none" style={{ width: "100%", height: "100%" }}>
                  <path d="M1 13L1 1L13 1" stroke="#C9A84C" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </div>
            ))}

            {/* HUD top-left */}
            <div style={{ position: "absolute", top: 10, left: 10, fontFamily: "'Share Tech Mono', monospace", fontSize: "0.5rem", letterSpacing: "0.15em", color: "rgba(255,255,255,0.3)", lineHeight: 1.8, opacity: started ? 1 : 0, transition: "opacity 0.5s ease" }}>
              <div>MATCHUP NETWORK</div>
              <div style={{ color: ph.cls ? phColour : "rgba(255,255,255,0.3)", transition: "color 0.5s ease" }}>{ph.stat}</div>
            </div>

            {/* Pct top-right */}
            <div style={{ position: "absolute", top: 10, right: 10, textAlign: "right", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.5rem", letterSpacing: "0.04em", lineHeight: 1, color: progress > 0.85 ? "#F0C040" : "rgba(255,255,255,0.07)", opacity: started ? 1 : 0, transition: "opacity 0.5s ease, color 0.5s ease" }}>
              {Math.round(progress * 100)}%
              <span style={{ display: "block", fontFamily: "'Share Tech Mono', monospace", fontSize: "0.44rem", letterSpacing: "0.2em", color: "rgba(255,255,255,0.2)", marginTop: 2 }}>ACTIVATED</span>
            </div>

            {/* Progress bar */}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: "rgba(255,255,255,0.04)" }}>
              <div style={{ height: "100%", width: `${progress * 100}%`, background: "linear-gradient(to right, #C9A84C, #39FF6E, #00D4FF, #F0C040)", transition: "width 0.05s linear" }} />
            </div>

            {/* Phase label */}
            <div style={{ position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)", textAlign: "center", opacity: started ? 1 : 0, transition: "opacity 0.5s ease" }}>
              <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "0.46rem", letterSpacing: "0.3em", color: "rgba(255,255,255,0.15)" }}>PHASE {ph.num}</div>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.2rem", letterSpacing: "0.18em", color: phColour, textShadow: ph.cls ? `0 0 14px ${phColour}80` : "none", transition: "color 0.5s ease", whiteSpace: "nowrap" }}>{ph.name}</div>
            </div>
          </div>

          {/* Node dots */}
          <div style={{ position: "absolute", bottom: `calc(50% - min(430px, 82vw) * 1104/816/2 - 22px)`, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 6, opacity: showDots ? 1 : 0, transition: "opacity 0.5s ease" }}>
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: dotClass(i), boxShadow: dotGlow(i), transition: "background 0.3s ease, box-shadow 0.3s ease" }} />
            ))}
          </div>

          {/* Role labels */}
          {labelPos.map((pos, i) => {
            const colour = roleLabelColour(i);
            const visible = progress > 0.18 + i * 0.03;
            return (
              <div key={i} style={{
                position: "absolute",
                left: pos.x, top: pos.y,
                transform: "translate(-50%, -50%)",
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: "0.54rem", letterSpacing: "0.18em", textTransform: "uppercase",
                color: colour,
                whiteSpace: "nowrap",
                opacity: visible ? 1 : 0,
                textShadow: progress > 0.85 ? "0 0 8px rgba(240,192,64,0.5)" : "none",
                transition: "opacity 0.4s ease, color 0.4s ease",
                pointerEvents: "none",
              }}>
                {ROLES[i].t}
              </div>
            );
          })}

        </div>
      </div>

      {/* ── OUTRO ─────────────────────────────────────────────────── */}
      <section style={{ background: "#000", padding: "7rem 2rem 8rem", display: "flex", flexDirection: "column", alignItems: "center", borderTop: "1px solid rgba(201,168,76,0.1)" }}>
        <p style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "0.6rem", letterSpacing: "0.35em", color: "rgba(201,168,76,0.35)", textTransform: "uppercase", marginBottom: "2.5rem" }}>
          [ Network Online — All Nodes Active ]
        </p>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(3.5rem,10vw,7rem)", letterSpacing: "0.08em", color: "#fff", textAlign: "center", lineHeight: 0.88, marginBottom: "2rem" }}>
          THE CAGE<br />IS <span style={{ color: "#C9A84C" }}>LIVE.</span>
        </h2>
        <p style={{ fontSize: "0.95rem", fontWeight: 300, letterSpacing: "0.1em", color: "rgba(255,255,255,0.28)", maxWidth: 400, textAlign: "center", lineHeight: 1.8, marginBottom: "3rem" }}>
          Every corner is a role. Every connection is an opportunity. MatchUp wires talent, coaches, promoters, sponsors and venues into one activated network.
        </p>
        <button
          onClick={() => { /* TODO: navigate to signup / dashboard */ }}
          style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1rem", letterSpacing: "0.2em", padding: "0.9rem 2.8rem", background: "#C9A84C", color: "#000", border: "none", cursor: "pointer" }}
        >
          ENTER THE NETWORK
        </button>
      </section>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@300;400;700&family=Share+Tech+Mono&display=swap');
        @keyframes ld {
          0%   { transform: scaleY(0); transform-origin: top; }
          45%  { transform: scaleY(1); transform-origin: top; }
          55%  { transform: scaleY(1); transform-origin: bottom; }
          100% { transform: scaleY(0); transform-origin: bottom; }
        }
      `}</style>
    </div>
  );
}
