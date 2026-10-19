import test from "node:test";
import assert from "node:assert/strict";
import { Keypair, PublicKey, TransactionMessage, VersionedTransaction, type Connection } from "@solana/web3.js";
import { collection, type CollectionDeps } from "./buyback/collection.ts";
import type { Store } from "./buyback/store.ts";

function fixture() {
  const signer = Keypair.generate();
  const mint = Keypair.generate().publicKey.toBase58();
  const unsigned = new VersionedTransaction(new TransactionMessage({payerKey: signer.publicKey, recentBlockhash: PublicKey.default.toBase58(), instructions: []}).compileToV0Message());
  const events: string[] = [];
  const store = {state: {coinOffset: 0, collection: null}, save: async () => {events.push("save");}, maySend: async () => {events.push("lease");}} as unknown as Store;
  const deps: CollectionDeps = {latestCoins: async () => [{mint, recipient: {wallet: Keypair.generate().publicKey.toBase58()}}], verifyLaunch: async () => ({ok:true}), collectTx: async () => ({tx:Buffer.from(unsigned.serialize()).toString("base64"),lastValidBlockHeight:123})};
  const conn = {getBalance:async()=>10_000_000,getFeeForMessage:async()=>({value:85_000}),simulateTransaction:async()=>({value:{err:null,accounts:[{lamports:12_000_000}]}}),sendRawTransaction:async()=>{events.push("send");}} as unknown as Connection;
  return {signer,mint,store,deps,conn,events};
}
test("profile payout signs and persists before sending without any official mint",async()=>{
  const f=fixture();assert.equal(await collection(f.store,f.conn,f.signer,f.deps),"collection_submitted");
  assert.deepEqual(f.events,["save","save","lease","send"]);assert.equal(f.store.state.collection?.mint,f.mint);
});
test("official token and wrong fee split cannot be collected",async()=>{
  for(const mode of ["official","split"]){const f=fixture();if(mode==="official")f.deps.officialMint=f.mint;else f.deps.verifyLaunch=async()=>({ok:false});
    assert.equal(await collection(f.store,f.conn,f.signer,f.deps),mode==="official"?"no_eligible_collection":"ineligible_collection");assert.ok(!f.events.includes("send"));}
});
test("unfunded payer and expensive transactions never send",async()=>{
  const f=fixture();f.conn.getBalance=async()=>0;assert.equal(await collection(f.store,f.conn,f.signer,f.deps),"collection_needs_gas");
  f.conn.getBalance=async()=>10_000_000;f.conn.getFeeForMessage=async()=>({context:{slot:1},value:100_001});assert.equal(await collection(f.store,f.conn,f.signer,f.deps),"collection_network_fee_too_high");assert.ok(!f.events.includes("send"));
});
test("pending claims retry identical bytes without building another payout",async()=>{
  const f=fixture();await collection(f.store,f.conn,f.signer,f.deps);const saved=f.store.state.collection!.signed;
  f.deps.collectTx=async()=>{throw Error("must not rebuild");};f.conn.getTransaction=async()=>null;f.conn.getBlockHeight=async()=>100;
  f.conn.sendRawTransaction=async(raw)=>{assert.equal(Buffer.from(raw).toString("base64"),saved);return "sig";};assert.equal(await collection(f.store,f.conn,f.signer,f.deps),"collection_pending");
});
