"use client";

import { useEffect, useRef, useState } from "react";
import type { Floor, Placement } from "@/lib/game";
import { W, drawTower, floorAt, newScene, towerHeight } from "@/lib/render";

type Props = {
  floors: Floor[];
  placed: Record<string, Placement>;
  selected: string | null;
  onSelect: (mint: string) => void;
  onCanvas?: (c: HTMLCanvasElement | null) => void;
};

export default function TowerView({ floors, placed, selected, onSelect, onCanvas }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const scene = useRef(newScene());
  const latest = useRef({ floors, placed, selected });
  const [scale, setScale] = useState(2);
  latest.current = { floors, placed, selected };

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const fit = e.contentRect.width / W;
      // Integer scale keeps pixels square; small screens get a fractional fit instead of a tiny tower.
      setScale(fit >= 2 ? Math.floor(fit) : Math.max(1, fit));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    onCanvas?.(c);
    const ctx = c.getContext("2d")!;
    let raf = 0;
    let last = performance.now();
    const loop = (t: number) => {
      const { floors, placed, selected } = latest.current;
      const h = towerHeight(floors.length);
      if (c.height !== h) c.height = h;
      const dt = Math.min(0.1, (t - last) / 1000);
      last = t;
      drawTower(ctx, { floors, placed, selected, now: Date.now(), t, dt, scene: scene.current });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const h = towerHeight(floors.length);

  return (
    <div ref={wrap} className="tower-wrap">
      <canvas
        ref={canvas}
        width={W}
        height={h}
        style={{ width: W * scale, height: h * scale }}
        className="tower-canvas"
        aria-label="your tower"
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const i = floorAt(((e.clientY - r.top) / r.height) * h, floors.length);
          if (i != null) onSelect(floors[i].mint);
        }}
      />
    </div>
  );
}
