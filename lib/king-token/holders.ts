import {PublicKey,SystemProgram} from '@solana/web3.js';
import {amount,DEV,TREASURY} from './model.ts';
export type HolderPrice={numerator:string;denominator:string;observedAt:number;publishedAt:number;slot:number;source:'pump-curve-exchanges'|'pump-amm-exchanges'};
export type HolderAccount={pubkey:string;owner:string;mint:string;tokens:string};
// USD per raw token unit as an integer fraction. Exactly $1 is not eligible.
export function overOneDollar(tokens:string,price:HolderPrice){return amount(tokens)*amount(price.numerator)>amount(price.denominator);}
export function eligibleHolders(accounts:HolderAccount[],mint:string,supply:string,price:HolderPrice,now:number){
 if(amount(price.numerator)<=0n||amount(price.denominator)<=0n||!Number.isSafeInteger(price.slot)||price.slot<0||!Number.isFinite(price.observedAt)||!Number.isFinite(price.publishedAt)||Math.abs(now-price.observedAt)>60000||Math.abs(now-price.publishedAt)>60000)throw Error('holder_price_unavailable');
 const seen=new Set<string>(),balances:Record<string,string>={};let sum=0n;
 for(const a of accounts){if(a.mint!==mint||seen.has(a.pubkey))throw Error('holder_snapshot_invalid');seen.add(a.pubkey);const n=amount(a.tokens);sum+=n;
  if([DEV,TREASURY,SystemProgram.programId.toBase58()].includes(a.owner)||!PublicKey.isOnCurve(new PublicKey(a.owner).toBytes()))continue;
  balances[a.owner]=String(amount(balances[a.owner]??'0')+n);
 }
 // Detect truncated RPC/indexer responses; pool/vault balances count toward completeness.
 if(sum!==amount(supply))throw Error('holder_snapshot_incomplete');
 return Object.fromEntries(Object.entries(balances).filter(([,n])=>overOneDollar(n,price)));
}
