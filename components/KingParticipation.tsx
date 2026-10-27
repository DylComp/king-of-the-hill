"use client";
import {useEffect,useState} from 'react';
import type {useMe} from './useMe';
import {post,provider,toB64} from './wallet';
import type {Backing} from '@/lib/king-token/model';
type Choice={groupId:string;name:string;struck:boolean};
export default function KingParticipation({wallet,squads}:{wallet:ReturnType<typeof useMe>;squads:Choice[]}){
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
 return <section id="back" className="sec"><span className="kicker">one KING token · choose your squad</span><h2 className="pixel">back the next king</h2><p>Hold KING and back a squad. If it wins, eligible supporters share 40% of the hourly fee pot in proportion to their snapshot holdings.</p><p className="dim">Selection uses a free wallet message, never a deposit. You can select ahead of launch; reward eligibility starts only once KING is live and snapshots begin.</p>
 {backing&&<p>Your selection: <strong>{name??'Selected squad'}</strong>{backing.eligibleAt>Date.now()?` · eligible after ${new Date(backing.eligibleAt).toLocaleString()}`:''}</p>}
 <label htmlFor="back-squad">Choose a squad</label>{' '}<select id="back-squad" value={selected} onChange={e=>setSelected(e.target.value)} style={{maxWidth:'100%'}}><option value="">Select a squad</option>{squads.filter(s=>!s.struck).map(s=><option key={s.groupId} value={s.groupId}>{s.name}</option>)}</select>{' '}
 <button className="btn" disabled={busy||!selected} onClick={()=>void submit('back')}>{busy?'awaiting signature…':wallet.me?'sign squad selection':'connect and back'}</button>
 {wallet.me&&memberGroups.includes(selected)&&<button className="btn ghost" disabled={busy} onClick={()=>void submit('register')}>register my squad payout wallet</button>}
 <p className="dim">Switching squads starts a one-hour eligibility cooldown. Selling KING removes you from that hour’s supporter pot. Outgoing token transfers are treated as reductions too, so moving tokens cannot bypass the check.</p>
 {note&&<p role="status">{note}</p>}</section>;
}
