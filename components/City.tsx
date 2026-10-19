"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { type CityTower, arrange, buildingAt, cityHeight, cityWidth, drawCity } from "@/lib/city";
import { HOUSE_SYMBOL, fmtCash } from "@/lib/game";
import PumpName, { usePumpNames } from "./PumpName";

type Props = { me: string | null; onVisit: (wallet: string) => void };

/** Every tower in the city as one skyline. Tap a building to walk into it. */
function City({ me, onVisit }: Props) {
  const [towers, setTowers] = useState<CityTower[] | null>(null);
  const [total, setTotal] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const nameOf = usePumpNames(towers?.map((t) => t.wallet) ?? []);
  const latest = useRef<{ hover: number | null; me: string | null; name: (w: string) => string | null }>({ hover, me, name: () => null });
  latest.current = { hover, me, name: (w) => nameOf(w)?.username ?? null };

  useEffect(() => {
    fetch("/api/city")
      .then((r) => r.json())
      .then((j: { towers: CityTower[]; total: number }) => {
        setTowers(j.towers ?? []);
        setTotal(j.total ?? 0);
      })
      .catch(() => setTowers([]));
  }, []);

  const laid = useMemo(() => (towers ? arrange(towers) : []), [towers]);
  const rank = useMemo(() => new Map((towers ?? []).map((t, i) => [t.wallet, i + 1])), [towers]);
  const W = cityWidth(laid);
  const H = cityHeight(laid);

  // Start scrolled to the middle, where the tallest towers stand.
  useEffect(() => {
    const s = scroller.current;
    if (s && laid.length) s.scrollLeft = (s.scrollWidth - s.clientWidth) / 2;
  }, [laid.length]);

  useEffect(() => {
    const c = canvas.current;
    if (!c || !laid.length) return;
    const ctx = c.getContext("2d")!;
    let raf = 0;
    let visible = true;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(c);
    const loop = (t: number) => {
      if (visible) drawCity(ctx, laid, rank, t, latest.current);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [laid, rank]);

  if (towers == null) return <div className="panel dim">Loading the city...</div>;
  if (!towers.length) return <div className="panel dim">The city is empty. Connect a wallet to build the first tower.</div>;

  const h = hover != null ? laid[hover] : null;
  const pick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return buildingAt(((e.clientX - r.left) / r.width) * W, laid.length);
  };

  return (
    <div className="city">
      <div className="city-scroll" ref={scroller}>
        <canvas
          ref={canvas}
          width={W}
          height={H}
          className="city-canvas"
          style={{ width: W * 2, height: H * 2 }}
          aria-label="the city"
          onMouseMove={(e) => setHover(pick(e))}
          onMouseLeave={() => setHover(null)}
          onClick={(e) => {
            const i = pick(e);
            if (i != null) onVisit(laid[i].wallet);
          }}
        />
      </div>
      <div className="city-info">
        {h ? (
          <>
            <span className="pixel green">#{rank.get(h.wallet)}</span>
            <PumpName wallet={h.wallet} name={nameOf(h.wallet)} />
            {h.house && <span className="chip">{HOUSE_SYMBOL}</span>}
            <span className="dim">
              {h.floors} {h.floors === 1 ? "floor" : "floors"} · top floor {h.top === "RESIDENT" ? "home" : `$${h.top.toUpperCase()}`}
            </span>
            {!!h.coins && <span className="chip">{h.coins} launched</span>}
            <span className="pixel green">${fmtCash(h.rate)}/hr</span>
          </>
        ) : (
          <span className="dim">
            {total} towers in the city. The tallest rent stands in the middle. Hover a building to see whose it is, tap it to walk in.
          </span>
        )}
      </div>
    </div>
  );
}

export default memo(City);
