"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  HOUSE_MINT,
  ITEMS,
  MAX_FURNITURE,
  TIERS,
  type Floor,
  type ItemKind,
  type Save,
  buyAndPlace,
  citizensFor,
  daysHeld,
  earned,
  emptySave,
  floorRate,
  fmtCash,
  itemById,
  msToNextTier,
  removeFurniture,
  shortAddr,
  tierFor,
  towerRate,
} from "@/lib/game";
import TowerView from "./TowerView";
import TierLadder from "./TierLadder";

const DAY = 86_400_000;

function demoFloors(now: number): Floor[] {
  const f = (symbol: string, days: number, isHouse = false, mint = `demo${symbol}`): Floor => ({
    mint,
    symbol,
    name: symbol,
    image: null,
    amount: 0,
    usd: null,
    heldSince: now - days * DAY,
    isHouse,
  });
  return [f("TOWER", 41, true, HOUSE_MINT), f("GRUNT", 18), f("NOODL", 9), f("MOGGY", 4), f("SLURP", 1.4), f("ZAP", 0.1)];
}

type Ticker = { symbol: string; price: number | null; mcap: number | null; change: number | null };

type PhantomLike = {
  isPhantom?: boolean;
  connect: (o?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toString(): string } }>;
  disconnect?: () => Promise<void>;
};

function provider(): PhantomLike | null {
  const w = window as unknown as { phantom?: { solana?: PhantomLike }; solana?: PhantomLike; solflare?: PhantomLike };
  return w.phantom?.solana ?? w.solana ?? w.solflare ?? null;
}

const saveKey = (owner: string | null) => `pumptower:v1:${owner ?? "demo"}`;

function loadSave(owner: string | null): Save {
  try {
    const raw = localStorage.getItem(saveKey(owner));
    if (raw) return JSON.parse(raw) as Save;
  } catch {}
  // The demo tower starts with some cash so the shop is playable right away.
  return { ...emptySave(), cash: owner ? 0 : 1500 };
}

function fmtUsd(n: number | null) {
  if (n == null) return "soon";
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}m`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}k`;
  return n >= 1 ? `$${n.toFixed(2)}` : `$${n.toPrecision(3)}`;
}

function fmtWait(ms: number) {
  const h = Math.ceil(ms / 3_600_000);
  return h >= 48 ? `${Math.ceil(h / 24)} days` : `${h} hr`;
}

export default function Game() {
  const [owner, setOwner] = useState<string | null>(null);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [save, setSave] = useState<Save | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<ItemKind>("furniture");
  const [lookup, setLookup] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [ticker, setTicker] = useState<Ticker | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Floors stack oldest hold on top, so the penthouse is literally the top floor.
  const sorted = useMemo(
    () => [...floors].sort((a, b) => (a.heldSince ?? Infinity) - (b.heldSince ?? Infinity)),
    [floors],
  );
  const rate = useMemo(() => towerRate(sorted, now), [sorted, now]);
  const sel = sorted.find((f) => f.mint === selected) ?? null;

  const open = useCallback(async (addr: string | null) => {
    setError(null);
    setOwner(addr);
    setSave(loadSave(addr));
    if (!addr) {
      const d = demoFloors(Date.now());
      setFloors(d);
      setSelected(d[d.length - 1].mint);
      return;
    }
    setLoading(true);
    setFloors([]);
    try {
      const res = await fetch(`/api/tower?owner=${addr}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "something broke");
      setFloors(json.floors);
      const top = [...(json.floors as Floor[])].sort((a, b) => (a.heldSince ?? Infinity) - (b.heldSince ?? Infinity))[0];
      setSelected(top?.mint ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  // Start on the demo tower; reconnect silently if Phantom already trusts the site.
  useEffect(() => {
    open(null);
    const p = provider();
    p?.connect({ onlyIfTrusted: true })
      .then((r) => open(r.publicKey.toString()))
      .catch(() => {});
  }, [open]);

  // House coin ticker straight from DexScreener.
  useEffect(() => {
    const load = () =>
      fetch(`https://api.dexscreener.com/tokens/v1/solana/${HOUSE_MINT}`)
        .then((r) => r.json())
        .then((pairs: { baseToken: { symbol: string }; priceUsd?: string; marketCap?: number; fdv?: number; priceChange?: { h24?: number } }[]) => {
          const p = pairs?.[0];
          if (!p) return setTicker({ symbol: "TOWER", price: null, mcap: null, change: null });
          setTicker({
            symbol: p.baseToken.symbol,
            price: p.priceUsd ? Number(p.priceUsd) : null,
            mcap: p.marketCap ?? p.fdv ?? null,
            change: p.priceChange?.h24 ?? null,
          });
        })
        .catch(() => setTicker({ symbol: "TOWER", price: null, mcap: null, change: null }));
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, []);

  // The cash clock: citizens earn every second, offline time is credited on load.
  useEffect(() => {
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      // Hold off until floors are in, so offline time is credited at the real rate.
      if (!sorted.length) return;
      setSave((s) => (s ? { ...s, cash: s.cash + earned(towerRate(sorted, t), s.lastTick, t), lastTick: t } : s));
    }, 1000);
    return () => clearInterval(id);
  }, [sorted]);

  useEffect(() => {
    if (!save) return;
    try {
      localStorage.setItem(saveKey(owner), JSON.stringify(save));
    } catch {}
  }, [save, owner]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(id);
  }, [toast]);

  async function connect() {
    const p = provider();
    if (!p) {
      window.open("https://phantom.app/", "_blank", "noopener");
      return;
    }
    try {
      const r = await p.connect();
      open(r.publicKey.toString());
    } catch {
      setToast("wallet said no");
    }
  }

  async function disconnect() {
    await provider()?.disconnect?.().catch(() => {});
    open(null);
  }

  function buy(id: string) {
    if (!save || !sel) return;
    const item = itemById(id)!;
    const r = buyAndPlace(save, item, sel.mint, tierFor(sel.heldSince, now));
    if (!r.ok) return setToast(r.reason);
    setSave(r.save);
    setToast(save.owned.includes(id) ? `${item.name} moved in` : `bought ${item.name}`);
  }

  const selTier = sel ? tierFor(sel.heldSince, now) : 0;
  const placement = sel && save ? save.placed[sel.mint] : undefined;
  const nextMs = sel ? msToNextTier(sel.heldSince, now) : null;
  const holdsHouse = sorted.some((f) => f.isHouse);

  return (
    <>
      <header className="nav">
        <a className="logo" href="#">
          <span className="logo-mark" aria-hidden />
          <span className="pixel">pump tower</span>
        </a>
        <nav className="nav-links">
          <a href="#how">[how it works]</a>
          <a href="#shop">[shop]</a>
          <a href={`https://pump.fun/coin/${HOUSE_MINT}`} target="_blank" rel="noreferrer">
            [pump.fun]
          </a>
        </nav>
        {owner ? (
          <button className="btn ghost" onClick={disconnect}>
            {shortAddr(owner)}
          </button>
        ) : (
          <button className="btn" onClick={connect}>
            connect wallet
          </button>
        )}
      </header>

      <div className="ticker">
        <div className="ticker-track">
          {Array.from({ length: 2 }).map((_, k) => (
            <span key={k} className="ticker-run">
              <span className="live" /> ${ticker?.symbol ?? "TOWER"} {fmtUsd(ticker?.price ?? null)}
              <span className={ticker?.change != null && ticker.change < 0 ? "red" : "green"}>
                {ticker?.change != null ? ` ${ticker.change > 0 ? "+" : ""}${ticker.change.toFixed(1)}%` : ""}
              </span>
              <i>mcap {fmtUsd(ticker?.mcap ?? null)}</i>
              <i>bare walls on day zero</i>
              <i>penthouse at thirty days</i>
              <i>house coin floor earns triple</i>
              <i>paper hands sleep on concrete</i>
            </span>
          ))}
        </div>
      </div>

      <main className="board">
        <section className="tower-col">
          <div className="tower-head">
            <div>
              <h1 className="pixel title">your bags are a building</h1>
              <p className="dim">hold longer, live higher. every token is a floor and the clock never lies.</p>
            </div>
            <form
              className="lookup"
              onSubmit={(e) => {
                e.preventDefault();
                if (lookup.trim()) open(lookup.trim());
              }}
            >
              <input value={lookup} onChange={(e) => setLookup(e.target.value)} placeholder="peek at any wallet address" spellCheck={false} />
              <button className="btn small" type="submit">
                visit
              </button>
            </form>
          </div>
          {!owner && (
            <div className="banner">
              <span className="pixel green">demo tower</span>
              <span className="dim">connect a wallet to move your own bags in</span>
            </div>
          )}
          {loading && <div className="banner pixel blink">reading the chain…</div>}
          {error && (
            <div className="banner red">
              {error} <button className="link" onClick={() => open(owner)}>retry</button>
            </div>
          )}
          <TowerView floors={loading ? [] : sorted} placed={save?.placed ?? {}} selected={selected} onSelect={setSelected} />
        </section>

        <aside className="side">
          <div className="panel stats">
            <div className="stat">
              <span className="label">01 cash</span>
              <span className="pixel big green">${fmtCash(save?.cash ?? 0)}</span>
            </div>
            <div className="stat">
              <span className="label">02 per hour</span>
              <span className="pixel">${fmtCash(rate)}</span>
            </div>
            <div className="stat">
              <span className="label">03 floors</span>
              <span className="pixel">{sorted.length}</span>
            </div>
            <div className="stat">
              <span className="label">04 citizens</span>
              <span className="pixel">{sorted.reduce((n, f) => n + citizensFor(tierFor(f.heldSince, now)), 0)}</span>
            </div>
          </div>

          {!holdsHouse && owner && !loading && (
            <a className="panel house-cta" href={`https://pump.fun/coin/${HOUSE_MINT}`} target="_blank" rel="noreferrer">
              <span className="pixel green">no house coin floor yet</span>
              <span className="dim">the house coin floor earns triple cash. grab some on pump.fun and its floor moves in.</span>
            </a>
          )}

          {sel ? (
            <div className="panel floor-card">
              <div className="floor-title">
                <span className="pixel">${sel.symbol.toUpperCase()}</span>
                {sel.isHouse && <span className="chip">house coin</span>}
              </div>
              <div className="rows">
                <span>tier</span>
                <span className="green">{TIERS[selTier].name}</span>
                <span>held</span>
                <span>{sel.heldSince ? `${daysHeld(sel.heldSince, now).toFixed(1)} days` : "unknown"}</span>
                <span>next</span>
                <span>{nextMs == null ? "top of the world" : `${TIERS[selTier + 1].name} in ${fmtWait(nextMs)}`}</span>
                <span>earning</span>
                <span>${fmtCash(floorRate(selTier, sel.isHouse))}/hr</span>
                {sel.usd != null && (
                  <>
                    <span>bag</span>
                    <span>{fmtUsd(sel.usd)}</span>
                  </>
                )}
              </div>
              {placement && placement.furniture.length > 0 && (
                <div className="placed">
                  {placement.furniture.map((id) => (
                    <button key={id} className="chip" title="move out" onClick={() => save && setSave(removeFurniture(save, sel.mint, id))}>
                      {itemById(id)?.name} ×
                    </button>
                  ))}
                </div>
              )}
              <p className="dim tiny">sell it and the clock starts over. that is the whole game.</p>
            </div>
          ) : (
            <div className="panel dim">tap a floor to manage it</div>
          )}

          <div className="panel shop" id="shop">
            <div className="tabs">
              {(["furniture", "pet", "outfit"] as ItemKind[]).map((k) => (
                <button key={k} className={tab === k ? "tab on" : "tab"} onClick={() => setTab(k)}>
                  {k === "pet" ? "pets" : k === "outfit" ? "outfits" : k}
                </button>
              ))}
            </div>
            <p className="dim tiny">
              {tab === "furniture"
                ? `up to ${MAX_FURNITURE} pieces per floor`
                : tab === "pet"
                  ? "one pet per floor, it follows the citizens around"
                  : "dresses every citizen on the floor"}
            </p>
            <ul className="items">
              {ITEMS.filter((i) => i.kind === tab).map((i) => {
                const locked = selTier < i.minTier;
                const owned = save?.owned.includes(i.id);
                const equipped =
                  placement && (placement.furniture.includes(i.id) || placement.pet === i.id || placement.outfit === i.id);
                const broke = !owned && (save?.cash ?? 0) < i.price;
                return (
                  <li key={i.id} className={locked ? "item locked" : "item"}>
                    <span className="item-name">{i.name}</span>
                    <span className="item-req">{locked ? `${TIERS[i.minTier].minDays}d hold` : TIERS[i.minTier].name}</span>
                    <button className="btn small" disabled={!sel || locked || !!equipped || broke} onClick={() => buy(i.id)}>
                      {equipped ? "placed" : owned ? "place" : locked ? "locked" : `$${fmtCash(i.price)}`}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>
      </main>

      <section className="how" id="how">
        <h2 className="pixel">how it works</h2>
        <div className="how-grid">
          <div className="lore">
            <p>
              Every token in your wallet is a floor. The clock starts the moment that token first lands in your wallet. Day zero is bare
              concrete and a flickering bulb. Hold a day and you get a studio. Three days, an apartment. A week, a loft. Two weeks, a suite.
              Thirty days and you are in the penthouse, at the very top, because the longest hold always lives highest.
            </p>
            <p>
              Citizens move in as a floor gets nicer, and every one of them earns cash around the clock. Fancier floors earn more. The house
              coin floor earns triple. Close the tab for a day and the tower keeps counting.
            </p>
            <p>
              Spend cash on furniture, pets and outfits. The best pieces only unlock on floors you have held long enough. You cannot buy
              your way into the penthouse. You have to sit in it.
            </p>
          </div>
          <TierLadder />
        </div>
      </section>

      <section className="ca-block">
        <span className="label">contract address</span>
        <button
          className="ca"
          onClick={() => {
            navigator.clipboard?.writeText(HOUSE_MINT).then(() => setCopied(true));
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          <span className="ca-full">{HOUSE_MINT}</span>
          <span className="ca-short">{shortAddr(HOUSE_MINT)}</span>
          <span className="pixel green">{copied ? "copied" : "copy"}</span>
        </button>
        <a className="btn" href={`https://pump.fun/coin/${HOUSE_MINT}`} target="_blank" rel="noreferrer">
          buy on pump.fun
        </a>
      </section>

      <footer className="foot dim tiny">
        pump tower only reads your wallet. it never asks you to sign anything and cannot move your tokens. cash and items live in this
        browser for now.
      </footer>

      {toast && <div className="toast pixel">{toast}</div>}
    </>
  );
}
