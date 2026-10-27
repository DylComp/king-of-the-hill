import type {PumpBoard} from './model';
import {ROUND} from '../king-token/model.ts';
// Source scoring cutoff, not request time, defines each half-hour boundary.
export function roundCandidate(start:PumpBoard,end:PumpBoard,at:number){
 for(const [b,boundary] of [[start,at],[end,at+ROUND]] as const){
  if(!Number.isSafeInteger(at)||at%ROUND!==0||b.endSec!==boundary/1000||!Number.isFinite(b.builtAtMs)||b.builtAtMs!<boundary||b.builtAtMs!>boundary+60000)throw Error('round_boundaries_unverified');
  if(b.totalRanked<1||b.entries.length!==b.totalRanked)throw Error('round_incomplete_coverage');
 }
 if(start.windowStartSec!==end.windowStartSec||start.totalRanked!==end.totalRanked)throw Error('round_coverage_changed');
 const rows=(b:PumpBoard)=>{const m=new Map<string,{pnl:number;members:number}>();for(const r of b.entries){const id=r.participantId??r.groupId;if(!id||m.has(id)||!Number.isFinite(r.pnlUsd))throw Error('round_invalid_identity_or_score');m.set(id,{pnl:r.pnlUsd,members:r.memberCount});}return m;};
 const a=rows(start),b=rows(end),gains:{participantId:string;gainUsd:number}[]=[];
 for(const [id,r] of a){const next=b.get(id);if(!next||r.members!==next.members)throw Error('round_roster_changed');const gainUsd=next.pnl-r.pnl;if(!Number.isFinite(gainUsd))throw Error('round_invalid_gain');gains.push({participantId:id,gainUsd});}
 gains.sort((x,y)=>y.gainUsd-x.gainUsd||x.participantId.localeCompare(y.participantId));
 const best=gains[0],tied=best&&gains.filter(x=>x.gainUsd===best.gainUsd).length>1;
 return {start:at,end:at+ROUND,rule:'largest_30m_pnl_gain' as const,verified:false as const,candidate:best&&best.gainUsd>0&&!tied?best:null,reason:!best||best.gainUsd<=0?'no_positive_gain':tied?'tie_requires_resolution':'candidate_requires_source_and_roster_verification'};
}
