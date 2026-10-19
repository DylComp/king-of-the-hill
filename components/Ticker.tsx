"use client";

import { useEffect, useState } from "react";
import type { Activity } from "@/app/api/activity/route";

const KIND = { launch: "new", burn: "burn", tower: "top" } as const;

/** A thin live strip above the nav: launches, burns and the tallest towers, scrolling on a loop. */
export default function Ticker() {
  const [items, setItems] = useState<Activity[]>([]);
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/activity")
        .then((r) => r.json())
        .then((j: { items?: Activity[] }) => alive && setItems(j.items ?? []))
        .catch(() => {});
    void load();
    const id = setInterval(() => document.visibilityState === "visible" && void load(), 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);
  if (!items.length) return null;
  // Two copies side by side so the loop never shows a gap.
  const row = (hidden: boolean) => (
    <div className="ticker-row" aria-hidden={hidden || undefined}>
      {items.map((a, i) => (
        <a key={i} href={a.href} className={`tick tick-${a.kind}`} tabIndex={hidden ? -1 : undefined} {...(a.href.startsWith("http") ? { target: "_blank", rel: "noopener" } : {})}>
          <span className="tick-tag pixel">{KIND[a.kind]}</span>
          {a.text}
        </a>
      ))}
    </div>
  );
  return (
    <div className="ticker" role="marquee" aria-label="live activity">
      <div className="ticker-track" style={{ animationDuration: `${Math.max(30, items.length * 7)}s` }}>
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}
