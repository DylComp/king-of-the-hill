"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Squad } from "@/lib/king/model";
import { squadSlug } from "@/lib/king/model";
import { DOCS, DOCS_INTRO } from "@/lib/howto";
import SiteNav, { type Brand } from "./SiteNav";
import { useMe } from "./useMe";

export type BoardSquad = Squad;
const fmtSol = (n: number) => n >= 100 ? n.toFixed(0) : n >= 1 ? n.toFixed(2) : n.toFixed(4);

export const KING_BRAND: Brand = { name: "king of the hill", href: "/", logo: "/king-logo.png" };

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

type TrackingData = {mode:string;board:{wallets:number;initializedWallets:number};squads:BoardSquad[];crowns:{hour:string;squad:string|null;gainSol:number;provisional:boolean}[]};
export default function King() {
 const wallet=useMe();const {data,error}=useKing<TrackingData>("/api/king",30_000);const [query,setQuery]=useState("");
 const squads=data?.squads.filter(s=>s.name.toLowerCase().includes(query.toLowerCase()))??[];
 return <><SiteNav wallet={wallet} active="/" brand={KING_BRAND}/><main><section className="sec">
 <div className="sec-head"><span className="kicker">king of the hill / squad tracker</span><h1 className="pixel display sm">all squads. one crown.</h1>
 <p className="lede">Follow all 100 squads in pump.fun’s Squad Invitational. The squad whose members bank the most SOL from trading takes the hourly crown.</p>
 <p className="dim">Live standings from on-chain trading activity. Free to follow; no wallet connection required.</p>
 <p className="dim">{data?`${data.board.initializedWallets} / ${data.board.wallets} wallets initialized` : "Loading tracker"}. New squads count from their first scan; figures update as the scanner rotates through wallets.</p></div>
 {error&&<p role="status">{error}</p>}
 <label>Find a squad <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="squad name" /></label>
 <div style={{overflowX:"auto",marginTop:24}}><table style={{width:"100%",textAlign:"left"}}><thead><tr><th>Squad</th><th>This hour · SOL</th><th>Last hour · SOL</th><th>Members</th></tr></thead><tbody>
 {squads.map(s=><tr key={s.groupId}><td style={{padding:"12px 8px"}}><Link href={`/king/${encodeURIComponent(squadSlug(s.name))}`}>{s.name}</Link></td><td>{solSigned(s.bankedHour)}</td><td>{solSigned(s.bankedLast)}</td><td>{s.members}</td></tr>)}
 </tbody></table></div>
 {data && !squads.length && <p>No squads match your search.</p>}
 <div id="crowns" className="sec-head" style={{marginTop:40}}><h2 className="pixel">hourly crowns</h2><p className="dim">Each hourly crown recognizes the best positive squad trading result. Partial scan coverage is marked.</p></div>
 {data?.crowns.map(c=><p key={c.hour}>{c.hour} · {c.squad??"No positive trading result"} · {solSigned(c.gainSol)} SOL {c.provisional?"(partial scan coverage)":""}</p>)}
 {data && !data.crowns.length && <p className="dim">The first crown appears after a complete tracking hour.</p>}
 </section><section id="docs" className="sec"><h2 className="pixel">how it works</h2><p className="lede">{DOCS_INTRO}</p>{DOCS.map(section=><div key={section.id}><h3>{section.title}</h3><p>{section.summary}</p><dl>{section.items.map(([title,body])=><div key={title}><dt className="green">{title}</dt><dd>{body}</dd></div>)}</dl></div>)}</section></main></>;
}
