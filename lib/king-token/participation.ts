import { randomBytes } from 'node:crypto';
import {participationMessage,verifiedMessage} from './signature';
import { redis,getJson } from '../redis';
import { squadMembers,trackedSquads,struckSquads } from '../king/source';
import { PREFIX } from './store';
import { selectBacking,END,type Backing } from './model';
export type Action='back'|'register';
export async function challenge(wallet:string,groupId:string,action:Action){
 if(Date.now()>=END)throw Error('competition_ended');
 if(!trackedSquads().has(groupId)||struckSquads().has(groupId))throw Error('invalid_squad');
 if(action!=='back'&&action!=='register')throw Error('invalid_action');
 if(action==='register'&&!squadMembers(groupId).some(m=>m.wallet===wallet))throw Error('not_a_squad_member');
 const nonce=randomBytes(24).toString('hex'),expires=Date.now()+300000;
 const message=participationMessage(wallet,groupId,action,nonce,expires);
 await redis('SET',PREFIX+':nonce:'+nonce,JSON.stringify({wallet,groupId,action,message,expires}),'EX',300);
 return {nonce,message};
}
export async function apply(wallet:string,nonce:string,signature:string){
 if(!/^[a-f0-9]{48}$/.test(nonce)||signature.length>100||Date.now()>=END)throw Error('invalid_signature');
 const c=await getJson<{wallet:string;groupId:string;action:Action;message:string;expires:number}>(PREFIX+':nonce:'+nonce);
 if(!c||c.wallet!==wallet||c.expires<Date.now())throw Error('expired_signature');
 if(!verifiedMessage(wallet,c.message,signature))throw Error('invalid_signature');
 const now=Date.now();
 if(c.action==='register'){
  if(!squadMembers(c.groupId).some(m=>m.wallet===wallet))throw Error('not_a_squad_member');
  const ok=await redis('EVAL',"if redis.call('DEL',KEYS[1])==0 then return 0 end redis.call('HSETNX',KEYS[2],ARGV[1],ARGV[2]) return 1",2,PREFIX+':nonce:'+nonce,PREFIX+':members:'+c.groupId,wallet,now);if(ok!==1)throw Error('signature_replayed');return {registered:true};
 }
 const old=await redis<string|null>('HGET',PREFIX+':backings',wallet);const next=selectBacking(old?JSON.parse(old) as Backing:null,c.groupId,now);
 const ok=await redis('EVAL',"if (redis.call('HGET',KEYS[1],ARGV[1]) or '')~=ARGV[2] then return 0 end if redis.call('DEL',KEYS[2])==0 then return 0 end redis.call('HSET',KEYS[1],ARGV[1],ARGV[3]) return 1",2,PREFIX+':backings',PREFIX+':nonce:'+nonce,wallet,old??'',JSON.stringify(next));if(ok!==1)throw Error('selection_changed_retry');return {backing:next};
}
