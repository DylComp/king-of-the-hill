"use client";
import Link from "next/link";
import {useState} from "react";
import KingBoot from "./KingBoot";
import SiteNav from "./SiteNav";
import SquadAvatar from "./SquadAvatar";
import KingParticipation from "./KingParticipation";
import {useMe} from "./useMe";
import {useKing,solSigned,KING_BRAND,type BoardSquad} from "./King";
type MemberStats={wallet:string;username:string|null;role:string;image:string|null;followers:number|null;x:string|null;balanceSol:number|null;bankedHour:number|null;bankedLast:number|null;bankedTotal:number|null;statsSince:number|null;lastScannedAt:number|null};
const short=(w:string)=>`${w.slice(0,5)}…${w.slice(-5)}`;
const time=(n:number|null)=>n?new Date(n).toLocaleString():"Awaiting scan";
export default function KingSquad({name}:{name:string}) {
 const [query,setQuery]=useState('');const wallet=useMe();
 const {data,error}=useKing<{squad:BoardSquad;members:MemberStats[];asOf:number;crowns:{hour:string;gainSol:number;provisional:boolean}[]}>(`/api/king/squad?name=${encodeURIComponent(name)}`,60_000);
 const members=data?.members.filter(m=>`${m.username??''} ${m.wallet}`.toLowerCase().includes(query.trim().toLowerCase()))??[];
 return <><KingBoot ready={!!data||!!error}/><SiteNav wallet={wallet} brand={KING_BRAND}/><main><section className="sec"><Link href="/">← all squads</Link>
 <div className="squad-profile-head"><SquadAvatar src={data?.squad.image??null} name={data?.squad.name??name} size={88}/><div><span className="kicker">squad profile · {data?.squad.struck?'disqualified':'KOTH competition'}</span><h1 className="pixel display sm">{data?.squad.name??name}</h1><p className="dim">{data?`${data.squad.members} members · roster from competition snapshot`:'Loading squad details…'}</p></div></div>
 {error&&<p role="status">Could not refresh squad details. {error}</p>}
 <p className="lede">Back this squad with KOTH. Winning squads receive 40% of the fee pot; eligible supporters share 40%; 20% buys and burns KOTH.</p>
 {data&&<><div className="squad-stat-grid">{[['This hour',solSigned(data.squad.bankedHour)+' SOL'],['Last hour',solSigned(data.squad.bankedLast)+' SOL'],['Tracked total',solSigned(data.squad.bankedTotal)+' SOL'],['Crowns · recent 48',String(data.crowns.length)]].map(([label,value])=><div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
 <p className="field-hint">These are independent wallet cash-flow figures, not Pump standings, portfolio value or realized profit. Tracking starts at each wallet’s first scan. Incomplete scans can delay figures.</p>
 <div className="squad-board-toolbar"><div><span className="kicker">the roster</span><h2 className="pixel">members & wallets</h2></div><div className="squad-field board-search"><label htmlFor="member-search">Find a member</label><div className="squad-search-wrap"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg><input id="member-search" type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Name or wallet address"/></div></div></div>
 <p className="dim">Current SOL balances and public Pump profiles. Individual trading totals accumulate from the member-stats update; they do not reconstruct the squad’s earlier history.</p>
 <div className="squad-member-grid">{members.map(m=><article className="squad-member" key={m.wallet}><div className="squad-identity"><SquadAvatar src={m.image} name={m.username??short(m.wallet)} size={52}/><div><h3>{m.username??short(m.wallet)}</h3><span className="member-role">{m.role==='OWNER'?'Squad creator':'Member'}</span></div></div>
 <a className="member-address" href={`https://solscan.io/account/${m.wallet}`} target="_blank" rel="noreferrer" title={m.wallet}>{m.wallet} ↗</a>
 <dl className="member-metrics"><div><dt>SOL balance</dt><dd>{m.balanceSol==null?'Unavailable':m.balanceSol.toFixed(4)}</dd></div><div><dt>This hour · SOL</dt><dd>{solSigned(m.bankedHour)}</dd></div><div><dt>Last hour · SOL</dt><dd>{solSigned(m.bankedLast)}</dd></div><div><dt>Tracked total · SOL</dt><dd>{solSigned(m.bankedTotal)}</dd></div></dl>
 <div className="member-links"><a href={`https://pump.fun/profile/${m.wallet}`} target="_blank" rel="noreferrer">Pump profile ↗</a><a href={`https://solscan.io/account/${m.wallet}`} target="_blank" rel="noreferrer">Wallet activity ↗</a>{m.x&&<a href={`https://x.com/${m.x}`} target="_blank" rel="noreferrer">X ↗</a>}</div>
 {m.followers!=null&&<p className="field-hint">{m.followers.toLocaleString()} Pump followers</p>}<p className="field-hint">Last scan: {time(m.lastScannedAt)}{m.lastScannedAt&&Date.now()-m.lastScannedAt>20*60_000?' · delayed':''}<br/>Member stats since: {time(m.statsSince)}</p></article>)}</div>
 {!members.length&&<p role="status">No members match your search.</p>}
 <p className="field-hint">Data fetched {time(data.asOf)}. A dash means individual stats have not started; unavailable balances and missing profile pictures are not treated as zero.</p>
 <h2 className="pixel">tracker hour results</h2>{data.crowns.length?data.crowns.map(c=><div className="squad-crown" key={c.hour}><time>{c.hour}</time><strong>{solSigned(c.gainSol)} SOL</strong><span>{c.provisional?'Partial scan coverage':'Complete scan coverage'}</span></div>):<p className="dim">No crowns in the tracker’s most recent 48 results.</p>}</>}
 </section>{data&&<KingParticipation wallet={wallet} squads={[data.squad]}/>}</main></>;
}
