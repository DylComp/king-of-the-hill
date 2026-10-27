import {randomInt} from 'node:crypto';
import {Keypair,PublicKey,SystemProgram,TransactionMessage,VersionedTransaction} from '@solana/web3.js';
import bs58 from 'bs58';
import {verifiedHourlyWinner} from './winner';
import {kingMint,enabled} from './config';
import {journal,backings,registrations,type Journal,type Round} from './store';
import {END,HOUR,DEV,TREASURY,RESERVE,ZERO,splitFees,addBuckets,allocate,validateAllocation,amount} from './model';
import {snapshot,heldThroughHour,collectionTx,verifyFeeRoute} from './chain';
import {connection} from '../launch/pump';
import {reconcileAttempt} from '../king-worker/reconcile';
import type {Attempt} from '../king-worker/journal';
import {alert} from '../king-worker/worker';
import {hourId,hourOf} from '../king/model';
type AccountedAttempt=Attempt & {accounted?:boolean};
function signer(name:string,address:string){const raw=process.env[name];if(!raw)throw Error('signer_missing');let k:Keypair;try{k=Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)));}catch{throw Error('invalid_signer');}if(k.publicKey.toBase58()!==address)throw Error('signer_mismatch');return k;}
function round(j:Journal,hour:number):Round {
 return j.state.rounds[String(hour)]??= {hour,snapshotAt:hour+randomInt(5*60,50*60)*1000,income:'0',paid:{},attempts:[],done:false};
}
function signed(tx:VersionedTransaction,key:Keypair,expires:number):Attempt{tx.sign([key]);return {signed:Buffer.from(tx.serialize()).toString('base64'),signature:bs58.encode(tx.signatures[0]),expires,status:'pending'};}
async function settle(j:Journal,a:AccountedAttempt){
 if(a.burn)throw Error('legacy_burn_attempt_forbidden');
 return reconcileAttempt(j,a,connection(),async()=>{throw Error('burn_forbidden');});
}
// Every credited fee remains reserved until paid. Deposits and old treasury
// money are never treated as revenue. Network fees come from the separate reserve margin.
function outstanding(j:Journal){
 let n=Object.values(j.state.carry).reduce((a,v)=>a+amount(v),0n);
 for(const r of Object.values(j.state.rounds)){
  if(r.done)continue;
  if(!r.buckets){n+=amount(r.income);continue;}
  n+=Object.values(r.buckets).reduce((a,v)=>a+amount(v),0n);
  for(const p of r.payouts??[])if(r.paid[p.kind+':'+p.wallet])n-=amount(p.lamports);
 }
 return n;
}
async function budget(j:Journal,overhead:bigint){const balance=BigInt(await connection().getBalance(new PublicKey(TREASURY),'finalized'));if(balance<RESERVE+outstanding(j)+overhead)throw Error('treasury_reserve_required');}
async function collect(j:Journal,now:number){
 const c=connection();const a=j.state.collection;
 if(a){
  if(!await settle(j,a))return 'collection_pending';
  const tx=await c.getTransaction(a.signature,{commitment:'finalized',maxSupportedTransactionVersion:0});if(!tx?.meta||tx.blockTime==null)throw Error('collection_receipt_missing');
  const keys=tx.transaction.message.staticAccountKeys;const index=keys.findIndex(k=>k.toBase58()===TREASURY);if(index<0)throw Error('collection_treasury_missing');
  const credit=BigInt(tx.meta.postBalances[index])-BigInt(tx.meta.preBalances[index]);if(credit<=0n)throw Error('collection_no_revenue');
  const hour=Math.min(hourOf(tx.blockTime*1000),END-HOUR);const r=round(j,hour);if(r.buckets||r.done)throw Error('late_collection_needs_audit');r.income=String(amount(r.income)+credit);j.state.collected=String(amount(j.state.collected)+credit);delete j.state.collection;j.state.lastCollection=now;await j.save();return 'collection_finalized';
 }
 if(now-j.state.lastCollection<10*60_000||now>=END+HOUR)return null;
 if(await c.getBalance(new PublicKey(DEV),'finalized')<5_000_000)throw Error('fee_payer_needs_gas');
 const built=await collectionTx(j.state.mint);j.state.lastCollection=now;
 if(!built){await j.save();return null;}
 j.state.collection=signed(built.tx,signer('KING_LAUNCHER_SECRET_KEY',DEV),built.expires);await j.save();await settle(j,j.state.collection);return 'collection_submitted';
}
async function prepareRound(j:Journal,r:Round){
 const king=await verifiedHourlyWinner(r.hour);if(!king)return 'waiting_for_verified_hourly_winner';
 if(!r.snapshot)return 'waiting_for_complete_holder_snapshot';
 const holders:Record<string,string>={};const snapshotHolders=Object.entries(r.snapshot?.holders??{}).filter(([,h])=>h.groupId===king?.groupId);
 r.checks??={};
 // Audit one supporter per invocation: receipts can be large and must not be truncated.
 const unchecked=snapshotHolders.find(([w])=>r.checks![w]===undefined);
 if(unchecked){const [w,h]=unchecked;r.checks[w]=await heldThroughHour(connection(),j.state.mint,w,h,r.hour);await j.save();return 'checking_supporter_eligibility';}
 for(const [w,h] of snapshotHolders)if(r.checks[w])holders[w]=h.tokens;
 let members:string[]=[];
 if(king.groupId){const registered=await registrations(king.groupId!);members=king.members.filter(w=>registered[w]!=null&&registered[w]<r.hour+HOUR);if(!members.length){if(!king.ownerWallet)throw Error('verified_squad_payees_missing');members=[king.ownerWallet];}}
 members=members.filter(w=>w!==TREASURY&&w!==DEV); // Protocol wallets cannot receive participant allocations.
 r.buckets=addBuckets(splitFees(r.income),j.state.carry);j.state.carry={...ZERO};const a=allocate(r.buckets,members,holders,r.snapshot.airdrop);
 r.groupId=king?.groupId??null;r.name=king.name;
 r.payouts=a.payouts;r.carry=a.carry;r.reason=!king.groupId?'no_positive_squad':undefined;validateAllocation(r.buckets,r.payouts);await j.save();return null;
}
async function payRound(j:Journal,r:Round){
 if(r.hour<hourOf(j.state.started)+HOUR){r.buckets=splitFees(r.income);r.carry={...r.buckets};j.state.carry=addBuckets(j.state.carry,r.buckets);r.payouts=[];r.reason='partial_activation_hour_carried_forward';r.done=true;await j.save();return 'partial_hour_carried_forward';}
 if(!r.payouts){const outcome=await prepareRound(j,r);if(outcome)return outcome;}
 validateAllocation(r.buckets!,r.payouts!);
 for(const a of r.attempts as AccountedAttempt[]){
  if(!await settle(j,a))return 'payment_pending';
  if(!a.accounted){for(const id of a.wallets??[])r.paid[id]=a.signature;a.accounted=true;await j.save();}
 }
 const batch=r.payouts!.filter(p=>!r.paid[p.kind+':'+p.wallet]).slice(0,8);
 const c=connection();
 if(batch.length){
  await budget(j,100_000n);const block=await c.getLatestBlockhash('finalized');const payer=new PublicKey(TREASURY);
  const tx=new VersionedTransaction(new TransactionMessage({payerKey:payer,recentBlockhash:block.blockhash,instructions:batch.map(p=>SystemProgram.transfer({fromPubkey:payer,toPubkey:new PublicKey(p.wallet),lamports:amount(p.lamports)}))}).compileToV0Message());
  const fee=(await c.getFeeForMessage(tx.message,'confirmed')).value;if(fee==null||fee>100000)throw Error('payout_fee_quote_unavailable');
  const a=signed(tx,signer('KING_TREASURY_SECRET_KEY',TREASURY),block.lastValidBlockHeight);a.wallets=batch.map(p=>p.kind+':'+p.wallet);r.attempts.push(a);await j.save();await settle(j,a);return 'payout_submitted';
 }
 j.state.carry=addBuckets(j.state.carry,r.carry!);r.done=true;await j.save();return 'hour_paid';
}
export async function runSingleKing(){
 const mint=kingMint();if(!mint)return {mode:'single-king',outcome:'awaiting_mint',enabled:false,launchesEnabled:false};
 if(!enabled())return {mode:'single-king',outcome:'configured_paused',enabled:false,launchesEnabled:false};
 const j=await journal(mint);if(!j)return {outcome:'worker_busy'};
 let activeHour:string|undefined;
 try{
  if(j.state.stopped)return {outcome:'competition_complete',stopped:true};
  if(await connection().getGenesisHash()!=='5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d')throw Error('mainnet_required');
  await verifyFeeRoute(mint);
  const now=Date.now(),hour=hourOf(now);const first=hourOf(j.state.started)+HOUR;
  if(now<END){const r=round(j,hour);await j.save();if(hour>=first&&!r.snapshot&&now>=r.snapshotAt){const b=await backings();const snap=await snapshot(mint);if(snap.at<hour||snap.at>=hour+HOUR)throw Error('snapshot_crossed_hour');const holders:NonNullable<Round['snapshot']>['holders']={};for(const [w,h] of Object.entries(snap.holders)){const pick=b[w];if(pick&&pick.eligibleAt<=snap.at&&pick.selectedAt<=snap.at)holders[w]={...h,groupId:pick.groupId};}r.snapshot={slot:snap.slot,at:snap.at,holders,airdrop:snap.airdrop,price:snap.price,accountCount:snap.accountCount};await j.save();}}
  // Resume a previously signed collection before closing its hour.
  const collected=await collect(j,now);if(collected){j.state.outcome=collected;await j.save();return {outcome:collected};}
  const due=Object.values(j.state.rounds).filter(r=>!r.done&&r.hour+HOUR+120000<=now&&(r.hour!==END-HOUR||now>=END+HOUR)).sort((a,b)=>a.hour-b.hour)[0];
  if(due){activeHour=hourId(due.hour);j.state.outcome=await payRound(j,due);await j.save();return {outcome:j.state.outcome,hour:activeHour};}
  if(now>=END+HOUR&&!j.state.collection&&Object.values(j.state.rounds).every(r=>r.done)){j.state.stopped=true;j.state.outcome='competition_complete';}else j.state.outcome='waiting_for_next_hour';await j.save();return {outcome:j.state.outcome,stopped:j.state.stopped};
 }catch(e){const safe=['king_fee_route_not_ready','fee_payer_needs_gas','treasury_reserve_required','expired_unresolved','transaction_failed','mint_changed_requires_audit','signer_missing'];const code=e instanceof Error&&safe.includes(e.message)?e.message:'hour_failed';j.state.outcome=code;await j.save();await alert(code,activeHour);return {outcome:code,failed:true,hour:activeHour};}finally{await j.close();}
}
