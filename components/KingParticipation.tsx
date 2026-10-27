"use client";
import {useEffect,useState} from 'react';
import type {useMe} from './useMe';
import {post,provider,toB64} from './wallet';
import type {Backing} from '@/lib/king-token/model';
type Choice={groupId:string;name:string;struck:boolean};
export default function KingParticipation({wallet,squads}:{wallet:ReturnType<typeof useMe>;squads:Choice[]}){
 const [query,setQuery]=useState('');
 const [selected,setSelected]=useState(''),[backing,setBacking]=useState<Backing|null>(null),[memberGroups,setMemberGroups]=useState<string[]>([]),[note,setNote]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{let on=true;setBacking(null);setMemberGroups([]);if(wallet.me)fetch('/api/king/participation',{cache:'no-store'}).then(r=>r.json()).then(d=>{if(on){setBacking(d.backing);setSelected(d.backing?.groupId??'');setMemberGroups(d.memberGroups??[]);}}).catch(()=>{if(on)setNote('Could not load your selection. Try again.');});return()=>{on=false;};},[wallet.me]);
 async function submit(action:'back'|'register'){
  if(!selected)return;setBusy(true);setNote('');
  try{const address=wallet.me??await wallet.connect();if(!address)return;const p=provider();if(!p?.signMessage)throw Error('Your wallet needs message signing.');
   const c=await post<{nonce:string;message:string}>('/api/king/participation',{groupId:selected,action});
   const out=await p.signMessage(new TextEncoder().encode(c.message),'utf8');const signature=toB64(out instanceof Uint8Array?out:out.signature);
   const r=await post<{backing?:Backing}>('/api/king/participation',{nonce:c.nonce,signature});if(r.backing)setBacking(r.backing);
   setNote(action==='register'?'Your member payout wallet is registered.':'Squad selection saved. Eligibility is checked against the hourly KING snapshot.');
  }catch(e){setNote(e instanceof Error?e.message:'Selection could not be saved.');}finally{setBusy(false);}
 }
 const name=squads.find(s=>s.groupId===backing?.groupId)?.name;
 const available=squads.filter(s=>!s.struck);
 const matches=available.filter(s=>s.name.toLowerCase().includes(query.trim().toLowerCase()));
 const selectedSquad=available.find(s=>s.groupId===selected);
 const options=selectedSquad&&!matches.some(s=>s.groupId===selected)?[selectedSquad,...matches]:matches;
 return <section id="back" className="sec">
 <div className="back-panel">
 <div className="back-intro"><span className="kicker">one KING token · choose your squad</span><h2 className="pixel">back the next king</h2><p>Pick your squad. Hold KING. Share the win.</p><p className="dim">Eligible supporters of the winning squad share 40% of the hourly fee pot, weighted by their KING holdings.</p><span className="back-message-badge">Free wallet signature · no deposit</span></div>
 <div className="back-controls">
 {backing&&<div className="back-current"><span className="kicker">currently backing</span><strong>{name??'Selected squad'}</strong>{backing.eligibleAt>Date.now()&&<span className="dim">Eligible after {new Date(backing.eligibleAt).toLocaleString()}</span>}</div>}
 <div className="squad-field"><label htmlFor="back-search">Find your squad</label><div className="squad-search-wrap"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg><input id="back-search" type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search by squad name" autoComplete="off" aria-describedby="back-results"/></div><span id="back-results" className="field-hint" role="status">{squads.length===0?'Loading squads…':matches.length===0?'No squads found. Try another name.':`${matches.length} squad${matches.length===1?'':'s'} available`}</span></div>
 <div className="squad-field"><label htmlFor="back-squad">Your squad</label><div className="squad-select-wrap"><select id="back-squad" value={selected} disabled={busy||!available.length} onChange={e=>{setSelected(e.target.value);setNote('');}}><option value="">Select a squad</option>{options.map(s=><option key={s.groupId} value={s.groupId}>{s.name}</option>)}</select><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></div></div>
 <button className="btn back-submit" disabled={busy||!selected} onClick={()=>void submit('back')}>{busy?'Awaiting wallet signature…':wallet.me?'Confirm squad backing':'Connect & back squad'}<span aria-hidden="true">↗</span></button>
 <p className="field-hint">{selectedSquad?<>You’re choosing <strong>{selectedSquad.name}</strong>. Confirm with a free wallet signature.</>:'Choose a squad above to continue.'}</p>
 {wallet.me&&memberGroups.includes(selected)&&<button className="btn ghost back-register" disabled={busy} onClick={()=>void submit('register')}>Register my squad payout wallet</button>}
 {note&&<p className="back-feedback" role="status">{note}</p>}
 </div>
 <div className="back-rules"><p>You can choose before launch. Rewards start once KING is live and snapshots begin.</p><p>Switching starts a one-hour cooldown. Selling or transferring KING out removes eligibility for that hour.</p></div>
 </div></section>;
}
