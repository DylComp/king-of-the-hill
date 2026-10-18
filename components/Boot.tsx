"use client";

import { useEffect, useState } from "react";
import Logo from "./Logo";

const LINES = ["pouring the foundation", "stacking floors", "wiring the neon", "letting the citizens in"];
const CELLS = 12 * 8;

/** First-visit intro: the tower boots, then the screen breaks away in pixel blocks. */
export default function Boot() {
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<"run" | "out" | "done">("run");

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem("pt:booted") === "1";
      sessionStorage.setItem("pt:booted", "1");
    } catch {}
    const timers: ReturnType<typeof setTimeout>[] = [];
    const total = seen ? 450 : 1500;
    LINES.forEach((_, i) => timers.push(setTimeout(() => setStep(i + 1), ((i + 1) * total) / (LINES.length + 1))));
    timers.push(setTimeout(() => setPhase("out"), total));
    timers.push(setTimeout(() => setPhase("done"), total + 700));
    return () => timers.forEach(clearTimeout);
  }, []);

  if (phase === "done") return null;
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
          <span style={{ width: `${(step / LINES.length) * 100}%` }} />
        </div>
        <div className="boot-line">{LINES[Math.min(step, LINES.length - 1)]}</div>
      </div>
    </div>
  );
}
