import {getJson,setJson} from '../redis';
import {COMPETITION_ID} from '../king/model';
import {parseBoard,type Period,type Sort,type PumpBoard} from './model';
export type OfficialResult={source:'pump-official-api';status:'available'|'stale'|'unavailable';reason?:string;period:Period;sort:Sort;fetchedAt:number|null;data:PumpBoard|null;rankingsVerified:false;hourlyWinnersVerified:false};
const BASE='https://api.pump.fun/v1';
export async function officialStandings(period:Period,sort:Sort):Promise<OfficialResult>{
 const key=`king:pump:board:v1:${period}:${sort}`;
 const cached=await getJson<OfficialResult>(key).catch(()=>null);
 if(cached?.fetchedAt&&Date.now()-cached.fetchedAt<60000)return cached;
 const empty:OfficialResult={source:'pump-official-api',status:'unavailable',period,sort,fetchedAt:null,data:null,rankingsVerified:false,hourlyWinnersVerified:false};
 const apiKey=process.env.PUMP_API_KEY?.trim();if(!apiKey)return {...empty,reason:'api_key_required'};
 try{
  const path=period==='competition'?`/competitions/${COMPETITION_ID}?limit=100&positionsLimit=3`:`/pnl-leaderboard/groups?period=${period}&sort=${sort}&limit=100&positionsLimit=3`;
  const r=await fetch(BASE+path,{headers:{Authorization:`Bearer ${apiKey}`,Accept:'application/json'},cache:'no-store',signal:AbortSignal.timeout(10000)});
  if(!r.ok)throw Error(r.status===401?'api_key_rejected':r.status===403?'api_access_denied':r.status===429?'source_rate_limited':'source_unavailable');
  const data=parseBoard(await r.json(),period);const result:OfficialResult={...empty,status:'available',data,fetchedAt:Date.now()};
  await setJson(key,result,86400);return result;
 }catch(e){const reason=e instanceof Error&&['api_key_rejected','api_access_denied','source_rate_limited','invalid_official_response'].includes(e.message)?e.message:'source_unavailable';return cached?.data?{...cached,status:'stale',reason}:{...empty,reason};}
}

// Record source observations for the later hourly-winner audit. Never label a sampled
// rolling-window change as hourly profit, and never feed these into the legacy payer.
export async function recordCompetitionObservation(){
 if(!process.env.PUMP_API_KEY?.trim())return {status:'api_key_required'};
 const result=await officialStandings('competition','combined');
 if(result.status!=='available'||!result.data?.builtAtMs)return {status:result.status};
 await setJson(`king:pump:observation:v1:${result.data.builtAtMs}`,result,30*86400);
 await setJson('king:pump:observation:latest',result,30*86400);
 return {status:'recorded',builtAtMs:result.data.builtAtMs};
}
