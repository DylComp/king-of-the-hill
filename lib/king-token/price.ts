import {PublicKey,type Connection} from '@solana/web3.js';
import {NATIVE_MINT,getAssociatedTokenAddressSync,unpackAccount} from '@solana/spl-token';
import {createRequire} from 'node:module';
import type {HolderPrice} from './holders';
import {solUsdQuote} from './usd';
const require=createRequire(import.meta.url),pump=require('@pump-fun/pump-sdk') as typeof import('@pump-fun/pump-sdk'),amm=require('@pump-fun/pump-swap-sdk') as typeof import('@pump-fun/pump-swap-sdk');
export async function holderPrice(c:Connection,mint:PublicKey,program:PublicKey,minContextSlot:number):Promise<HolderPrice>{
 const usd=await solUsdQuote();
 const curve=await c.getAccountInfoAndContext(pump.bondingCurvePda(mint),{commitment:'finalized',minContextSlot});
 if(!curve.value?.owner.equals(pump.PUMP_PROGRAM_ID))throw Error('holder_price_route_invalid');
 const b=pump.PUMP_SDK.decodeBondingCurve(curve.value);let quote:bigint,base:bigint,slot=curve.context.slot,source:HolderPrice['source']='pump-curve-exchanges';
 if(!pump.normalizeQuoteMint(b.quoteMint).equals(NATIVE_MINT))throw Error('holder_price_quote_not_sol');
 if(!b.complete){quote=BigInt(b.virtualQuoteReserves.toString());base=BigInt(b.virtualTokenReserves.toString());}
 else{
  const pool=amm.canonicalPumpPoolPda(mint),baseAta=getAssociatedTokenAddressSync(mint,pool,true,program),quoteAta=getAssociatedTokenAddressSync(NATIVE_MINT,pool,true);
  const r=await c.getMultipleAccountsInfoAndContext([pool,baseAta,quoteAta],{commitment:'finalized',minContextSlot});
  if(!r.value[0]?.owner.equals(amm.PUMP_AMM_PROGRAM_ID)||!r.value[1]||!r.value[2])throw Error('holder_price_route_invalid');
  const ba=unpackAccount(baseAta,r.value[1],program),qa=unpackAccount(quoteAta,r.value[2]);
  if(!ba.owner.equals(pool)||!qa.owner.equals(pool)||!ba.mint.equals(mint)||!qa.mint.equals(NATIVE_MINT))throw Error('holder_price_route_invalid');
  base=ba.amount;quote=qa.amount;slot=r.context.slot;source='pump-amm-exchanges';
 }
 if(base<=0n||quote<=0n)throw Error('holder_price_no_liquidity');
 const numerator=quote*BigInt(usd.numerator),denominator=base*1000000000n*BigInt(usd.denominator);
 return {numerator:String(numerator),denominator:String(denominator),slot,source,observedAt:Date.now(),publishedAt:Math.min(usd.publishedAt,usd.corroboratedAt)};
}
