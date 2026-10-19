import test from "node:test";
import assert from "node:assert/strict";
import { feeHistory } from "./launch/fee-history.ts";
test("only new finalized successful payouts increase the cumulative tally", async()=>{
  const r=await feeHistory("old",{requiredSignature:"new",page:async()=>[{signature:"failed",err:{}},{signature:"new",err:null},{signature:"old",err:null}],amount:async(s)=>{assert.equal(s,"new");return 500n;}});
  assert.deepEqual(r,{last:"failed",lamports:500n});
});
test("repeating the same cursor cannot double count a claim",async()=>{
  assert.deepEqual(await feeHistory("new",{requiredSignature:"new",page:async()=>[{signature:"new",err:null}],amount:async()=>{throw Error("must not count again");}}),{last:"new",lamports:0n});
});
test("lagging or unavailable receipts cannot mark a claim refreshed",async()=>{
  await assert.rejects(feeHistory(null,{requiredSignature:"new",page:async()=>[],amount:async()=>0n}),/not yet visible/);
  await assert.rejects(feeHistory(null,{page:async()=>[{signature:"new",err:null}],amount:async()=>{throw Error("missing receipt");}}),/missing receipt/);
});
