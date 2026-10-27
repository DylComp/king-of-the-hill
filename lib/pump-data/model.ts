export const PERIODS=['daily','weekly','monthly','competition'] as const;
export type Period=typeof PERIODS[number];
export const SORTS=['combined','realized','unrealized'] as const;
export type Sort=typeof SORTS[number];
export type PumpRow={rank:number;groupId?:string;participantId?:string;username:string|null;profileImageUrl:string|null;pnlUsd:number;pnlSol?:number;pnlPercent?:number;realizedPnlUsd?:number;unrealizedPnlUsd?:number;buySpendSol?:number;memberCount:number;membersCounted?:number;membersFresh?:number;lastRefreshedAtMs:number;positionsCount?:number;topPositions:{mint:string;symbol:string|null;imageUri:string|null}[]};
export type PumpBoard={entries:PumpRow[];periodLabel:string;windowStartSec:number;totalRanked:number;builtAtMs?:number;endSec?:number;isFinal?:boolean};
const num=(x:unknown)=>typeof x==='number'&&Number.isFinite(x);
// Validate required display fields. Never calculate, resort or substitute local scores.
export function parseBoard(raw:unknown,period:Period):PumpBoard {
 const j=raw as Record<string,any>;const b=period==='competition'?j?.leaderboard:j;
 if(!b||!Array.isArray(b.entries)||!num(b.totalRanked)||b.totalRanked<0)throw Error('invalid_official_response');
 const start=period==='competition'?b.startSec:b.windowStartSec;if(!num(start))throw Error('invalid_official_response');
 if(period==='competition'&&(!num(b.builtAtMs)||!num(b.endSec)||typeof b.isFinal!=='boolean'))throw Error('invalid_official_response');
 if(period!=='competition'&&typeof b.periodLabel!=='string')throw Error('invalid_official_response');
 const ids=new Set<string>();let rank=0;
 for(const r of b.entries){const id=period==='competition'?r.participantId:r.groupId;
  if(typeof id!=='string'||!id||ids.has(id)||!Number.isInteger(r.rank)||r.rank<=rank)throw Error('invalid_official_response');
  for(const k of ['pnlUsd','realizedPnlUsd','unrealizedPnlUsd','buySpendSol','memberCount','lastRefreshedAtMs','positionsCount'])if(!num(r[k]))throw Error('invalid_official_response');
  if(period!=='competition'&&(!num(r.pnlSol)||!num(r.pnlPercent)||!num(r.membersCounted)))throw Error('invalid_official_response');
  if(period==='competition'&&(r.kind!=='group'||r.struck!==false||!num(r.membersFresh)))throw Error('invalid_official_response');
  if(!(r.username===null||typeof r.username==='string')||!(r.profileImageUrl===null||typeof r.profileImageUrl==='string')||!Array.isArray(r.topPositions))throw Error('invalid_official_response');
  ids.add(id);rank=r.rank;
 }
 return {entries:b.entries,periodLabel:period==='competition'?'Competition':b.periodLabel,windowStartSec:start,totalRanked:b.totalRanked,...(period==='competition'?{builtAtMs:b.builtAtMs,endSec:b.endSec,isFinal:b.isFinal}:{})};
}
