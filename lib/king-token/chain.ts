import { PublicKey,VersionedTransaction,TransactionMessage,ComputeBudgetProgram,type Connection } from '@solana/web3.js';
import {unpackMint,TOKEN_PROGRAM_ID,TOKEN_2022_PROGRAM_ID} from '@solana/spl-token';
import {createRequire} from 'node:module';
import {connection,verifyLaunch} from '../launch/pump';
import {rpcUrl} from '../chain';
import {eligibleHolders,type HolderAccount} from './holders';
import {holderPrice} from './price';
import {DEV,TREASURY,ROUND} from './model';
import type {SnapshotHolder} from './store';
const require=createRequire(import.meta.url);
const sdk=require('@pump-fun/pump-sdk') as typeof import('@pump-fun/pump-sdk');
export async function verifyFeeRoute(mint:string){
 if(!(await verifyLaunch(mint,DEV,TREASURY,[{address:TREASURY,shareBps:10000}])).ok)throw Error('king_fee_route_not_ready');
}
export async function snapshot(mint:string){
 const c=connection(),m=new PublicKey(mint),before=await c.getAccountInfoAndContext(m,'finalized'),info=before.value;
 if(!info||![TOKEN_PROGRAM_ID,TOKEN_2022_PROGRAM_ID].some(p=>p.equals(info.owner)))throw Error('king_mint_not_on_chain');
 const mintBefore=unpackMint(m,info,info.owner);
 const r=await fetch(rpcUrl(),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'getProgramAccounts',params:[info.owner.toBase58(),{commitment:'finalized',minContextSlot:before.context.slot,encoding:'jsonParsed',withContext:true,filters:[{memcmp:{offset:0,bytes:mint}}]}]}),signal:AbortSignal.timeout(20000)});
 const j=await r.json();if(!r.ok||j.error||!Array.isArray(j.result?.value)||!Number.isSafeInteger(j.result?.context?.slot))throw Error('snapshot_unavailable');
 const slot=j.result.context.slot;
 const accounts:HolderAccount[]=[],holders:Record<string,{tokens:string;accounts:string[]}>={},excluded=new Set<string>();
 for(const a of j.result.value){const t=a.account?.data?.parsed?.info;
  if(!t||t.mint!==mint||a.account.owner!==info.owner.toBase58()||typeof a.pubkey!=='string'||typeof t.owner!=='string'||typeof t.tokenAmount?.amount!=='string')throw Error('snapshot_invalid_account');
  accounts.push({pubkey:a.pubkey,owner:t.owner,mint:t.mint,tokens:t.tokenAmount.amount});
  if([TREASURY,DEV].includes(t.owner)||!PublicKey.isOnCurve(new PublicKey(t.owner).toBytes()))continue;
  if(t.delegate){excluded.add(t.owner);continue;}
  const n=BigInt(t.tokenAmount.amount);if(n<=0n)continue;const old=holders[t.owner]??{tokens:'0',accounts:[]};old.tokens=String(BigInt(old.tokens)+n);old.accounts.push(a.pubkey);holders[t.owner]=old;
 }
 for(const w of excluded)delete holders[w];
 const after=await c.getAccountInfoAndContext(m,{commitment:'finalized',minContextSlot:slot});
 if(!after.value||!after.value.owner.equals(info.owner))throw Error('snapshot_mint_changed');
 const mintAfter=unpackMint(m,after.value,info.owner);if(mintBefore.supply!==mintAfter.supply||mintBefore.decimals!==mintAfter.decimals)throw Error('snapshot_supply_changed');
 const price=await holderPrice(c,m,info.owner,slot),blockTime=await c.getBlockTime(slot);
 if(blockTime==null||Math.abs(price.observedAt-blockTime*1000)>60000)throw Error('snapshot_time_unavailable');
 const airdrop=eligibleHolders(accounts,mint,String(mintAfter.supply),price,Date.now());
 return {slot,at:blockTime*1000,holders,airdrop,price,accountCount:accounts.length};
}
// Read the complete finalized hour for wallet + snapshotted token accounts.
// Pagination exhaustion or missing receipts blocks payout, rather than assuming eligibility.
export async function heldThroughHour(c:Connection,mint:string,wallet:string,h:SnapshotHolder,hour:number){
 const signatures=new Set<string>();
 for(const address of [wallet,...h.accounts]){
  let before:string|undefined,complete=false;
  for(let page=0;page<20;page++){
   const rows=await c.getSignaturesForAddress(new PublicKey(address),{limit:1000,...(before?{before}:{})},'finalized');
   for(const row of rows){if(row.blockTime==null)throw Error('holder_history_incomplete');const at=row.blockTime*1000;if(at>=hour&&at<hour+ROUND&&!row.err)signatures.add(row.signature);}
   if(rows.length<1000||rows.some(r=>r.blockTime!=null&&r.blockTime*1000<hour)){complete=true;break;}before=rows[rows.length-1].signature;
  }
  if(!complete)throw Error('holder_history_limit');
 }
 for(const sig of signatures){const tx=await c.getTransaction(sig,{commitment:'finalized',maxSupportedTransactionVersion:0});if(!tx?.meta)throw Error('holder_receipt_missing');if(tx.meta.err)continue;
  const sum=(rows:typeof tx.meta.preTokenBalances)=>rows?.filter(t=>t.mint===mint&&t.owner===wallet).reduce((n,t)=>n+BigInt(t.uiTokenAmount.amount),0n)??0n;
  if(sum(tx.meta.postTokenBalances)<sum(tx.meta.preTokenBalances))return false;
 }
 return true;
}
export async function collectionTx(mint:string){
 await verifyFeeRoute(mint);const c=connection();const payer=new PublicKey(DEV);
 const {instructions}=await new sdk.OnlinePumpSdk(c).buildDistributeCreatorFeesInstructions(new PublicKey(mint),{payer});
 const block=await c.getLatestBlockhash('finalized');
 const tx=new VersionedTransaction(new TransactionMessage({payerKey:payer,recentBlockhash:block.blockhash,instructions:[ComputeBudgetProgram.setComputeUnitLimit({units:400000}),ComputeBudgetProgram.setComputeUnitPrice({microLamports:1000}),...instructions]}).compileToV0Message());
 const fee=(await c.getFeeForMessage(tx.message,'confirmed')).value;if(fee==null||fee>100000)throw Error('collection_fee_quote_unavailable');
 const before=await c.getBalance(new PublicKey(TREASURY),'finalized');
 const sim=await c.simulateTransaction(tx,{commitment:'finalized',sigVerify:false,accounts:{encoding:'base64',addresses:[TREASURY]}});
 if(sim.value.err||!sim.value.accounts?.[0]||sim.value.accounts[0].lamports-before<=100000)return null;
 if(tx.message.header.numRequiredSignatures!==1||!tx.message.staticAccountKeys[0].equals(payer))throw Error('collection_signer_mismatch');
 return {tx,expires:block.lastValidBlockHeight};
}
