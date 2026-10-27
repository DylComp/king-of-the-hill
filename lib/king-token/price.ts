import {PublicKey,type Connection} from '@solana/web3.js';
import {NATIVE_MINT,getAssociatedTokenAddressSync,unpackAccount} from '@solana/spl-token';
import {createRequire} from 'node:module';
import type {HolderPrice} from './holders';
const require=createRequire(import.meta.url),pump=require('@pump-fun/pump-sdk') as typeof import('@pump-fun/pump-sdk'),amm=require('@pump-fun/pump-swap-sdk') as typeof import('@pump-fun/pump-swap-sdk');
const SOL_USD='ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d';
export async function holderPrice(c:Connection,mint:PublicKey,program:PublicKey,minContextSlot:number):Promise<HolderPrice>{
 const res=await fetch(`https://hermes.pyth.network/v2/updates/price/latest?ids[]=${SOL_USD}`,{cache:'no-store',signal:AbortSignal.timeout(10000)});
 if(!res.ok)throw Error('holder_price_unavailable');const data=await res.json();const feed=data.parsed?.find((p:{id:string})=>p.id===SOL_USD),p=feed?.price;
 if(!p||!/^\d+$/.test(p.price)||!/^\d+$/.test(p.conf)||!Number.isInteger(p.expo)||Math.abs(p.expo)>18||!Number.isFinite(p.publish_time)||Math.abs(Date.now()-p.publish_time*1000)>60000)throw Error('holder_price_unavailable');
 const usd=BigInt(p.price),conf=BigInt(p.conf);if(usd<=0n||conf*100n>usd)throw Error('holder_price_uncertain');
 const curve=await c.getAccountInfoAndContext(pump.bondingCurvePda(mint),{commitment:'finalized',minContextSlot});
 if(!curve.value?.owner.equals(pump.PUMP_PROGRAM_ID))throw Error('holder_price_route_invalid');
 const b=pump.PUMP_SDK.decodeBondingCurve(curve.value);let quote:bigint,base:bigint,slot=curve.context.slot,source:HolderPrice['source']='pump-curve-pyth';
 if(!pump.normalizeQuoteMint(b.quoteMint).equals(NATIVE_MINT))throw Error('holder_price_quote_not_sol');
 if(!b.complete){quote=BigInt(b.virtualQuoteReserves.toString());base=BigInt(b.virtualTokenReserves.toString());}
 else{
  const pool=amm.canonicalPumpPoolPda(mint),baseAta=getAssociatedTokenAddressSync(mint,pool,true,program),quoteAta=getAssociatedTokenAddressSync(NATIVE_MINT,pool,true);
  const r=await c.getMultipleAccountsInfoAndContext([pool,baseAta,quoteAta],{commitment:'finalized',minContextSlot});
  if(!r.value[0]?.owner.equals(amm.PUMP_AMM_PROGRAM_ID)||!r.value[1]||!r.value[2])throw Error('holder_price_route_invalid');
  const ba=unpackAccount(baseAta,r.value[1],program),qa=unpackAccount(quoteAta,r.value[2]);
  if(!ba.owner.equals(pool)||!qa.owner.equals(pool)||!ba.mint.equals(mint)||!qa.mint.equals(NATIVE_MINT))throw Error('holder_price_route_invalid');
  base=ba.amount;quote=qa.amount;slot=r.context.slot;source='pump-amm-pyth';
 }
 if(base<=0n||quote<=0n)throw Error('holder_price_no_liquidity');
 let numerator=quote*usd,denominator=base*1000000000n;
 if(p.expo<0)denominator*=10n**BigInt(-p.expo);else numerator*=10n**BigInt(p.expo);
 return {numerator:String(numerator),denominator:String(denominator),slot,source,observedAt:Date.now(),publishedAt:p.publish_time*1000};
}
