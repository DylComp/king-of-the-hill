"use client";

import { useEffect, useState } from "react";
import Logo from "./Logo";

const LINES = ["pouring the foundation", "stacking floors", "wiring the neon", "letting the citizens in"];
const CELLS = 12 * 8;
/** Never hold the page hostage: past this the intro finishes whatever is still loading. */
const MAX_MS = 6000;

/**
 * First-visit intro: counts up while the page, fonts and assets actually load,
 * then the screen breaks away in pixel blocks.
 */
export default function Boot() {
  const [pct, setPct] = useState(0);
  const [phase, setPhase] = useState<"run" | "out" | "done">("run");

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem("pt:booted") === "1";
      sessionStorage.setItem("pt:booted", "1");
    } catch {}
    const minMs = seen ? 450 : 1500;
    const start = performance.now();
    let loaded = document.readyState === "complete";
    let fonts = false;
    const onLoad = () => (loaded = true);
    window.addEventListener("load", onLoad);
    document.fonts?.ready.then(() => (fonts = true)).catch(() => (fonts = true));
    if (!document.fonts) fonts = true;

    let shown = 0;
    let raf = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const tick = (t: number) => {
      const elapsed = t - start;
      const ready = (loaded && fonts && elapsed >= minMs) || elapsed >= MAX_MS;
      // Each finished piece of loading unlocks more of the bar; time eases toward the cap.
      const cap = ready ? 100 : 30 + (fonts ? 30 : 0) + (loaded ? 30 : 0);
      const target = Math.min(cap, (elapsed / minMs) * 100);
      shown += (target - shown) * 0.12 + (target > shown ? 0.2 : 0);
      shown = Math.min(shown, target);
      setPct(Math.floor(shown));
      if (ready && shown >= 99.5) {
        setPct(100);
        timers.push(setTimeout(() => setPhase("out"), 120));
        timers.push(setTimeout(() => setPhase("done"), 820));
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
      window.removeEventListener("load", onLoad);
    };
  }, []);

  if (phase === "done") return null;
  const step = Math.min(LINES.length - 1, Math.floor((pct / 100) * LINES.length));
  return (
    <div className={`boot ${phase === "out" ? "out" : ""}`} aria-hidden>
      <div className="boot-grid">
        {Array.from({ length: CELLS }, (_, i) => (
          <i key={i} style={{ animationDelay: `${((i * 37) % CELLS) * 4}ms` }} />
        ))}
      </div>
      <div className="boot-core">
        <Logo size={96} />
        <div className="pixel boot-title">pump tower</div>
        <div className="boot-bar">
          <span style={{ width: `${pct}%` }} />
        </div>
        <div className="boot-meta">
          <span className="boot-line">{LINES[step]}</span>
          <span className="boot-pct">{String(pct).padStart(3, " ")}%</span>
        </div>
      </div>
    </div>
  );
}
