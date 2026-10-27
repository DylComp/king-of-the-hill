import type {PumpBoard,PumpRow} from './model';
const CUP='f0f80f25-3b5c-4996-8750-7940f6950965';
const finite=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v);
const fresh=(v:unknown,now:number)=>finite(v)&&v>now-10*60_000&&v<now+60_000;
// Both independently served mirrors must describe the same complete 100-row
// competition board. Matching is exact, with no averaging, re-ranking or estimates.
export function reconcileMirrors(a:any,b:any,now=Date.now()):PumpBoard {
 if(a?.ok!==true||a.source!=='cup'||a.cup?.id!==CUP||b?.cup?.id!==CUP||b.cup.source!=='competition')throw Error('mirror_identity_mismatch');
 if(!fresh(a.fetchedAt,now)||!fresh(b.cup.readAt,now)||!fresh(b.cup.builtAt,now))throw Error('mirror_stale');
 if(!Array.isArray(a.squads)||!Array.isArray(b.squads)||a.squads.length!==100)throw Error('mirror_incomplete');
 const counterparts=b.squads.filter((s:any)=>s.cup&&!s.cup.struck);if(counterparts.length!==100)throw Error('mirror_incomplete');
 const seen=new Set<string>();const ranks=new Set<number>();const rows:PumpRow[]=[];
 for(let i=0;i<a.squads.length;i++){
  const r=a.squads[i];if(r.rank!==i+1||typeof r.id!=='string'||seen.has(r.id)||!finite(r.pnl)||typeof r.name!=='string'||!Number.isInteger(r.members))throw Error('mirror_invalid_row');
  const matches=counterparts.filter((s:any)=>s.cup.rank===r.rank);if(matches.length!==1)throw Error('mirror_rank_mismatch');const c=matches[0].cup;
  if(c.pnlUsd!==r.pnl||c.memberCount!==r.members)throw Error('mirror_scores_disagree');
  for(const field of ['realizedPnlUsd','unrealizedPnlUsd','buySpendSol','membersFresh','positionsCount','lastRefreshedAtMs'])if(!finite(c[field]))throw Error('mirror_invalid_row');
  seen.add(r.id);ranks.add(r.rank);rows.push({rank:r.rank,participantId:r.id,username:r.name,profileImageUrl:typeof r.image==='string'&&r.image.startsWith('https://')?r.image:null,pnlUsd:r.pnl,realizedPnlUsd:c.realizedPnlUsd,unrealizedPnlUsd:c.unrealizedPnlUsd,buySpendSol:c.buySpendSol,memberCount:r.members,membersFresh:c.membersFresh,lastRefreshedAtMs:c.lastRefreshedAtMs,positionsCount:c.positionsCount,topPositions:[]});
 }
 const start=Date.parse(a.cup.startsAt)/1000;if(!finite(start)||start!==b.cup.startsAt/1000)throw Error('mirror_window_mismatch');
 return {entries:rows,periodLabel:'Competition · public mirrors',windowStartSec:start,totalRanked:100,builtAtMs:b.cup.builtAt,isFinal:a.cup.isFinal===true&&b.cup.isFinal===true};
}
export async function readPublicMirrors(){const urls=['https://pfsc.fun/api/state','https://www.scsp.fun/api/state'];const [a,b]=await Promise.all(urls.map(async url=>{const r=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('mirror_unavailable');return r.json();}));return {data:reconcileMirrors(a,b),sourceUrls:urls};}
