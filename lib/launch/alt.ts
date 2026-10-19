// The launchpad's address lookup table. A full launch (create, 80/20 split, dev buy) is
// about 1.5 KB with every account written out, over Solana's 1,232 byte limit. The
// accounts every launch shares (pump programs, global config, fee recipients, the
// treasury) go in one lookup table, which shrinks each to a 1 byte index.
import { createRequire } from "node:module";
import { AddressLookupTableAccount, AddressLookupTableProgram, Keypair, PublicKey, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { NATIVE_MINT, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID, createAssociatedTokenAccountIdempotentInstruction, getAssociatedTokenAddressSync } from "@solana/spl-token";
import type { Global } from "@pump-fun/pump-sdk";
import { hasDb, redis } from "../redis";
import { connection } from "./pump";

const require = createRequire(import.meta.url);
const sdk = require("@pump-fun/pump-sdk") as typeof import("@pump-fun/pump-sdk");
const BN = require("bn.js") as typeof import("bn.js");
const { PUMP_SDK, GLOBAL_PDA, PUMP_PROGRAM_ID, feeSharingConfigPda } = sdk;

const KEY = "pt:launch:alt";

/** Keys used by two unrelated sample launches: everything that isn't per-launch. */
async function sampleKeys(global: Global, treasury: PublicKey) {
  const one = async () => {
    const user = Keypair.generate().publicKey;
    const mint = Keypair.generate().publicKey;
    const recipient = Keypair.generate().publicKey;
    const ixs = [
      await PUMP_SDK.createV2Instruction({ user, creator: user, mint, name: "x", symbol: "X", uri: "https://x.y", mayhemMode: false, cashback: false, holderReward: false, quoteMint: NATIVE_MINT, quoteTokenProgram: TOKEN_PROGRAM_ID }),
      await PUMP_SDK.createFeeSharingConfig({ creator: user, mint, pool: null }),
      await PUMP_SDK.updateFeeShares({ authority: user, mint, currentShareholders: [user], newShareholders: [{ address: recipient, shareBps: 8000 }, { address: treasury, shareBps: 2000 }], bondingCurveComplete: false }),
      createAssociatedTokenAccountIdempotentInstruction(user, getAssociatedTokenAddressSync(mint, user, false, TOKEN_2022_PROGRAM_ID), user, mint, TOKEN_2022_PROGRAM_ID),
      await PUMP_SDK.getBuyInstructionRaw({
        user,
        mint,
        creator: feeSharingConfigPda(mint),
        amount: new BN(1),
        solAmount: new BN(1),
        feeRecipient: global.feeRecipient,
        buybackFeeRecipient: global.buybackFeeRecipients[0],
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      }),
    ];
    return new Set(ixs.flatMap((ix) => [ix.programId, ...ix.keys.filter((k) => !k.isSigner).map((k) => k.pubkey)]).map((k) => k.toBase58()));
  };
  const [a, b] = [await one(), await one()];
  const shared = [...a].filter((k) => b.has(k));
  // Every possible pump fee recipient, so whichever the program expects is in the table.
  const extra = [...global.feeRecipients, global.feeRecipient, ...global.buybackFeeRecipients, treasury, sdk.PUMP_FEE_PROGRAM_ID]
    .filter((k) => !k.equals(PublicKey.default))
    .map((k) => k.toBase58());
  return [...new Set([...shared, ...extra])];
}

/** The table's address once someone has created and frozen it, or null. */
export async function lookupTableAddress(): Promise<string | null> {
  if (!hasDb()) return null;
  return redis<string | null>("GET", KEY).catch(() => null);
}

export async function loadLookupTable(): Promise<AddressLookupTableAccount | null> {
  const addr = await lookupTableAddress();
  if (!addr) return null;
  const res = await connection().getAddressLookupTable(new PublicKey(addr));
  return res.value && res.value.isActive() ? res.value : null;
}

/** Every account the table should hold, read from pump.fun's live config. */
export async function tableAddresses(treasury: string) {
  const g = await connection().getAccountInfo(GLOBAL_PDA, "confirmed");
  if (!g?.owner.equals(PUMP_PROGRAM_ID)) throw Error("pump.fun is unavailable right now.");
  return (await sampleKeys(PUMP_SDK.decodeGlobal(g), new PublicKey(treasury))).map((a) => new PublicKey(a));
}

/**
 * Unsigned transactions that create, fill and then freeze the table, paid for by `authority`.
 * Freezing drops the authority for good, so whoever pays for it keeps no control over the
 * table: nobody can change, deactivate or close it afterwards. The first launch on the site
 * signs these together with the launch itself, so no launcher ever sees a setup step.
 */
export async function buildTable(authority: string, addresses: PublicKey[], blockhash: string) {
  const auth = new PublicKey(authority);
  const slot = await connection().getSlot("finalized");
  const [create, table] = AddressLookupTableProgram.createLookupTable({ authority: auth, payer: auth, recentSlot: slot });
  const txs: VersionedTransaction[] = [];
  const CHUNK = 20;
  for (let i = 0; i < addresses.length; i += CHUNK) {
    const extend = AddressLookupTableProgram.extendLookupTable({ lookupTable: table, authority: auth, payer: auth, addresses: addresses.slice(i, i + CHUNK) });
    const last = i + CHUNK >= addresses.length;
    const freeze = AddressLookupTableProgram.freezeLookupTable({ lookupTable: table, authority: auth });
    const ixs = [...(i === 0 ? [create] : []), extend, ...(last ? [freeze] : [])];
    txs.push(new VersionedTransaction(new TransactionMessage({ payerKey: auth, recentBlockhash: blockhash, instructions: ixs }).compileToV0Message()));
  }
  // The launch is compiled against the table before it exists; the addresses are known.
  const account = new AddressLookupTableAccount({ key: table, state: { deactivationSlot: BigInt("18446744073709551615"), lastExtendedSlot: 0, lastExtendedSlotStartIndex: 0, authority: undefined, addresses } });
  return { table: table.toBase58(), account, txs };
}

/** True once the table is on chain, holds every expected address, is frozen and usable. */
export async function tableReady(table: string, expected: string[]) {
  const conn = connection();
  const [res, slot] = await Promise.all([conn.getAddressLookupTable(new PublicKey(table)), conn.getSlot("confirmed")]);
  if (!res.value || res.value.state.authority) return false;
  const have = new Set(res.value.state.addresses.map((a) => a.toBase58()));
  return expected.every((a) => have.has(a)) && slot > res.value.state.lastExtendedSlot;
}

/** Records the table for every later launch. The first one recorded stays. */
export async function saveTable(table: string) {
  if (hasDb()) await redis("SET", KEY, table, "NX");
}
