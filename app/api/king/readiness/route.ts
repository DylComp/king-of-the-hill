import {WINNER_RULE,WINNER_SCOPE} from '@/lib/king-token/model';
import {solUsdQuote} from '@/lib/king-token/usd';
import {COMPETITION_ID} from '@/lib/king/model';
export const dynamic='force-dynamic';
export async function GET(){
 const [pricing,standings]=await Promise.all([
  solUsdQuote().then(q=>({available:true,...q})).catch(()=>({available:false,reason:'usd_price_validation_failed'})),
  (async()=>{try{const r=await fetch(`https://frontend-api-v3.pump.fun/competitions/${COMPETITION_ID}`,{cache:'no-store',signal:AbortSignal.timeout(10000)});if(!r.ok)return {available:false,httpStatus:r.status};const j=await r.json(),b=j.leaderboard;return {available:!!b,returnedRows:b?.entries?.length,totalRanked:b?.totalRanked,rankOnePresent:b?.entries?.[0]?.rank===1,sourceBuiltAt:b?.builtAtMs,sourceEndSec:b?.endSec};}catch{return {available:false,reason:'direct_source_unavailable'};}})()
 ]);
 return Response.json({checkedAt:Date.now(),roundMinutes:30,winnerScope:WINNER_SCOPE,winnerRule:WINNER_RULE,pricing,standings,settlementVerified:false,payoutsEnabled:false},{headers:{'Cache-Control':'public, s-maxage=30, stale-while-revalidate=0'}});
}
