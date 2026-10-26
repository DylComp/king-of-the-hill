"use client";
// King of the Hill: every squad in pump.fun's Squad Invitational has a fan coin. Each hour the
// squad whose members bank the most SOL (read on chain) is King, and its holders split the pot.
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Reign, Squad } from "@/lib/king/model";
import { HOLDERS_BPS, POT_BPS, squadSlug } from "@/lib/king/model";
import { ago, fmtSol, fmtUsd } from "./CoinCard";
import SiteNav, { type Brand } from "./SiteNav";
import { useMe } from "./useMe";

export type BoardSquad = Squad & { coin: { mint: string; ticker: string; image: string | null; members: number; mcapUsd?: number | null; volUsd?: number | null } | null };
export type KingData = {
  board: { takenAt: number; wallets: number };
  squads: BoardSquad[];
  coins: number;
  pot: { lamports: string; hourStart: number; nextCrown: number };
  endsAt: number;
  reigns: (Omit<Reign, "payouts"> & { payouts: number })[];
};

export const KING_BRAND: Brand = { name: "king of the hill", href: "/", logo: "/king-logo.png" };

export const sol = (lamports: string | number | bigint) => Number(lamports) / 1e9;
export const pumpCoin = (mint: string) => `https://pump.fun/coin/${mint}`;
export const signed = (n: number) => `${n < 0 ? "-" : "+"}${fmtUsd(Math.abs(n))}`;
/** SOL with a sign, or a dash for squads that aren't tracked. */
export const solSigned = (n: number | null | undefined) => (n == null ? "--" : `${n < 0 ? "-" : "+"}${fmtSol(Math.abs(n))}`);

export function useKing<T>(url: string, every = 10_000) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let on = true;
    const load = async () => {
      if (document.hidden) return;
      try {
        const r = await fetch(url, { cache: "no-store" });
        const j = await r.json();
        if (!r.ok) throw Error(j.error ?? "couldn't load");
        if (on) (setData(j), setError(null));
      } catch (e) {
        if (on) setError((e as Error).message);
      }
    };
    void load();
    const id = setInterval(load, every);
    return () => ((on = false), clearInterval(id));
  }, [url, every]);
  return { data, error };
}

export function useClock() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export const countdown = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  return d ? `${d}d ${h}h ${m}m` : `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

export function SquadPic({ src, name, size = 36 }: { src: string | null; name: string; size?: number }) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) return <span className="kq-pic fallback" style={{ width: size, height: size }} aria-hidden>{name.slice(0, 1).toUpperCase()}</span>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="kq-pic" src={src} alt="" width={size} height={size} loading="lazy" onError={() => setBroken(true)} />;
}

export function Crown({ size = 16 }: { size?: number }) {
  return (
    <svg className="kq-crown" width={size} height={size} viewBox="0 0 8 8" shapeRendering="crispEdges" aria-hidden>
      <path d="M0 2h1v1h1v1h1V2h2v2h1V3h1V2h1v5H0z" fill="currentColor" />
      <path d="M0 6h8v1H0z" fill="#03100a" opacity=".35" />
    </svg>
  );
}

type TrackingData = {mode:string;board:{wallets:number;initializedWallets:number};squads:BoardSquad[];crowns:{hour:string;squad:string|null;gainSol:number;provisional:boolean}[]};
export default function King() {
 const wallet=useMe();const {data,error}=useKing<TrackingData>("/api/king",30_000);const [query,setQuery]=useState("");
 const squads=data?.squads.filter(s=>s.name.toLowerCase().includes(query.toLowerCase()))??[];
 return <><SiteNav wallet={wallet} active="/king" brand={KING_BRAND}/><main><section className="sec">
 <div className="sec-head"><span className="kicker">king of the hill / squad tracker</span><h1 className="pixel display sm">all squads. one crown.</h1>
 <p className="lede">Follow all 100 squads in pump.fun’s Squad Invitational. The squad whose members bank the most SOL from trading takes the hourly crown.</p>
 <p className="dim">Wallet tracking only. No squad tokens, automatic launches, holder payouts or buybacks.</p>
 <p className="dim">{data?`${data.board.initializedWallets} / ${data.board.wallets} wallets initialized` : "Loading tracker"}. New squads count from their first scan; figures update as the scanner rotates through wallets.</p></div>
 {error&&<p role="status">{error}</p>}
 <label>Find a squad <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="squad name" /></label>
 <div style={{overflowX:"auto",marginTop:24}}><table style={{width:"100%",textAlign:"left"}}><thead><tr><th>Squad</th><th>This hour · SOL</th><th>Last hour · SOL</th><th>Members</th></tr></thead><tbody>
 {squads.map(s=><tr key={s.groupId}><td style={{padding:"12px 8px"}}><Link href={`/king/${encodeURIComponent(squadSlug(s.name))}`}>{s.name}</Link></td><td>{solSigned(s.bankedHour)}</td><td>{solSigned(s.bankedLast)}</td><td>{s.members}</td></tr>)}
 </tbody></table></div>
 <div className="sec-head" style={{marginTop:40}}><h2 className="pixel">hourly crowns</h2><p className="dim">Crowns begin after the first full hour of the all-squad tracker. Crowns are leaderboard recognition, not cash rewards.</p></div>
 {data?.crowns.map(c=><p key={c.hour}>{c.hour} · {c.squad??"No positive trading result"} · {solSigned(c.gainSol)} SOL {c.provisional?"(partial scan coverage)":""}</p>)}
 </section></main></>;
}
