import { test } from "node:test";
import assert from "node:assert/strict";
import { AddressLookupTableAccount, ComputeBudgetProgram, Keypair, PublicKey, SystemProgram, TransactionInstruction, TransactionMessage } from "@solana/web3.js";
import { LIGHTHOUSE, matchesPrepared } from "./launch/verify.ts";

const payer = Keypair.generate().publicKey;
const mint = Keypair.generate().publicKey;
const program = Keypair.generate().publicKey;
const shared = Array.from({ length: 6 }, () => Keypair.generate().publicKey);
const table = new AddressLookupTableAccount({
  key: Keypair.generate().publicKey,
  state: { deactivationSlot: BigInt("18446744073709551615"), lastExtendedSlot: 0, lastExtendedSlotStartIndex: 0, authority: undefined, addresses: shared },
});
const hash = (n: number) => new PublicKey(new Uint8Array(32).fill(n)).toBase58();

// A launch-shaped transaction: our compute budget, then two program calls that use the table.
const launchIxs = (split = 8000) => [
  new TransactionInstruction({ programId: program, keys: [{ pubkey: payer, isSigner: true, isWritable: true }, { pubkey: mint, isSigner: true, isWritable: true }, ...shared.slice(0, 3).map((pubkey) => ({ pubkey, isSigner: false, isWritable: false }))], data: Buffer.from([1, 2, 3]) }),
  new TransactionInstruction({ programId: program, keys: [{ pubkey: mint, isSigner: false, isWritable: true }, ...shared.slice(3).map((pubkey) => ({ pubkey, isSigner: false, isWritable: false }))], data: Buffer.from(Uint16Array.of(split).buffer) }),
];
const ours = [ComputeBudgetProgram.setComputeUnitLimit({ units: 600_000 }), ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1_000 })];
const build = (ixs: TransactionInstruction[], blockhash = hash(1)) => new TransactionMessage({ payerKey: payer, recentBlockhash: blockhash, instructions: ixs }).compileToV0Message([table]);
const expected = build([...ours, ...launchIxs()]);
const lighthouse = new TransactionInstruction({ programId: new PublicKey(LIGHTHOUSE), keys: [{ pubkey: payer, isSigner: false, isWritable: false }], data: Buffer.from([9]) });

test("the exact prepared launch passes", () => {
  assert.equal(matchesPrepared(expected, expected, [table]), true);
});

test("wallet edits pass: new priority fee, new blockhash, Lighthouse checks", () => {
  const edited = build([ComputeBudgetProgram.setComputeUnitLimit({ units: 700_000 }), ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 250_000 }), ...launchIxs(), lighthouse], hash(2));
  assert.equal(matchesPrepared(edited, expected, [table]), true);
  assert.equal(matchesPrepared(build(launchIxs()), expected, [table]), true);
});

test("tampering fails", () => {
  // the fee split changed
  assert.equal(matchesPrepared(build([...ours, ...launchIxs(5000)]), expected, [table]), false);
  // an instruction dropped
  assert.equal(matchesPrepared(build([...ours, launchIxs()[0]]), expected, [table]), false);
  // an extra transfer slipped in
  const steal = SystemProgram.transfer({ fromPubkey: payer, toPubkey: Keypair.generate().publicKey, lamports: 1e9 });
  assert.equal(matchesPrepared(build([...ours, ...launchIxs(), steal]), expected, [table]), false);
  // instructions reordered
  assert.equal(matchesPrepared(build([...ours, ...launchIxs().reverse()]), expected, [table]), false);
  // a different fee payer
  const other = new TransactionMessage({ payerKey: Keypair.generate().publicKey, recentBlockhash: hash(1), instructions: [...ours, ...launchIxs()] }).compileToV0Message([table]);
  assert.equal(matchesPrepared(other, expected, [table]), false);
});
