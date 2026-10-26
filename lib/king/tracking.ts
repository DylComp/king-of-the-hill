// Read-only competition records are separate from legacy financial allocations.
import { getJson, redis, setJson } from "../redis";
import { COMPETITION_ENDS, HOUR, hourId, hourOf, pickKing } from "./model";
import { competitionBoard, trackedSquads, struckSquads, walletsOf } from "./source";
import { bankedAt, scannedAt } from "./store";
import { allScannedSince, scanWallets } from "./scan";
export type TrackingCrown = { hour: string; squad: string | null; groupId: string | null; gainSol: number; provisional: boolean };
const PREFIX = "pt:king:tracking:v1";
export async function trackingCrowns(): Promise<TrackingCrown[]> {
 const ids = await redis<string[]>("ZREVRANGE", PREFIX+":crowns",0,47);
 if (!ids.length) return [];
 const rows=await redis<(string|null)[]>("MGET",...ids.map(id=>PREFIX+":crown:"+id));
 return rows.flatMap(r=>r?[JSON.parse(r)]:[]);
}
export async function trackingBoard() {
 const ids=trackedSquads(), wallets=walletsOf(ids);
 const [board, scans, crowns, lastScan]=await Promise.all([competitionBoard(ids),scannedAt(),trackingCrowns(),getJson(PREFIX+":lastScan")]);
 return { mode:"tracking-only", launchesEnabled:false, payoutsEnabled:false, coins:0,
  lastScan, board:{takenAt:board.takenAt,wallets:wallets.length,initializedWallets:wallets.filter(w=>scans[w.wallet]).length},
  squads:board.squads.map(s=>({...s,coin:null})),crowns,endsAt:COMPETITION_ENDS };
}
export async function runTracking(now=Date.now()) {
 if(now>=COMPETITION_ENDS+HOUR) return {mode:"tracking-only",done:true};
 await redis("SET",PREFIX+":started",String(now),"NX");
 const started=Number(await redis<string>("GET",PREFIX+":started"));
 const ids=trackedSquads(), wallets=walletsOf(ids);
 const scan=await scanWallets(wallets,now+35_000);
 const prev=Math.min(hourOf(now),COMPETITION_ENDS)-HOUR;
 // Start crowns after the first complete hour of tracking, never mix legacy coin-only scores.
 if(prev>=hourOf(started)+HOUR && !(await getJson(PREFIX+":crown:"+hourId(prev)))) {
  const complete=await allScannedSince(wallets,prev+HOUR+60_000);
  if(complete || now-prev-HOUR>25*60_000) {
   const banked=Object.fromEntries(Object.entries(await bankedAt(prev)).map(([id,n])=>[id,Number(BigInt(n))/1e9]));
   const winner=pickKing(banked,ids,struckSquads());
   const board=await competitionBoard(ids,now);
   const crown:TrackingCrown={hour:hourId(prev),groupId:winner?.groupId??null,squad:board.squads.find(s=>s.groupId===winner?.groupId)?.name??null,gainSol:winner?.gainSol??0,provisional:!complete};
   await setJson(PREFIX+":crown:"+crown.hour,crown);
   await redis("ZADD",PREFIX+":crowns",prev,crown.hour);
  }
 }
 const result={mode:"tracking-only",squads:ids.size,wallets:wallets.length,scanned:scan.scanned,transactions:scan.txs,failed:scan.failed,at:now};
 await setJson(PREFIX+":lastScan",result);
 return result;
}
