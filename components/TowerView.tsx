"use client";

import { useEffect, useRef, useState } from "react";
import type { Floor, Placement } from "@/lib/game";
import { drawTower, floorAt, newScene, towerHeight, widthFor } from "@/lib/render";
import { useOnScreen } from "./useOnScreen";

type Props = {
  floors: Floor[];
  placed: Record<string, Placement>;
  selected: string | null;
  onSelect: (mint: string) => void;
  onCanvas?: (c: HTMLCanvasElement | null) => void;
  rewardsSol?: number | null;
  houseLive?: boolean;
};

/** Below this many CSS pixels the token cards drop off and each room fills the width. */
const COMPACT_BELOW = 560;

export default function TowerView({ floors, placed, selected, onSelect, onCanvas, rewardsSol, houseLive }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(wrap, "100px");
  const scene = useRef(newScene());
  const latest = useRef({ floors, placed, selected, rewardsSol, houseLive, compact: false });
  const [scale, setScale] = useState(2);
  const [compact, setCompact] = useState(false);
  latest.current = { floors, placed, selected, rewardsSol, houseLive, compact };
  const W = widthFor(compact);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const cw = e.contentRect.width;
      const c = cw < COMPACT_BELOW;
      setCompact(c);
      const fit = cw / widthFor(c);
      // Integer scale keeps pixels square; small screens get a fractional fit instead of a tiny tower.
      setScale(fit >= 2 ? Math.min(3, Math.floor(fit)) : Math.max(1, fit));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const c = canvas.current;
    const el = wrap.current;
    if (!c || !el) return;
    onCanvas?.(c);
    const ctx = c.getContext("2d")!;
    let raf = 0;
    let last = performance.now();
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      if (!onScreen.current) {
        last = t;
        return;
      }
      const { floors, placed, selected, rewardsSol, houseLive, compact } = latest.current;
      const h = towerHeight(floors.length);
      const w = widthFor(compact);
      if (c.height !== h) c.height = h;
      if (c.width !== w) c.width = w;
      const dt = Math.min(0.1, (t - last) / 1000);
      last = t;
      // Only floors in view animate; the rest stay as their still backgrounds.
      const box = c.getBoundingClientRect();
      const k = h / Math.max(1, box.height);
      const wrapBox = el.getBoundingClientRect();
      const top = Math.max(0, (Math.max(wrapBox.top, 0) - box.top) * k);
      const bottom = (Math.min(wrapBox.bottom, window.innerHeight) - box.top) * k;
      drawTower(ctx, { floors, placed, selected, now: Date.now(), t, dt, scene: scene.current, compact, rewardsSol, houseLive, view: { top, bottom } });
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
