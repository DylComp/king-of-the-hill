"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  HOUSE_MINT,
  CASH_PER_SOL,
  ITEMS,
  floorLevel,
  holderRewardsLive,
  rewardCash,
  MAX_FURNITURE,
  TIERS,
  type Floor,
  type SkylineRow,
  type Streak,
  ACHIEVEMENTS,
  HOUSE_SYMBOL,
  achievementsOf,
  canCollect,
  emptyStreak,
  liveStreak,
  msToNextCollect,
  nextStreakDay,
  streakReward,
  tokenFloors,
  DEMO_BONUS,
  WALLET_BONUS,
  type ItemKind,
  type Save,
  buyAndPlace,
  cashOf,
  citizensFor,
  daysHeld,
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
import City from "./City";
import { DOCS, DOCS_INTRO } from "@/lib/howto";
import Logo from "./Logo";
import HoverText from "./HoverText";
import Reveal from "./Reveal";
import Boot from "./Boot";
import ItemIcon from "./ItemIcon";

const DAY = 86_400_000;


function demoFloors(now: number): Floor[] {
  const f = (symbol: string, days: number, usd: number, change24: number | null, isHouse = false): Floor => ({
    mint: isHouse && HOUSE_MINT ? HOUSE_MINT : `demo${symbol}`,
    symbol,
    name: symbol,
    image: null,
    amount: 0,
    usd,
    change24,
    heldSince: now - days * DAY,
    isHouse,
  });
  return [
    f("BLOOP", 44, 26_400, 31.2),
    f(HOUSE_SYMBOL, 33, 4_200, 18.4, true),
    f("GRUNT", 18, 12_500, -3.1),
    f("NOODL", 9, 860, 27.5),
    f("MOGGY", 4, 140, -22.8),
    f("SLURP", 1.4, 48, 5.2),
    f("ZAP", 0.1, 12, null),
  ];
}

type Coin = { symbol: string; price: number | null; mcap: number | null; change: number | null };

type PhantomLike = {
  connect: (o?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toString(): string } }>;
  disconnect?: () => Promise<void>;
  signMessage?: (msg: Uint8Array, display?: string) => Promise<{ signature: Uint8Array } | Uint8Array>;
};

async function post<T>(url: string, data?: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data ?? {}) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "something broke");
  return json as T;
}

type Skyline = {
  rows: SkylineRow[];
  total: number;
  season?: { n: number; ends: number; rows: (SkylineRow & { points: number })[]; total: number };
};

function provider(): PhantomLike | null {
  const w = window as unknown as { phantom?: { solana?: PhantomLike }; solana?: PhantomLike; solflare?: PhantomLike };
  return w.phantom?.solana ?? w.solana ?? w.solflare ?? null;
}

const saveKey = (owner: string | null) => `pumptower:v2:${owner ?? "demo"}`;

function loadSave(owner: string | null): Save {
  try {
    const raw = localStorage.getItem(saveKey(owner));
    if (raw) {
      const s = JSON.parse(raw) as Save;
      return { owned: s.owned ?? [], placed: s.placed ?? {} };
    }
  } catch {}
  return emptySave();
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

const KIND_LABEL: Record<ItemKind, string> = { furniture: "furniture", pet: "pets", outfit: "outfits" };
const KINDS: ItemKind[] = ["furniture", "pet", "outfit"];

export default function Game() {
  const [owner, setOwner] = useState<string | null>(null);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [save, setSave] = useState<Save>(emptySave);
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<ItemKind>("furniture");
  const [lookup, setLookup] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [coin, setCoin] = useState<Coin | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [db, setDb] = useState(false);
  const [me, setMe] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [board, setBoard] = useState<Skyline | null>(null);
  const [boardTab, setBoardTab] = useState<"season" | "all">("season");
  const [streak, setStreak] = useState<Streak>(emptyStreak);
  const [rewardsSol, setRewardsSol] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dbRef = useRef(false);
  const loadedFor = useRef<string | null>(null);
  // Without a database (or on the demo) the browser keeps the save; otherwise the server owns it.
  const local = !owner || !db;
  const canEdit = local || owner === me;

  // Floors stack oldest hold on top, so the penthouse is literally the top floor.
  const sorted = useMemo(
    () => [...floors].sort((a, b) => (a.heldSince ?? Infinity) - (b.heldSince ?? Infinity)),
    [floors],
  );
  const rate = useMemo(() => towerRate(sorted, now), [sorted, now]);
  const cash = cashOf(sorted, save.owned, owner ? WALLET_BONUS + streak.total + rewardCash(rewardsSol) : DEMO_BONUS, now);
  const sel = sorted.find((f) => f.mint === selected) ?? null;
  const citizens = sorted.reduce((n, f) => n + citizensFor(tierFor(f.heldSince, now)), 0);
  const longest = sorted[0] ? daysHeld(sorted[0].heldSince, now) : 0;

  const loadBoard = useCallback(() => {
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((j: Skyline & { db: boolean }) => j.db && setBoard(j))
      .catch(() => {});
  }, []);

  const open = useCallback(async (addr: string | null) => {
    setError(null);
    setOwner(addr);
    if (addr && dbRef.current) {
      setSave(emptySave());
      setStreak(emptyStreak());
      setRewardsSol(0);
      fetch(`/api/save?w=${addr}`)
        .then((r) => r.json())
        .then((j: { save: Save | null; streak: Streak | null; rewardsSol?: number }) => {
          if (j.save) setSave(j.save);
          if (j.streak) setStreak(j.streak);
          setRewardsSol(j.rewardsSol ?? 0);
        })
        .catch(() => {});
    } else {
      loadedFor.current = addr ?? "demo";
      setSave(loadSave(addr));
      setStreak(emptyStreak());
      setRewardsSol(0);
    }
    const url = new URL(window.location.href);
    if (addr) url.searchParams.set("w", addr);
    else url.searchParams.delete("w");
    window.history.replaceState(null, "", url);
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
      const fl = json.floors as Floor[];
      setFloors(fl);
      const top = [...fl].sort((a, b) => (a.heldSince ?? Infinity) - (b.heldSince ?? Infinity))[0];
      setSelected(top?.mint ?? null);
      if (dbRef.current) loadBoard();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [loadBoard]);

  // Start on a shared tower if the link has one, else the demo; reconnect silently if Phantom already trusts us.
  useEffect(() => {
    (async () => {
      const session = await fetch("/api/me")
        .then((r) => r.json() as Promise<{ db: boolean; wallet: string | null }>)
        .catch(() => ({ db: false, wallet: null }));
      dbRef.current = session.db;
      setDb(session.db);
      setMe(session.wallet);
      if (session.db) loadBoard();
      const shared = new URL(window.location.href).searchParams.get("w");
      if (shared || session.wallet) return open(shared ?? session.wallet);
      open(null);
      provider()
        ?.connect({ onlyIfTrusted: true })
        .then((r) => open(r.publicKey.toString()))
        .catch(() => {});
    })();
  }, [open, loadBoard]);

  useEffect(() => {
    if (!HOUSE_MINT) return; // pre-launch: nothing to price yet
    const load = () =>
      fetch(`https://api.dexscreener.com/tokens/v1/solana/${HOUSE_MINT}`)
        .then((r) => r.json())
        .then((pairs: { baseToken: { symbol: string }; priceUsd?: string; marketCap?: number; fdv?: number; priceChange?: { h24?: number } }[]) => {
          const p = pairs?.[0];
          if (!p) return setCoin(null);
          setCoin({
            symbol: p.baseToken.symbol,
            price: p.priceUsd ? Number(p.priceUsd) : null,
            mcap: p.marketCap ?? p.fdv ?? null,
            change: p.priceChange?.h24 ?? null,
          });
        })
        .catch(() => setCoin(null));
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, []);

  // Cash is derived from hold time, so the clock only needs to tick.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    // Don't write until this wallet's save has been read, or the empty first render wipes it.
    if (!local || loadedFor.current !== (owner ?? "demo")) return;
    try {
      localStorage.setItem(saveKey(owner), JSON.stringify(save));
    } catch {}
  }, [save, owner, local]);

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
    let addr: string;
    try {
      addr = (await p.connect()).publicKey.toString();
    } catch {
      return setToast("wallet said no");
    }
    if (dbRef.current && addr !== me) await signIn(addr);
    open(addr);
  }

  /** Prove wallet ownership with a free message signature so purchases follow you to any device. */
  async function signIn(addr: string) {
    const p = provider();
    if (!p?.signMessage) return setToast("this wallet can't sign messages");
    try {
      const { message } = await post<{ message: string }>("/api/auth/nonce", { wallet: addr });
      const out = await p.signMessage(new TextEncoder().encode(message), "utf8");
      const sig = out instanceof Uint8Array ? out : out.signature;
      await post("/api/auth/verify", { wallet: addr, signature: btoa(String.fromCharCode(...sig)) });
      setMe(addr);
      setToast("signed in");
    } catch (e) {
      setToast(e instanceof Error && !/reject|denied|cancel/i.test(e.message) ? e.message : "sign in skipped, view only");
    }
  }

  async function disconnect() {
    await provider()?.disconnect?.().catch(() => {});
    if (me) await post("/api/auth/logout").catch(() => {});
    setMe(null);
    open(null);
  }

  async function buy(id: string) {
    if (!sel || busy) return;
    const item = itemById(id)!;
    const owned = save.owned.includes(id);
    if (local) {
      const r = buyAndPlace(save, item, sel.mint, tierFor(sel.heldSince, now), cash);
      if (!r.ok) return setToast(r.reason);
      setSave(r.save);
    } else {
      setBusy(true);
      try {
        setSave((await post<{ save: Save }>("/api/buy", { item: id, mint: sel.mint })).save);
      } catch (e) {
        return setToast(e instanceof Error ? e.message : "could not buy");
      } finally {
        setBusy(false);
      }
    }
    setToast(owned ? `${item.name} moved in` : `bought ${item.name}`);
  }

  async function checkIn() {
    setBusy(true);
    try {
      const r = await post<{ streak: Streak; reward: number; points: number }>("/api/checkin");
      setStreak(r.streak);
      setToast(`+$${r.reward} rent bonus, day ${r.streak.n}`);
      loadBoard();
    } catch (e) {
      setToast(e instanceof Error ? e.message : "could not collect");
    } finally {
      setBusy(false);
    }
  }

  async function moveOut(mint: string, id: string) {
    if (local) return setSave(removeFurniture(save, mint, id));
    setBusy(true);
    try {
      setSave((await post<{ save: Save }>("/api/remove", { item: id, mint })).save);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "could not move it");
    } finally {
      setBusy(false);
    }
  }

  // Share links use whichever domain the visitor is on.
  const site = typeof window === "undefined" ? "" : window.location.origin;
  const shareUrl = owner ? `${site}/?w=${owner}` : site;
  const shareText = owner
    ? `my bags are a ${sorted.length} floor building with ${citizens} citizens. longest hold: ${Math.floor(longest)} days. what does yours look like`
    : "your solana bags become a pixel skyscraper. hold longer, live higher.";

  function savePng() {
    const c = canvasRef.current;
    if (!c) return;
    try {
      c.toBlob((b) => {
        if (!b) return setToast("could not save image");
        const a = document.createElement("a");
        a.href = URL.createObjectURL(b);
        a.download = "pump-tower.png";
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      });
    } catch {
      setToast("a token logo blocked the export");
    }
  }

  const selTier = sel ? tierFor(sel.heldSince, now) : 0;
  const placement = sel ? save.placed[sel.mint] : undefined;
  const nextMs = sel ? msToNextTier(sel.heldSince, now) : null;
  const progress =
    !sel || nextMs == null ? 1 : Math.min(1, Math.max(0, 1 - nextMs / ((TIERS[selTier + 1].minDays - TIERS[selTier].minDays) * DAY)));
  const holdsHouse = sorted.some((f) => f.isHouse);
  const launched = coin != null;
  const pumpUrl = HOUSE_MINT ? `https://pump.fun/coin/${HOUSE_MINT}` : "https://pump.fun";
  const empty = !!owner && !loading && !error && tokenFloors(sorted).length === 0;
  const earned = achievementsOf(sorted, save, streak, !!owner && owner === me, now);
  const streakNow = liveStreak(streak, now);
  const nextDay = nextStreakDay(streak, now);
  const seasonLeft = board?.season ? Math.max(0, board.season.ends - now) : 0;

  return (
    <>
      <Boot />

      <header className="nav">
        <a className="brand" href="#tower">
          <Logo size={30} />
          <HoverText text="pump tower" className="pixel brand-word" />
        </a>
        <nav className="nav-links">
          {[
            ["#tower", "tower"],
            ["#city", "city"],
            ["#skyline", "skyline"],
            ["#ladder", "ladder"],
            ["#catalog", "catalog"],
            ["#coin", "coin"],
            ["#how", "how it works"],
          ].map(([href, label]) => (
            <a key={href} href={href}>
              <HoverText text={label} />
            </a>
          ))}
        </nav>
        {me ? (
          <button className="btn ghost" onClick={disconnect} title="sign out">
            {shortAddr(me)}
          </button>
        ) : owner && !db ? (
          <button className="btn ghost" onClick={disconnect}>
            {shortAddr(owner)}
          </button>
        ) : (
          <button className="btn" onClick={connect}>
            connect wallet
          </button>
        )}
      </header>

      <main>
        <Reveal id="tower" className="sec">
          <div className="sec-head">
            <span className="kicker">01 / the tower</span>
            <HoverText as="h1" text="your bags are a building" className="pixel display" />
            <HoverText as="p" by="word" className="lede" text="Every token you hold is a floor. Hold longer, live higher. The clock never lies." />
          </div>

          <div className="toolbar">
            <form
              className="lookup"
              onSubmit={(e) => {
                e.preventDefault();
                if (lookup.trim()) open(lookup.trim());
              }}
            >
              <input value={lookup} onChange={(e) => setLookup(e.target.value)} placeholder="visit any wallet address" spellCheck={false} />
              <button className="btn small" type="submit">
                visit
              </button>
            </form>
            <div className="share">
              <a
                className="btn small ghost"
                target="_blank"
                rel="noreferrer"
                href={`https://x.com/intent/post?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`}
              >
                share on x
              </a>
              <button className="btn small ghost" onClick={() => navigator.clipboard?.writeText(shareUrl).then(() => setToast("link copied"))}>
                copy link
              </button>
              <button className="btn small ghost" onClick={savePng}>
                save png
              </button>
            </div>
          </div>

          <div className="board">
            <div className="tower-col">
              <div className="tower-bar">
                {owner ? (
                  <span className="dim">
                    {owner === me ? "your tower " : "tower of "}
                    <span className="green">{shortAddr(owner)}</span>
                    {owner === me && <span className="chip live">saved to cloud</span>}
                  </span>
                ) : (
                  <span className="dim">
                    <span className="green">demo tower</span> connect a wallet to move your bags in
                  </span>
                )}
                {loading && <span className="pixel blink tiny-pixel">reading the chain</span>}
                {error && (
                  <span className="red">
                    {error}{" "}
                    <button className="link" onClick={() => open(owner)}>
                      retry
                    </button>
                  </span>
                )}
              </div>
              <TowerView
                floors={loading ? [] : sorted}
                placed={save.placed}
                selected={selected}
                onSelect={setSelected}
                onCanvas={(c) => (canvasRef.current = c)}
                rewardsSol={holderRewardsLive() && owner ? rewardsSol : null}
                houseLive={launched}
              />
            </div>

            <aside className="side">
              <div className="panel stats">
                <div className="stat wide">
                  <span className="label">cash</span>
                  <span className="pixel big green">${fmtCash(cash)}</span>
                </div>
                <div className="stat">
                  <span className="label">per hour</span>
                  <span className="pixel">${fmtCash(rate)}</span>
                </div>
                <div className="stat">
                  <span className="label">floors</span>
                  <span className="pixel">{sorted.length}</span>
                </div>
                <div className="stat">
                  <span className="label">citizens</span>
                  <span className="pixel">{citizens}</span>
                </div>
                {owner && owner === me && (
                  <div className="stat wide checkin">
                    <span className="label">
                      daily rent bonus{streakNow > 0 && <span className="green"> · {streakNow} day streak</span>}
                    </span>
                    {canCollect(streak, now) ? (
                      <button className="btn small" disabled={busy} onClick={checkIn}>
                        collect +${streakReward(nextDay)}
                      </button>
                    ) : (
                      <span className="dim">next bonus in {fmtWait(msToNextCollect(now))}</span>
                    )}
                  </div>
                )}
              </div>

              {empty && (
                <div className="panel house-cta">
                  <span className="pixel green tiny-pixel">empty lot</span>
                  <span className="dim">
                    No bags big enough for a floor yet. Any listed coin worth $0.50 or more moves in as a floor
                    {launched ? `, and $${HOUSE_SYMBOL} floors pay triple.` : `, and $${HOUSE_SYMBOL} floors will pay triple once it launches.`}
                  </span>
                  {owner !== me && db && (
                    <button className="btn small" onClick={connect}>
                      sign in for a free resident floor
                    </button>
                  )}
                </div>
              )}

              {!holdsHouse && owner && !loading && !empty && (
                launched ? (
                  <a className="panel house-cta" href={pumpUrl} target="_blank" rel="noreferrer">
                    <span className="pixel green tiny-pixel">no ${HOUSE_SYMBOL} floor</span>
                    <span className="dim">A ${HOUSE_SYMBOL} floor earns triple rent. Pick some up on pump.fun and it moves in.</span>
                  </a>
                ) : (
                  <div className="panel house-cta">
                    <span className="pixel green tiny-pixel">${HOUSE_SYMBOL} launches soon</span>
                    <span className="dim">When it does, holding it adds a neon floor that earns triple rent.</span>
                  </div>
                )
              )}

              {sel ? (
                <div className="panel floor-card">
                  <div className="floor-title">
                    <span className="pixel">${sel.symbol.toUpperCase()}</span>
                    {sel.isHouse && <span className="chip">${HOUSE_SYMBOL} x3</span>}
                  </div>
                  <div className="tier-row">
                    <span className="green">{TIERS[selTier].name}</span>
                    <span className="dim">{nextMs == null ? "top of the world" : `${TIERS[selTier + 1].name} in ${fmtWait(nextMs)}`}</span>
                  </div>
                  <div className="meter">
                    <span style={{ width: `${progress * 100}%` }} />
                  </div>
                  <div className="rows">
                    <span>held</span>
                    <span>{sel.heldSince ? `${daysHeld(sel.heldSince, now).toFixed(1)} days` : "unknown"}</span>
                    <span>earning</span>
                    <span>${fmtCash(floorRate(selTier, sel.isHouse))}/hr</span>
                    <span>level</span>
                    <span>lv {floorLevel(sel.usd, sel.heldSince, now)}</span>
                    {sel.change24 != null && (
                      <>
                        <span>24h</span>
                        <span className={sel.change24 < 0 ? "red" : "green"}>
                          {sel.change24 > 0 ? "+" : ""}
                          {sel.change24.toFixed(1)}%
                        </span>
                      </>
                    )}
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
                        <button key={id} className="chip" title="move out" disabled={!canEdit || busy} onClick={() => moveOut(sel.mint, id)}>
                          {itemById(id)?.name} x
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="panel dim">Tap a floor to manage it.</div>
              )}

              {owner && (
                <div className="panel">
                  <div className="label badges-head">
                    achievements <span className="green">{earned.size}/{ACHIEVEMENTS.length}</span>
                  </div>
                  <div className="badges">
                    {ACHIEVEMENTS.map((a) => (
                      <span key={a.id} className={earned.has(a.id) ? "badge on" : "badge"} title={a.hint}>
                        {a.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {!canEdit && (
                <div className="panel visit-note">
                  <span className="dim">You're visiting. Only the owner can decorate this tower.</span>
                  {me ? (
                    <button className="btn small ghost" onClick={() => open(me)}>
                      back to my tower
                    </button>
                  ) : (
                    <button className="btn small" onClick={connect}>
                      sign in with wallet
                    </button>
                  )}
                </div>
              )}

              <div className="panel shop">
                <div className="tabs">
                  {KINDS.map((k) => (
                    <button key={k} className={tab === k ? "tab on" : "tab"} onClick={() => setTab(k)}>
                      {KIND_LABEL[k]}
                    </button>
                  ))}
                </div>
                <p className="dim tiny">
                  {tab === "furniture"
                    ? `Up to ${MAX_FURNITURE} pieces per floor.`
                    : tab === "pet"
                      ? "One pet per floor. It follows the citizens around."
                      : "Dresses every citizen on the floor."}
                </p>
                <ul className="items">
                  {ITEMS.filter((i) => i.kind === tab).map((i) => {
                    const locked = selTier < i.minTier;
                    const owned = save.owned.includes(i.id);
                    const equipped =
                      placement && (placement.furniture.includes(i.id) || placement.pet === i.id || placement.outfit === i.id);
                    const broke = !owned && cash < i.price;
                    return (
                      <li key={i.id} className={locked ? "item locked" : "item"}>
                        <ItemIcon id={i.id} kind={i.kind} size={32} />
                        <span className="item-name">{i.name}</span>
                        <span className="item-req">{locked ? `${TIERS[i.minTier].minDays}d hold` : owned ? "owned" : ""}</span>
                        <button className="btn small" disabled={!canEdit || busy || !sel || locked || !!equipped || broke} onClick={() => buy(i.id)}>
                          {equipped ? "placed" : owned ? "place" : locked ? "locked" : `$${fmtCash(i.price)}`}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </aside>
          </div>
        </Reveal>

        <Reveal id="city" className="sec">
          <div className="sec-head">
            <span className="kicker">02 / the city</span>
            <HoverText as="h2" text="everyone's towers, one skyline" className="pixel display sm" />
            <HoverText
              as="p"
              by="word"
              className="lede"
              text="Every ranked tower in Pump Tower, side by side. Green floors hold $PTWR, gold floors are penthouses. Tap any building to walk in."
            />
          </div>
          <City
            me={me}
            onVisit={(w) => {
              open(w);
              document.getElementById("tower")?.scrollIntoView({ behavior: "smooth" });
            }}
          />
        </Reveal>

        <Reveal id="skyline" className="sec">
          <div className="sec-head">
            <span className="kicker">03 / the skyline</span>
            <HoverText as="h2" text="the tallest rent in the city" className="pixel display sm" />
            <HoverText
              as="p"
              by="word"
              className="lede"
              text="Check in every day to bank a full day of your tower's rent as season points. Seasons reset every week. All time ranks by rent per hour."
            />
          </div>
          {board && (
            <div className="tabs sky-tabs">
              <button className={boardTab === "season" ? "tab on" : "tab"} onClick={() => setBoardTab("season")}>
                season {board.season?.n ?? 1}
              </button>
              <button className={boardTab === "all" ? "tab on" : "tab"} onClick={() => setBoardTab("all")}>
                all time
              </button>
              {boardTab === "season" && board.season && <span className="dim sky-ends">ends in {fmtWait(seasonLeft)}</span>}
            </div>
          )}
          {board && boardTab === "season" ? (
            board.season && board.season.rows.length > 0 ? (
              <div className="sky">
                <div className="sky-row sky-head">
                  <span>#</span>
                  <span>tower</span>
                  <span className="hide-sm">top floor</span>
                  <span>floors</span>
                  <span className="hide-sm">citizens</span>
                  <span>longest</span>
                  <span>points</span>
                </div>
                {board.season.rows.map((r, i) => (
                  <button
                    key={r.wallet}
                    className={`sky-row${r.wallet === owner ? " me" : ""}${i < 3 ? " podium" : ""}`}
                    onClick={() => {
                      open(r.wallet);
                      document.getElementById("tower")?.scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    <span className="pixel rank">{i + 1}</span>
                    <span className="green">
                      {shortAddr(r.wallet)}
                      {r.house && <span className="chip">{HOUSE_SYMBOL}</span>}
                    </span>
                    <span className="hide-sm">{r.top === "RESIDENT" ? r.top : `$${r.top.toUpperCase()}`}</span>
                    <span>{r.floors}</span>
                    <span className="hide-sm">{r.citizens}</span>
                    <span>{Math.floor(r.longest)}d</span>
                    <span className="pixel green">{fmtCash(r.points)}</span>
                  </button>
                ))}
                <p className="dim tiny sky-foot">{board.season.total} towers checked in this season. Tap one to visit.</p>
              </div>
            ) : (
              <div className="panel dim">Nobody has checked in this season yet. Sign in and collect your daily bonus to take first place.</div>
            )
          ) : board && board.rows.length > 0 ? (
            <div className="sky">
              <div className="sky-row sky-head">
                <span>#</span>
                <span>tower</span>
                <span className="hide-sm">top floor</span>
                <span>floors</span>
                <span className="hide-sm">citizens</span>
                <span>longest</span>
                <span>rent</span>
              </div>
              {board.rows.map((r, i) => (
                <button
                  key={r.wallet}
                  className={`sky-row${r.wallet === owner ? " me" : ""}${i < 3 ? " podium" : ""}`}
                  onClick={() => {
                    open(r.wallet);
                    document.getElementById("tower")?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  <span className="pixel rank">{i + 1}</span>
                  <span className="green">
                    {shortAddr(r.wallet)}
                    {r.house && <span className="chip">{HOUSE_SYMBOL}</span>}
                  </span>
                  <span className="hide-sm">{r.top === "RESIDENT" ? r.top : `$${r.top.toUpperCase()}`}</span>
                  <span>{r.floors}</span>
                  <span className="hide-sm">{r.citizens}</span>
                  <span>{Math.floor(r.longest)}d</span>
                  <span className="pixel green">${fmtCash(r.rate)}/hr</span>
                </button>
              ))}
              <p className="dim tiny sky-foot">{board.total} towers in the city. Tap one to visit.</p>
            </div>
          ) : (
            <div className="panel dim">{db ? "The skyline is empty. Connect a wallet to build the first tower." : "The skyline opens soon."}</div>
          )}
        </Reveal>

        <Reveal id="ladder" className="sec">
          <div className="sec-head">
            <span className="kicker">04 / the ladder</span>
            <HoverText as="h2" text="hold longer, live higher" className="pixel display sm" />
          </div>
          <div className="how-grid">
            <div className="lore">
              <HoverText
                as="p"
                by="word"
                text="Every token in your wallet is a floor. The clock starts the moment the bag lands, and it starts over if you sell it all. Day zero is bare concrete and a flickering bulb. A day gets you a studio, three an apartment, a week a loft, two weeks a suite."
              />
              <HoverText as="p" by="word" text="Thirty days and you move into the penthouse at the very top, because the longest hold always lives highest." />
              <HoverText
                as="p"
                by="word"
                text="Citizens move in as a floor gets nicer and pay rent every hour. Fancier floors pay more. Your cash is worked out from your hold time on chain, so nobody can fake it and nobody can buy their way up. You have to sit in it."
              />
            </div>
            <TierLadder />
          </div>
        </Reveal>

        <Reveal id="catalog" className="sec">
          <div className="sec-head">
            <span className="kicker">05 / the catalog</span>
            <HoverText as="h2" text="the good stuff waits for diamond hands" className="pixel display sm" />
            <HoverText
              as="p"
              by="word"
              className="lede"
              text="Furniture, pets and outfits unlock per floor by how long that floor has been held. Buy once, place it anywhere it qualifies."
            />
          </div>
          {KINDS.map((k) => (
            <div key={k} className="cat-group">
              <div className="cat-label">{KIND_LABEL[k]}</div>
              <div className="cat-grid">
                {ITEMS.filter((i) => i.kind === k).map((i) => (
                  <div key={i.id} className={`cat-card t${i.minTier}`}>
                    <ItemIcon id={i.id} kind={i.kind} size={56} />
                    <span className="cat-name">{i.name}</span>
                    <span className="cat-meta">
                      <span className="green">${fmtCash(i.price)}</span>
                      <span className="dim">{TIERS[i.minTier].name}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </Reveal>

        <Reveal id="coin" className="sec coin">
          <div className="sec-head center">
            <span className="kicker">06 / ${HOUSE_SYMBOL}</span>
            <HoverText as="h2" text="the floor that pays triple" className="pixel display sm" />
            <HoverText
              as="p"
              by="word"
              className="lede"
              text={`Hold $${HOUSE_SYMBOL} and it gets its own neon trimmed floor in your tower, paying three times the rent of any other bag.${launched ? "" : " Launching on pump.fun soon."}`}
            />
          </div>
          <div className="reward-steps">
            <div className="panel tile">
              <span className="pixel green tiny-pixel">01 hold</span>
              <span className="dim">${HOUSE_SYMBOL} launches on pump.fun with holder rewards switched on. Every holder with $20 or more gets paid.</span>
            </div>
            <div className="panel tile">
              <span className="pixel green tiny-pixel">02 get paid sol</span>
              <span className="dim">pump.fun sends SOL from trading fees straight to holders' wallets, several times an hour. No claiming.</span>
            </div>
            <div className="panel tile">
              <span className="pixel green tiny-pixel">03 spend it here too</span>
              <span className="dim">
                Every SOL you are paid also lands in the tower as ${fmtCash(CASH_PER_SOL)} cash for furniture, pets and outfits. Your real SOL stays yours.
              </span>
            </div>
          </div>
          {owner && holderRewardsLive() && (
            <div className="panel reward-live">
              <span className="label">paid to this wallet</span>
              <span className="pixel gold">{rewardsSol.toFixed(4)} SOL</span>
              <span className="green">+${fmtCash(rewardCash(rewardsSol))} tower cash</span>
            </div>
          )}
          <div className="coin-tiles">
            <div className="panel tile">
              <span className="label">price</span>
              <span className="pixel">{fmtUsd(coin?.price ?? null)}</span>
            </div>
            <div className="panel tile">
              <span className="label">market cap</span>
              <span className="pixel">{fmtUsd(coin?.mcap ?? null)}</span>
            </div>
            <div className="panel tile">
              <span className="label">24h</span>
              <span className={`pixel ${coin?.change != null && coin.change < 0 ? "red" : "green"}`}>
                {coin?.change != null ? `${coin.change > 0 ? "+" : ""}${coin.change.toFixed(1)}%` : "soon"}
              </span>
            </div>
          </div>
          <div className="ca-row">
            {HOUSE_MINT ? (
              <button
                className="ca"
                onClick={() => {
                  navigator.clipboard?.writeText(HOUSE_MINT!).then(() => setCopied(true));
                  setTimeout(() => setCopied(false), 1500);
                }}
              >
                <span className="label">ca</span>
                <span className="ca-full">{HOUSE_MINT}</span>
                <span className="ca-short">{shortAddr(HOUSE_MINT)}</span>
                <span className="pixel green tiny-pixel">{copied ? "copied" : "copy"}</span>
              </button>
            ) : (
              <div className="ca">
                <span className="label">ca</span>
                <span className="dim">drops on launch day, right here</span>
              </div>
            )}
            {launched ? (
              <a className="btn" href={pumpUrl} target="_blank" rel="noreferrer">
                buy ${HOUSE_SYMBOL} on pump.fun
              </a>
            ) : (
              <span className="btn ghost soon">launching soon</span>
            )}
          </div>
        </Reveal>

        <Reveal id="how" className="sec">
          <div className="sec-head">
            <span className="kicker">07 / how it works</span>
            <HoverText as="h2" text="the docs" className="pixel display sm" />
          </div>
          <p className="docs-intro">{DOCS_INTRO}</p>
          <div className="docs">
            {DOCS.map((d) => (
              <section key={d.id} className="panel doc">
                <h3 className="pixel green tiny-pixel">{d.title}</h3>
                <p className="dim doc-sum">{d.summary}</p>
                <dl>
                  {d.items.map(([k, v]) => (
                    <div key={k} className="doc-row">
                      <dt>{k}</dt>
                      <dd className="dim">{v}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>
        </Reveal>
      </main>

      <footer className="foot">
        <Logo size={22} />
        <span className="dim tiny">
          Pump Tower only reads your wallet. Signing in is a free message signature, never a transaction, and it cannot move your tokens.
          {db ? " Purchases are saved to your wallet and follow you to any device." : " Items you place are saved in this browser."}
        </span>
      </footer>

      {toast && <div className="toast pixel">{toast}</div>}
    </>
  );
}
