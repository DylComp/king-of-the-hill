import { fail, json, live } from "@/lib/api";
import { trackingBoard } from "@/lib/king/tracking";
import { squadMembers } from "@/lib/king/source";
import { walletStats } from "@/lib/king/store";
import { hourOf } from "@/lib/king/model";
import { findProfile } from "@/lib/launch/profile";
import { connection } from "@/lib/launch/pump";
import { PublicKey } from "@solana/web3.js";
export const maxDuration=60;
export async function GET(req:Request) {
 try {
  const name=new URL(req.url).searchParams.get("name")?.toLowerCase();
  const board=await trackingBoard();const squad=board.squads.find(s=>s.name.toLowerCase()===name);
  if(!squad)return json({error:"Squad not found"},404);
  const roster=squadMembers(squad.groupId);
  const valid=roster.flatMap(m=>{try{return [{wallet:m.wallet,key:new PublicKey(m.wallet)}];}catch{return [];}});
  const [stats,profiles,accounts]=await Promise.all([walletStats(hourOf(Date.now())).catch(():Awaited<ReturnType<typeof walletStats>>=>({since:{},current:{},last:{},total:{},scans:{}})),Promise.all(roster.map(m=>findProfile(m.wallet).catch(()=>null))),connection().getMultipleAccountsInfo(valid.map(m=>m.key),'finalized').catch(()=>null)]);
  const balances=new Map(valid.map((m,i)=>[m.wallet,accounts? (accounts[i]?.lamports??0)/1e9:null]));
  const members=roster.map((m,i)=>{const since=Number(stats.since[m.wallet])||null;const value=(map:Record<string,string>)=>since?Number(BigInt(map[m.wallet]??'0'))/1e9:null;return {...m,image:profiles[i]?.image??null,followers:profiles[i]?.followers??null,x:profiles[i]?.x??null,balanceSol:balances.get(m.wallet)??null,bankedHour:value(stats.current),bankedLast:value(stats.last),bankedTotal:value(stats.total),statsSince:since,lastScannedAt:Number(stats.scans[m.wallet])||null};});
  return live({mode:board.mode,squad,coin:null,members,asOf:Date.now(),crowns:board.crowns.filter(c=>c.groupId===squad.groupId)},30);
 }catch(e){return fail(e,"king squad");}
}
