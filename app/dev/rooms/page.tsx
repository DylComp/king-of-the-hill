"use client";

// Internal gallery of every room theme, used to review the pixel art.
import { useEffect, useRef } from "react";
import type { TierId } from "@/lib/game";
import { ROOM_H, ROOM_W, type Mood } from "@/lib/rooms/kit";
import { THEMES, buildRoom } from "@/lib/rooms";

const SAMPLES: { symbol: string; accent: string; usd: number; mood: Mood; change24: number; tier: TierId }[] = [
  { symbol: "BONK", accent: "#f59e0b", usd: 2400, mood: "flat", change24: 3, tier: 3 },
  { symbol: "WIF", accent: "#f472b6", usd: 60, mood: "red", change24: -18, tier: 1 },
  { symbol: "POPCAT", accent: "#38bdf8", usd: 18000, mood: "green", change24: 31, tier: 5 },
];

function Room({ id, i, label }: { id: string; i: number; label: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext("2d")!;
    const s = SAMPLES[i % SAMPLES.length];
    const tier = (id === "bare" ? 0 : s.tier) as TierId;
    const bag = id !== "resident";
    const b = buildRoom({ theme: THEMES.get(id)!, seed: id + i, tier, accent: s.accent, mood: s.mood, symbol: s.symbol, logo: null, usd: s.usd, isHouse: id === "pump-hq", change24: s.change24, bag });
    let raf = 0;
    const loop = (t: number) => {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(b.canvas, 0, 0);
      for (const f of b.fx) f(ctx, t);
      for (const f of b.front) f(ctx, t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [id, i]);
  return (
    <figure style={{ margin: 0 }}>
      <canvas ref={ref} width={ROOM_W} height={ROOM_H} data-room={label} style={{ width: ROOM_W * 3, height: ROOM_H * 3, imageRendering: "pixelated", display: "block" }} />
      <figcaption style={{ color: "#94a3b8", fontFamily: "monospace" }}>{THEMES.get(id)!.name}</figcaption>
    </figure>
  );
}

const SHOP_SETS = [
  ["airdrop", "piggy", "rugpull", "pilllamp"],
  ["candlecake", "curve", "frogstatue", "portrait"],
  ["rocket", "safe", "slots", "fountain"],
  ["diamondcase", "lambo", "rocket", "piggy"],
];

function Shop({ set }: { set: string[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current!.getContext("2d")!;
    const b = buildRoom({ theme: THEMES.get("pastel-loft")!, seed: set.join(), tier: 5, accent: "#38bdf8", mood: "flat", symbol: "POPCAT", logo: null, usd: 500, isHouse: false, change24: 2, bag: true, furniture: set });
    let raf = 0;
    const loop = (t: number) => {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(b.canvas, 0, 0);
      for (const f of b.fx) f(ctx, t);
      for (const f of b.front) f(ctx, t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [set]);
  return <canvas ref={ref} width={ROOM_W} height={ROOM_H} data-room={`shop-${set.join("-")}`} style={{ width: ROOM_W * 3, height: ROOM_H * 3, imageRendering: "pixelated", display: "block" }} />;
}

export default function Rooms() {
  const ids = [...THEMES.keys()];
  return (
    <main style={{ padding: 24, display: "grid", gap: 24, background: "#05060a" }}>
      {ids.flatMap((id) => SAMPLES.map((_, j) => <Room key={`${id}-${j}`} id={id} i={j} label={`${id}-${SAMPLES[j].symbol}`} />))}
      {SHOP_SETS.map((set) => (
        <Shop key={set.join()} set={set} />
      ))}
    </main>
  );
}
