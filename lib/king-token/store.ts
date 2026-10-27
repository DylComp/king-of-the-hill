import { randomUUID } from 'node:crypto';
import { redis,getJson } from '../redis.ts';
import {ROUND} from './model.ts';
import type { HolderPrice } from './holders';
import type { Backing,Buckets,Payee } from './model';
import type { Attempt } from '../king-worker/journal';
export const PREFIX='king:single:v1';
export type SnapshotHolder={tokens:string;accounts:string[];groupId?:string};
export type Round={hour:number;snapshot?:{slot:number;at:number;holders:Record<string,SnapshotHolder>;airdrop:Record<string,string>;price:HolderPrice;accountCount:number}; snapshotAt:number;income:string;groupId?:string|null;name?:string|null;buckets?:Buckets;payouts?:Payee[];carry?:Buckets;checks?:Record<string,boolean>;paid:Record<string,string>;attempts:Attempt[];done:boolean;reason?:string};
export type State={periodMs:number;mint:string;started:number;at:number;outcome:string;stopped:boolean;carry:Buckets;rounds:Record<string,Round>;collection?:Attempt;lastCollection:number;collected:string;};
export async function state(){return getJson<State>(PREFIX+':state');}
export async function journal(mint:string, command:typeof redis=redis) {
 const lock=PREFIX+':lock',key=PREFIX+':state',lease=randomUUID();
 if(await command('SET',lock,lease,'NX','EX',180)!=='OK')return null;
 let expected=await command<string|null>('GET',key);
 const s:State=expected?JSON.parse(expected):{periodMs:ROUND,mint,started:Date.now(),at:0,outcome:'starting',stopped:false,carry:{squad:'0',supporters:'0',holders:'0'},rounds:{},lastCollection:0,collected:'0'};
 const close=async()=>{await command('EVAL',"if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) end return 0",1,lock,lease);};
 if(expected && ('burn' in s.carry)){await close();throw Error('legacy_burn_ledger_requires_audit');}
 if(s.periodMs!==ROUND){await close();throw Error('round_duration_changed_requires_audit');}
 if(s.mint!==mint){await close();throw Error('mint_changed_requires_audit');}
 return {state:s,async save(){s.at=Date.now();const next=JSON.stringify(s);const ok=await command('EVAL',"if redis.call('GET',KEYS[1])~=ARGV[1] or (redis.call('GET',KEYS[2]) or '')~=ARGV[2] then return 0 end redis.call('SET',KEYS[2],ARGV[3]) return 1",2,lock,key,lease,expected??'',next);if(ok!==1)throw Error('lease_lost');expected=next;},async fence(){if(await command('GET',lock)!==lease || await command('GET',key)!==expected)throw Error('lease_lost');},close};
}
export type Journal=NonNullable<Awaited<ReturnType<typeof journal>>>;
export async function backings():Promise<Record<string,Backing>>{
 const raw=await redis<string[]>('HGETALL',PREFIX+':backings');const out:Record<string,Backing>={};for(let i=0;i<raw.length;i+=2)out[raw[i]]=JSON.parse(raw[i+1]);return out;
}
export async function registrations(groupId:string){const raw=await redis<string[]>('HGETALL',PREFIX+':members:'+groupId);const out:Record<string,number>={};for(let i=0;i<raw.length;i+=2)out[raw[i]]=Number(raw[i+1]);return out;}
export function publicState(s:State|null){return s?{periodMs:s.periodMs,mint:s.mint,at:s.at,outcome:s.outcome,stopped:s.stopped,collectedLamports:s.collected,reservedCarry:s.carry,rounds:Object.values(s.rounds).sort((a,b)=>b.hour-a.hour).slice(0,48).map(r=>({hour:r.hour,endsAt:r.hour+ROUND,snapshotSlot:r.snapshot?.slot,groupId:r.groupId,squad:r.name,feesLamports:r.income,allocations:r.buckets,payouts:r.payouts??[],holderSnapshotCount:r.snapshot?Object.keys(r.snapshot.airdrop).length:undefined,holderPrice:r.snapshot?.price,status:r.reason==='partial_activation_hour_carried_forward'?'carried_forward':r.done?'paid':r.payouts?'pending':'collecting',reason:r.reason,signatures:r.attempts.filter(a=>a.status==='finalized'&&!a.failed).map(a=>a.signature)}))}:null;}
