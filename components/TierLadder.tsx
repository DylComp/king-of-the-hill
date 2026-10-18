"use client";

import { useEffect, useRef } from "react";
import { TIERS, type TierId, floorRate, citizensFor } from "@/lib/game";
import { PREVIEW_H, PREVIEW_W, drawTierPreview } from "@/lib/render";
import HoverText from "./HoverText";

function Preview({ tier }: { tier: TierId }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    const loop = (t: number) => {
      drawTierPreview(ctx, tier, t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [tier]);
  return <canvas ref={ref} width={PREVIEW_W} height={PREVIEW_H} className="tier-canvas" />;
}

export default function TierLadder() {
  return (
    <div className="ladder">
      {[...TIERS].reverse().map((t) => (
        <div key={t.id} className="rung">
          <Preview tier={t.id} />
          <div className="rung-meta">
            <HoverText text={t.name} className="pixel rung-name" />
            <span className="dim">{t.minDays === 0 ? "day zero" : `${t.minDays}+ days held`}</span>
            <HoverText by="word" text={t.blurb} className="dim" />
            <span className="green">
              {citizensFor(t.id)} {citizensFor(t.id) === 1 ? "citizen" : "citizens"} · ${floorRate(t.id, false)}/hr
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
