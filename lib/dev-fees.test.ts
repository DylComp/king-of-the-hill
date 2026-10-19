import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { Connection, Keypair, PublicKey, SystemProgram, type VersionedTransactionResponse } from "@solana/web3.js";
import { NATIVE_MINT } from "@solana/spl-token";
import { prepareCollection } from "./dev-fees/chain.ts";
import { collectionReceipt, verifiedPending, standardDevCreator, type Pending } from "./dev-fees/model.ts";
const require = createRequire(import.meta.url);
const sdk = require("@pump-fun/pump-sdk") as typeof import("@pump-fun/pump-sdk");
const BN = require("bn.js");

async function fixture(leg: "curve" | "amm", options: { wrongCreator?: boolean; fees?: number; balance?: number } = {}) {
  const conn = new Connection("http://localhost:1"), dev = Keypair.generate(), mint = Keypair.generate().publicKey;
  const fees = options.fees ?? 5_000_000, balance = options.balance ?? 100_000_000;
  const pump = sdk.getPumpProgram(conn), amm = sdk.getPumpAmmProgram(conn);
  function empty(program: typeof pump | typeof amm, name: string) {
    const type = program.idl.types!.find(t => t.name === name)!;
    if (type.type.kind !== "struct" || !type.type.fields) throw Error("Fixture layout");
    return Object.fromEntries(type.type.fields.map(field => {
      if (typeof field !== "object" || !("name" in field)) throw Error("Fixture named fields required");
      return [field.name, field.type === "pubkey" ? PublicKey.default : field.type === "bool" ? false : ["u8", "u16", "u32"].includes(field.type as string) ? 0 : new BN(0)];
    }));
  }
  const creator = options.wrongCreator ? Keypair.generate().publicKey : dev.publicKey;
  const curve = await pump.coder.accounts.encode("bondingCurve", { ...empty(pump, "bondingCurve"), creator, quoteMint: NATIVE_MINT, creatorFee: new BN(leg === "curve" ? fees : 0), complete: leg === "amm" });
  const pool = leg === "amm" ? await amm.coder.accounts.encode("pool", { ...empty(amm, "pool"), creator: sdk.pumpPoolAuthorityPda(mint), baseMint: mint, quoteMint: NATIVE_MINT, coinCreator: dev.publicKey, creatorFees: new BN(fees) }) : null;
  const info = (owner: PublicKey, data: Buffer, lamports = 1_000_000) => ({ owner, data, lamports, executable: false, rentEpoch: 0 });
  conn.getMultipleAccountsInfoAndContext = async () => ({ context: { slot: 100 }, value: [info(sdk.PUMP_PROGRAM_ID, curve), pool ? info(sdk.PUMP_AMM_PROGRAM_ID, pool) : null, info(SystemProgram.programId, Buffer.alloc(0), 890_880), null, info(SystemProgram.programId, Buffer.alloc(0), balance)] });
  conn.getMinimumBalanceForRentExemption = async size => size === 0 ? 890_880 : 2_039_280;
  conn.getLatestBlockhash = async () => ({ blockhash: mint.toBase58(), lastValidBlockHeight: 1000 });
  conn.getFeeForMessage = async () => ({ context: { slot: 100 }, value: 10_400 });
  conn.simulateTransaction = (async () => ({ context: { slot: 100 }, value: { err: null, logs: [], accounts: [{ owner: SystemProgram.programId.toBase58(), data: ["", "base64"], lamports: balance + fees - 10_400, executable: false, rentEpoch: 0 }, ...(leg === "amm" ? [null] : [])] } })) as typeof conn.simulateTransaction;
  return { conn, dev, mint };
}

test("dev collection accepts only standard SOL creator fees belonging to dev", () => {
  const dev = Keypair.generate().publicKey.toBase58();
  const o = { creator: dev, dev, quote: NATIVE_MINT.toBase58(), native: NATIVE_MINT.toBase58(), cashback: false, holderReward: false, mayhem: false };
  assert.equal(standardDevCreator(o), true);
  for (const change of [{ creator: PublicKey.default.toBase58() }, { quote: dev }, { cashback: true }, { holderReward: true }, { mayhem: true }]) assert.equal(standardDevCreator({ ...o, ...change }), false);
});
for (const leg of ["curve", "amm"] as const) test(`${leg} collection builds and signs an isolated claim without sending`, async () => {
  const { conn, dev, mint } = await fixture(leg);
  const pending = await prepareCollection(conn, mint, dev, leg);
  assert.ok(pending);
  const tx = verifiedPending(pending);
  assert.equal(pending.leg, leg);
  assert.equal(tx.signatures.length, leg === "amm" ? 2 : 1);
  if (leg === "amm") assert.ok(pending.temporaryAccount);
  const altered = { ...pending, signed: Buffer.from(tx.serialize()).toString("base64") };
  tx.message.recentBlockhash = Keypair.generate().publicKey.toBase58();
  altered.signed = Buffer.from(tx.serialize()).toString("base64");
  assert.throws(() => verifiedPending(altered));
});
test("wrong creator, dust and unfunded wallet cannot prepare a claim", async () => {
  let f = await fixture("curve", { wrongCreator: true });
  await assert.rejects(prepareCollection(f.conn, f.mint, f.dev, "curve"), /standard fees/);
  f = await fixture("curve", { fees: 999 });
  assert.equal(await prepareCollection(f.conn, f.mint, f.dev, "curve"), null);
  f = await fixture("curve", { balance: 0 });
  assert.equal(await prepareCollection(f.conn, f.mint, f.dev, "curve"), null);
});
function receipt(p: Pending, delta: number, err: unknown = null): VersionedTransactionResponse {
  const tx = verifiedPending(p), balances = tx.message.staticAccountKeys.map(() => 0);
  const pre = [...balances], post = [...balances];pre[0] = 100_000_000;post[0] = pre[0] + delta;
  return { slot: 100, blockTime: 1, transaction: { signatures: [p.signature], message: tx.message }, meta: { err, fee: 10_400, preBalances: pre, postBalances: post, preTokenBalances: [], postTokenBalances: [], logMessages: [], innerInstructions: [] } } as VersionedTransactionResponse;
}
test("settlement requires exact signed bytes, positive proceeds or only a failure fee", async () => {
  const f = await fixture("amm"), p = (await prepareCollection(f.conn, f.mint, f.dev, "amm"))!;
  assert.equal(collectionReceipt(p, receipt(p, 3_000_000)).netLamports, "3000000");
  assert.equal(collectionReceipt(p, receipt(p, -10_400, { InstructionError: [0, "Custom"] })).success, false);
  assert.throws(() => collectionReceipt(p, receipt(p, -20_000)));
  assert.throws(() => collectionReceipt(p, receipt(p, -20_000, { error: true })));
  const bad = receipt(p, 3_000_000);bad.meta!.postBalances[1] = 1;
  assert.throws(() => collectionReceipt(p, bad), /not closed/);
});
