"use client";
import Link from "next/link";
import SquadAvatar from "./SquadAvatar";
import { useEffect, useState } from "react";
import type { Squad } from "@/lib/king/model";
import { squadSlug } from "@/lib/king/model";
import { DOCS, DOCS_INTRO } from "@/lib/howto";
import SiteNav, { type Brand } from "./SiteNav";
import { useMe } from "./useMe";
import KingParticipation from "./KingParticipation";
import type {publicState} from "@/lib/king-token/store";

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
 const {data:token,error:tokenError}=useKing<{mint:string|null;status:string;worker:ReturnType<typeof publicState>}>("/api/king/token",30_000);
 const wallet=useMe();const {data,error}=useKing<TrackingData>("/api/king",30_000);const [query,setQuery]=useState("");
 const squads=data?.squads.filter(s=>s.name.toLowerCase().includes(query.trim().toLowerCase()))??[];
 return <><SiteNav wallet={wallet} active="/" brand={KING_BRAND}/><main><section className="sec">
 <div className="sec-head"><span className="kicker">KING / squad competition</span><h1 className="pixel display sm">one token. back your king.</h1>
 <p className="lede">One KING token powers a competition across all 100 squads. The current wallet tracker measures cash flow; it does not mirror Pump’s official squad standings. Official standings integration must be verified before rewards activate.</p>
 <p className="dim">KING creator fees fund the original split: 40% to the winning squad, 40% to KING holders who backed it, and 20% to buy and burn KING.</p>
 <p className="dim">{data?`${data.board.initializedWallets} / ${data.board.wallets} wallets initialized` : "Loading tracker"}. New squads count from their first scan; figures update as the scanner rotates through wallets.</p></div>
 <div className="panel"><strong className="green">{!token?'Loading KING status':token.status==='awaiting_mint'?'PRELAUNCH — KING has not launched':token.status==='configured_paused'?'KING configured — activation checks pending':'KING rewards enabled'}</strong><p>{token?.mint?<>Official KING mint: <span style={{overflowWrap:'anywhere'}}>{token.mint}</span></>:"The tracker is live. Fee collection, paid rounds and buy-and-burn remain inactive until the official KING mint is configured and verified."}</p></div>
 <div className="king-split"><div><strong>40%</strong><span>winning squad</span></div><div><strong>40%</strong><span>eligible KING supporters</span></div><div><strong>20%</strong><span>buy & burn KING</span></div></div>
 {(error||tokenError)&&<p role="status">{error??tokenError}</p>}
 <div className="squad-board-toolbar"><div><span className="kicker">the competition</span><h2 className="pixel">tracked wallet cash flow</h2></div><div className="squad-field board-search"><label htmlFor="squad-search">Find a squad</label><div className="squad-search-wrap"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg><input id="squad-search" type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search by squad name" autoComplete="off"/></div><span className="field-hint" role="status">{data?`${squads.length} of ${data.squads.length} squads`:'Loading squads…'}</span></div></div>
 <div className="panel" role="note"><strong>Official standings are not connected.</strong><p>This table is sorted by current-hour wallet cash flow, not Pump profit or competition rank. It excludes trading history before tracking began and does not calculate cost basis. Do not use it as a mirror of Pump’s leaderboard.</p><a href="https://pump.fun/leaderboard?tab=squads" target="_blank" rel="noreferrer">View official Pump squad standings ↗</a></div><div style={{overflowX:"auto",marginTop:24}}><table style={{width:"100%",textAlign:"left"}}><thead><tr><th>Squad</th><th>This hour · SOL</th><th>Last hour · SOL</th><th>Tracked total · SOL</th><th>Members</th></tr></thead><tbody>
 {squads.map(s=><tr key={s.groupId}><td style={{padding:"12px 8px"}}><Link className="squad-identity" href={`/king/${encodeURIComponent(squadSlug(s.name))}`}><SquadAvatar src={s.image} name={s.name}/><span>{s.name}<small>{s.struck?"Disqualified":"View squad & members"}</small></span></Link></td><td>{solSigned(s.bankedHour)}</td><td>{solSigned(s.bankedLast)}</td><td>{solSigned(s.bankedTotal)}</td><td>{s.members}</td></tr>)}
 </tbody></table></div>
 {data && !squads.length && <p>No squads match your search.</p>}
 <div id="crowns" className="sec-head" style={{marginTop:40}}><h2 className="pixel">tracker hour results</h2><p className="dim">Historical results from our independent cash-flow tracker, not official Pump competition results. Partial scan coverage is marked.</p></div>
 {data?.crowns.map(c=><p key={c.hour}>{c.hour} · {c.squad??"No positive trading result"} · {solSigned(c.gainSol)} SOL {c.provisional?"(partial scan coverage)":""}</p>)}
 {data && !data.crowns.length && <p className="dim">The first crown appears after a complete tracking hour.</p>}
 </section><KingParticipation wallet={wallet} squads={data?.squads??[]}/>
 <section id="rewards" className="sec"><h2 className="pixel">payouts & KING burns</h2><p className="dim">Only finalized transaction receipts count as paid. These records belong to the single KING system.</p>
 {!token?.worker?.rounds.length&&<p>No KING reward rounds yet. Rewards begin after launch and the first complete snapshot hour.</p>}
 {token?.worker?.rounds.map(r=><article className="panel" key={r.hour}><h3>{new Date(r.hour).toLocaleString()} · {r.squad??'Awaiting winner'}</h3><p>{r.status} · {(Number(r.feesLamports)/1e9).toFixed(6)} SOL collected · {r.payouts.length} allocations</p><p>Squad: {(Number(r.allocations?.squad??0)/1e9).toFixed(6)} SOL · Supporters: {(Number(r.allocations?.supporters??0)/1e9).toFixed(6)} SOL · KING buy-and-burn: {(Number(r.burnLamports??0)/1e9).toFixed(6)} SOL</p>{r.signatures.map(sig=><p key={sig}><a href={`https://solscan.io/tx/${sig}`} target="_blank" rel="noreferrer">Finalized receipt ↗</a></p>)}</article>)}
 </section><section id="docs" className="sec"><h2 className="pixel">how it works</h2><p className="lede">{DOCS_INTRO}</p>{DOCS.map(section=><div key={section.id}><h3>{section.title}</h3><p>{section.summary}</p><dl>{section.items.map(([title,body])=><div key={title}><dt className="green">{title}</dt><dd>{body}</dd></div>)}</dl></div>)}</section></main></>;
}
