import test from 'node:test';
import assert from 'node:assert/strict';
import {splitFees,allocate,validateAllocation,selectBacking,HOUR} from './king-token/model.ts';
test('one KOTH fee pot uses original 40/40/20 allocation',()=>{
 const b=splitFees('1000000000');assert.deepEqual(b,{squad:'400000000',supporters:'400000000',holders:'200000000'});
 const a=allocate(b,['member2','member1'],{holder1:'3',holder2:'1'},{member1:'1',holder1:'3'});
 assert.deepEqual(a.payouts.map(p=>p.lamports),['200000000','200000000','300000000','100000000','150000000','50000000']);
 validateAllocation(b,a.payouts);
});
test('empty eligibility preserves each allocation rather than redirecting it',()=>{
 const b=splitFees('100');const a=allocate(b,[],{});assert.deepEqual(a.carry,{squad:'40',supporters:'40',holders:'20'});
});
test('integer rounding conserves every lamport',()=>{
 for(let i=0;i<100;i++){const b=splitFees(String(i));const a=allocate(b,['a','b','c'],{d:'7',e:'13'});const total=a.payouts.reduce((n,p)=>n+BigInt(p.lamports),0n)+BigInt(a.carry.squad)+BigInt(a.carry.supporters)+BigInt(a.carry.holders);assert.equal(total,BigInt(i));}
});
test('switching squads requires one hour before new backing is eligible',()=>{
 const first=selectBacking(null,'a',100);assert.equal(first.eligibleAt,100);const second=selectBacking(first,'b',200);assert.equal(second.eligibleAt,200+HOUR);assert.throws(()=>selectBacking(second,'c',300),/cooldown/);assert.deepEqual(selectBacking(second,'b',300),second);
});
test('allocation checks reject overspending and duplicate recipients within a bucket',()=>{
 const b=splitFees('100');assert.throws(()=>validateAllocation(b,[{wallet:'a',kind:'supporter',lamports:'41'}]));
 assert.throws(()=>validateAllocation(b,[{wallet:'a',kind:'squad',lamports:'1'},{wallet:'a',kind:'squad',lamports:'1'}]));
});

import {generateKeyPairSync,sign} from 'node:crypto';
import bs58 from 'bs58';
import {participationMessage,verifiedMessage} from './king-token/signature.ts';
import {kingMint,enabled} from './king-token/config.ts';
import {journal,publicState} from './king-token/store.ts';
import type {redis} from './redis.ts';
test('squad signature binds wallet, squad, action, nonce and expiry',()=>{
 const {publicKey,privateKey}=generateKeyPairSync('ed25519');const wallet=bs58.encode(Buffer.from(publicKey.export({format:'jwk'}).x!,'base64url'));
 const message=participationMessage(wallet,'squad-a','back','nonce-a',1234);const sig=sign(null,Buffer.from(message),privateKey).toString('base64');assert.equal(verifiedMessage(wallet,message,sig),true);
 for(const changed of [participationMessage(wallet,'squad-b','back','nonce-a',1234),participationMessage(wallet,'squad-a','register','nonce-a',1234),participationMessage(wallet,'squad-a','back','nonce-b',1234),participationMessage(wallet,'squad-a','back','nonce-a',9999)])assert.equal(verifiedMessage(wallet,changed,sig),false);
});
test('missing or legacy mint never enables the new financial worker',()=>{
 const mint=process.env.KING_MINT,flag=process.env.KING_TOKEN_WORKER_ENABLED;
 try{delete process.env.KING_MINT;process.env.KING_TOKEN_WORKER_ENABLED='true';assert.equal(kingMint(),null);assert.equal(enabled(),false);process.env.KING_MINT='5ChT61vPfByx2NApxSNT4iPMTRCV39m5z88bXYcppump';assert.throws(()=>enabled(),/legacy_mint/);}finally{if(mint===undefined)delete process.env.KING_MINT;else process.env.KING_MINT=mint;if(flag===undefined)delete process.env.KING_TOKEN_WORKER_ENABLED;else process.env.KING_TOKEN_WORKER_ENABLED=flag;}
});
test('single-KOTH journal refuses concurrent owners and changed mint; strips secrets from public status',async()=>{
 const db=new Map<string,string>();
 const command=(async(cmd:string,...args:(string|number)[])=>{
  if(cmd==='GET')return db.get(String(args[0]))??null;
  if(cmd==='SET'){const k=String(args[0]);if(db.has(k))return null;db.set(k,String(args[1]));return 'OK';}
  if(cmd==='EVAL'){
   const count=Number(args[1]),lock=String(args[2]);
   if(count===1){if(db.get(lock)!==args[3])return 0;db.delete(lock);return 1;}
   const key=String(args[3]),lease=args[4],expected=args[5],next=args[6];if(db.get(lock)!==lease||(db.get(key)??'')!==expected)return 0;db.set(key,String(next));return 1;
  }
  throw Error('unexpected command');
 }) as typeof redis;
 const j=await journal('mint-a',command);assert.ok(j);assert.equal(await journal('mint-a',command),null);await j.save();await j.fence();
 j.state.collection={signed:'PRIVATE_SIGNED_BYTES',signature:'public-signature',expires:100,status:'pending'};
 assert.ok(!JSON.stringify(publicState(j.state)).includes('PRIVATE_SIGNED_BYTES'));await j.save();await j.close();await assert.rejects(()=>journal('mint-b',command),/mint_changed/);
 const next=await journal('mint-a',command);assert.ok(next);db.set('king:single:v1:lock','another-owner');await assert.rejects(()=>next.save(),/lease_lost/);await assert.rejects(()=>next.fence(),/lease_lost/);
});

import {Keypair} from '@solana/web3.js';
import {eligibleHolders,overOneDollar,type HolderPrice} from './king-token/holders.ts';
import {TREASURY} from './king-token/model.ts';
const price:HolderPrice={numerator:'1',denominator:'100',slot:1,observedAt:1000,publishedAt:1000,source:'pump-curve-pyth'};
test('holder threshold is strictly over $1 with exact integer math',()=>{
 assert.equal(overOneDollar('100',price),false);assert.equal(overOneDollar('101',price),true);
 assert.equal(overOneDollar('9007199254740993',{...price,denominator:'9007199254740992'}),true);
});
test('holder scan aggregates accounts, excludes protocol holdings and rejects partial/duplicate/stale data',()=>{
 const owner=Keypair.generate().publicKey.toBase58();const rows=[{pubkey:'a',owner,mint:'mint',tokens:'60'},{pubkey:'b',owner,mint:'mint',tokens:'50'},{pubkey:'c',owner:TREASURY,mint:'mint',tokens:'200'}];
 assert.deepEqual(eligibleHolders(rows,'mint','310',price,1000),{[owner]:'110'});
 assert.throws(()=>eligibleHolders(rows.slice(0,2),'mint','310',price,1000),/incomplete/);
 assert.throws(()=>eligibleHolders([...rows,rows[0]],'mint','370',price,1000),/invalid/);
 assert.throws(()=>eligibleHolders(rows,'mint','310',price,62000),/price/);
});
test('overlap permits all three categories without overspending; holder dust stays reserved',()=>{
 const b=splitFees('1001');const a=allocate(b,['same'],{same:'5'},{same:'1',other:'2'});
 validateAllocation(b,a.payouts);assert.equal(a.payouts.filter(p=>p.wallet==='same').length,3);
 assert.equal(a.payouts.reduce((n,p)=>n+BigInt(p.lamports),0n)+Object.values(a.carry).reduce((n,v)=>n+BigInt(v),0n),1001n);
 assert.throws(()=>validateAllocation(b,[{wallet:'x',kind:'holder',lamports:'202'}]),/exceeded/);
});
