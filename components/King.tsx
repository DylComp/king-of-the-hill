"use client";
import Link from "next/link";
import SquadAvatar from "./SquadAvatar";
import OfficialStandings from "./OfficialStandings";
import { useEffect, useState } from "react";
import type { Squad } from "@/lib/king/model";
import { squadSlug } from "@/lib/king/model";
import { DOCS, DOCS_INTRO } from "@/lib/howto";
import SiteNav, { type Brand } from "./SiteNav";
import { useMe } from "./useMe";
import KingParticipation from "./KingParticipation";
import KingBoot from "./KingBoot";
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

type TrackingData = {mode:string;diagnosticsStatus:string;board:{wallets:number;initializedWallets:number|null};squads:BoardSquad[];crowns:{hour:string;squad:string|null;gainSol:number;provisional:boolean}[]};
export default function King() {
 const {data:token,error:tokenError}=useKing<{mint:string|null;status:string;ledgerAvailable:boolean;worker:ReturnType<typeof publicState>}>("/api/king/token",30_000);
 const wallet=useMe();const {data,error}=useKing<TrackingData>("/api/king",30_000);const [query,setQuery]=useState("");
 const squads=data?.squads.filter(s=>s.name.toLowerCase().includes(query.trim().toLowerCase()))??[];
 return <><KingBoot ready={!!data||!!error} names={data?.squads.map(s=>s.name)}/><SiteNav wallet={wallet} active="/" brand={KING_BRAND}/><main><section className="sec">
 <div className="sec-head"><span className="kicker">KOTH / squad competition</span><h1 className="pixel display sm">one token. back your king.</h1>
 <p className="lede">One KOTH token powers 30-minute rewards across all ranked squads. The live board displays Pump’s top 100 through a public mirror. Rewards remain paused until the feed and 30-minute winner selection are verified.</p>
 <p className="dim">KOTH creator fees fund the original split: 40% to the winning squad, 40% to KOTH holders who backed it, and 20% to proportional SOL airdrops to KOTH holders over $1.</p>
 <p className="dim">{data?.diagnosticsStatus==='unavailable'?"Wallet diagnostics are temporarily unavailable; live standings are shown below":data?`${data.board.initializedWallets} / ${data.board.wallets} wallets initialized` : "Loading tracker"}. New squads count from their first scan; figures update as the scanner rotates through wallets.</p></div>
 <div className="panel"><strong className="green">{!token?'Loading KOTH status':token.status==='awaiting_mint'?'PRELAUNCH — KOTH has not launched':token.status==='configured_paused'?'KOTH configured — activation checks pending':'KOTH rewards enabled'}</strong><p>{token?.mint?<>Official KOTH mint: <span style={{overflowWrap:'anywhere'}}>{token.mint}</span></>:"The tracker is live. Fee collection, paid rounds and holder airdrops remain inactive until the official KOTH mint is configured and verified."}</p></div>
 <div className="king-split"><div><strong>40%</strong><span>winning squad</span></div><div><strong>40%</strong><span>eligible KOTH supporters</span></div><div><strong>20%</strong><span>KOTH holders over $1</span></div></div>
 {(error||tokenError)&&<p role="status">{error??tokenError}</p>}
 <OfficialStandings/>
 <details className="squad-directory"><summary>Competition roster snapshot · browse squad profiles</summary><p className="dim">Historical roster, not live rankings. These profile pages contain separately labeled wallet-tracker diagnostics.</p><div className="squad-field board-search"><label htmlFor="squad-search">Find a squad in the roster</label><div className="squad-search-wrap"><input id="squad-search" type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search squad names"/></div></div><div className="directory-grid">{squads.map(s=><Link key={s.groupId} className="squad-identity" href={`/king/${encodeURIComponent(squadSlug(s.name))}`}><SquadAvatar src={s.image} name={s.name}/><span>{s.name}<small>{s.members} members in snapshot</small></span></Link>)}</div></details>
 <div className="panel"><strong>30-minute winners: verification pending</strong><p>Historical wallet cash-flow results are not used as proof of official 30-minute winners. No KOTH payouts are enabled.</p></div>
 </section><KingParticipation wallet={wallet} squads={data?.squads??[]}/>
 <section id="rewards" className="sec"><h2 className="pixel">payouts & holder airdrops</h2><p className="dim">Only finalized transaction receipts count as paid. These records belong to the single KOTH system.</p>
 {token?.ledgerAvailable===false?<p role="status">Reward records are temporarily unavailable. Payouts remain disabled pending verification.</p>:!token?.worker?.rounds.length&&<p>No KOTH reward rounds yet. Rewards begin after launch and the first complete 30-minute snapshot round.</p>}
 {token?.worker?.rounds.map(r=><article className="panel" key={r.hour}><h3>{new Date(r.hour).toLocaleString()} · {r.squad??'Awaiting winner'}</h3><p>{r.status} · {(Number(r.feesLamports)/1e9).toFixed(6)} SOL collected · {r.payouts.length} allocations</p><p>Squad: {(Number(r.allocations?.squad??0)/1e9).toFixed(6)} SOL · Supporters: {(Number(r.allocations?.supporters??0)/1e9).toFixed(6)} SOL · holder SOL airdrops: {(Number(r.allocations?.holders??0)/1e9).toFixed(6)} SOL</p>{r.signatures.map(sig=><p key={sig}><a href={`https://solscan.io/tx/${sig}`} target="_blank" rel="noreferrer">Finalized receipt ↗</a></p>)}</article>)}
 </section><section id="docs" className="sec"><h2 className="pixel">how it works</h2><p className="lede">{DOCS_INTRO}</p>{DOCS.map(section=><div key={section.id}><h3>{section.title}</h3><p>{section.summary}</p><dl>{section.items.map(([title,body])=><div key={title}><dt className="green">{title}</dt><dd>{body}</dd></div>)}</dl></div>)}</section></main></>;
}
