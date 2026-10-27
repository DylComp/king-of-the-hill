import type {PumpBoard} from './model';
const HOUR=3600000;
// Shadow evaluation only: a numerical candidate is never settlement authorization.
// Require source-built boundary timestamps, not our fetch time. No interpolation.
export function hourlyCandidate(start:PumpBoard,end:PumpBoard,hour:number){
 if(!Number.isSafeInteger(hour)||hour%HOUR!==0||start.builtAtMs!==hour||end.builtAtMs!==hour+HOUR)throw Error('hour_boundaries_unverified');
 if(start.windowStartSec!==end.windowStartSec||start.totalRanked!==end.totalRanked||start.entries.length!==start.totalRanked||end.entries.length!==end.totalRanked)throw Error('hour_coverage_changed');
 const rows=(b:PumpBoard)=>{const m=new Map<string,{pnl:number;members:number}>();for(const r of b.entries){const id=r.participantId??r.groupId;if(!id||m.has(id)||!Number.isFinite(r.pnlUsd))throw Error('hour_invalid_identity_or_score');m.set(id,{pnl:r.pnlUsd,members:r.memberCount});}return m;};
 const a=rows(start),b=rows(end);const gains:{participantId:string;gainUsd:number}[]=[];
 for(const [id,r] of a){const next=b.get(id);if(!next||r.members!==next.members)throw Error('hour_roster_changed');const gainUsd=next.pnl-r.pnl;if(!Number.isFinite(gainUsd))throw Error('hour_invalid_gain');gains.push({participantId:id,gainUsd});}
 gains.sort((x,y)=>y.gainUsd-x.gainUsd||x.participantId.localeCompare(y.participantId));
 const best=gains[0];const tied=best&&gains.filter(x=>x.gainUsd===best.gainUsd).length>1;
 return {hour,rule:'largest_hourly_pnl_gain' as const,verified:false as const,candidate:best&&best.gainUsd>0&&!tied?best:null,reason:!best||best.gainUsd<=0?'no_positive_gain':tied?'tie_requires_resolution':'candidate_requires_source_and_roster_verification'};
}
