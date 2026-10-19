import { createRequire } from "node:module";
import { Keypair, PublicKey, VersionedTransaction } from "@solana/web3.js";
import { NATIVE_MINT } from "@solana/spl-token";
import bs58 from "bs58";
import { TREASURY_WALLET } from "../game";
import { connection, collectTx, verifyLaunch } from "../launch/pump";
import { getCoin, latestCoins } from "../launch/registry";
import { buybackChain, verifyBuybackPlan } from "./buyback-chain.ts";
import { buybackId, buybackReservation, verifyBuybackSigned, type BuybackPolicy } from "./buyback-model.ts";
import { eligibleRevenue } from "./revenue.ts";
import { openStore, type Store } from "./store.ts";

const require = createRequire(import.meta.url);
const sdk = require("@pump-fun/pump-sdk") as typeof import("@pump-fun/pump-sdk");
const { EventParser } = require("@coral-xyz/anchor") as typeof import("@coral-xyz/anchor");
const MAINNET = "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d";
const min = (a: bigint, b: bigint) => a < b ? a : b;

/** Crawl the treasury's full finalized history, in bounded resumable pages. */
async function scanRevenue(store: Store, conn: ReturnType<typeof connection>, treasury: string) {
  const s = store.state;
  const list = await conn.getSignaturesForAddress(new PublicKey(treasury), {
    limit: 20, before: s.scan.before, until: s.scan.until,
  }, "finalized");
  s.scan.head ??= list[0]?.signature;
  const parser = new EventParser(sdk.PUMP_PROGRAM_ID, sdk.getPumpProgram(conn).coder);
  for (const entry of list) {
    if (entry.err || await store.seen(entry.signature)) continue;
    const tx = await conn.getTransaction(entry.signature, { commitment: "finalized", maxSupportedTransactionVersion: 0 });
    // Never advance a cursor past a pruned/missing receipt.
    if (!tx?.meta) throw Error("Finalized treasury receipt unavailable; scan held");
    if (tx.meta.err) continue;
    if (!tx.meta.logMessages || tx.meta.logMessages.some(l => /log truncated/i.test(l))) throw Error("Incomplete fee receipt logs; scan held");
    let amount = 0n;
    for (const event of parser.parseLogs(tx.meta.logMessages)) {
      if (event.name !== "distributeCreatorFeesEvent") continue;
      const e = event.data as unknown as import("@pump-fun/pump-sdk").DistributeCreatorFeesEvent;
      if (e.mint.toBase58() === s.mint) continue;
      const coin = await getCoin(e.mint.toBase58());
      if (!coin) continue;
      const checked = await verifyLaunch(coin.mint, coin.recipient.wallet, treasury);
      if (!checked.ok) continue;
      amount += eligibleRevenue({
        mint: e.mint.toBase58(), sharingConfig: e.sharingConfig.toBase58(),
        quoteMint: e.quoteMint.toBase58(), distributed: e.distributed.toString(),
        shareholders: e.shareholders.map(x => ({ address: x.address.toBase58(), shareBps: x.shareBps })),
      }, {
        officialMint: s.mint, treasury, recipient: coin.recipient.wallet, registeredMint: coin.mint,
        sharingConfig: sdk.feeSharingConfigPda(e.mint).toBase58(), nativeMint: NATIVE_MINT.toBase58(),
        defaultKey: PublicKey.default.toBase58(),
      });
    }
    s.credit = (BigInt(s.credit) + amount).toString();
    // Receipt ID and credit commit atomically; replay never credits the same payout twice.
    await store.save(entry.signature);
  }
  if (list.length === 20) s.scan.before = list[list.length - 1].signature;
  else s.scan = { until: s.scan.head ?? s.scan.until };
  await store.save();
}

async function collection(store: Store, conn: ReturnType<typeof connection>, signer: Keypair) {
  const s = store.state;
  if (s.collection) {
    const pending = s.collection;
    const tx = await conn.getTransaction(pending.signature, { commitment: "finalized", maxSupportedTransactionVersion: 0 });
    if (tx) {
      if (!tx.meta) throw Error("Collection receipt metadata unavailable");
      s.collection = null;
      await store.save();
      return tx.meta.err ? "collection_failed" : "collection_confirmed";
    }
    if (await conn.getBlockHeight("finalized") > pending.lastValidBlockHeight) return "collection_expired_unresolved";
    await store.maySend();
    await conn.sendRawTransaction(Buffer.from(pending.signed, "base64"), { skipPreflight: false, maxRetries: 3 });
    return "collection_pending";
  }
  const coins = await latestCoins(s.coinOffset, 1);
  s.coinOffset = coins.length ? s.coinOffset + 1 : 0;
  await store.save();
  const coin = coins[0];
  if (!coin || coin.mint === s.mint) return "no_eligible_collection";
  const treasury = signer.publicKey.toBase58();
  if (!(await verifyLaunch(coin.mint, coin.recipient.wallet, treasury)).ok) return "ineligible_collection";
  const built = await collectTx(coin.mint, treasury);
  const tx = VersionedTransaction.deserialize(Buffer.from(built.tx, "base64"));
  const sim = await conn.simulateTransaction(tx, { sigVerify: false, commitment: "confirmed", accounts: { encoding: "base64", addresses: [treasury] } });
  const before = await conn.getBalance(signer.publicKey, "confirmed");
  if (sim.value.err || !sim.value.accounts?.[0] || sim.value.accounts[0].lamports - before < 100_000) return "collection_below_threshold";
  tx.sign([signer]);
  s.collection = { mint: coin.mint, signed: Buffer.from(tx.serialize()).toString("base64"), signature: bs58.encode(tx.signatures[0]), lastValidBlockHeight: built.lastValidBlockHeight };
  await store.save();
  await store.maySend();
  await conn.sendRawTransaction(tx.serialize(), { skipPreflight: false, maxRetries: 3 });
  return "collection_submitted";
}

export async function runBuybacks() {
  const mint = process.env.PTWR_OFFICIAL_MINT?.trim();
  if (!mint) return { outcome: "awaiting_official_mint" };
  if (process.env.PTWR_BUYBACK_ENABLED !== "true") return { outcome: "disabled", mint };
  if (!TREASURY_WALLET) throw Error("Treasury not configured");
  const signer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(process.env.PTWR_TREASURY_SECRET_KEY || "[]")));
  if (signer.publicKey.toBase58() !== TREASURY_WALLET) throw Error("Treasury signer mismatch");
  const conn = connection();
  if (await conn.getGenesisHash() !== MAINNET) throw Error("Mainnet required");
  const store = await openStore(new PublicKey(mint).toBase58());
  if (!store) return { outcome: "busy" };
  const s = store.state;
  try {
    const policy: BuybackPolicy = {
      treasury: TREASURY_WALLET, mint, maxInput: "10000000", maxOverhead: "9000000",
      dailyCap: "1000000000", slippageBps: 100, revenueReserve: "20000000",
    };
    const chain = buybackChain(conn, policy);
    const day = new Date().toISOString().slice(0, 10);
    if (s.day !== day) { s.day = day; s.dailyDebit = "0"; }
    if (s.pending) {
      const reconciled = await chain.reconcile(s.pending);
      if (reconciled.kind !== "settled") {
        if (reconciled.kind === "pending") {
          await store.maySend();
          await chain.send(s.pending);
        }
        return { outcome: reconciled.kind, signature: s.pending.signature };
      }
      s.debit = (BigInt(s.debit) + BigInt(reconciled.receipt.debit)).toString();
      s.dailyDebit = (BigInt(s.dailyDebit) + BigInt(reconciled.receipt.debit)).toString();
      s.burned = (BigInt(s.burned) + BigInt(reconciled.receipt.burned)).toString();
      s.lastOutcome = reconciled.receipt.success ? "burn_confirmed" : "buy_failed";
      s.lastBuyback = { signature: s.pending.signature, ...reconciled.receipt };
      s.pending = null;
      await store.save(`buyback:${s.lastBuyback.signature}`);
    }
    // Settle a prior collection before buying; new collection proceeds are indexed from receipts.
    if (s.collection) {
      const outcome = await collection(store, conn, signer);
      if (s.collection) return { outcome };
    }
    await scanRevenue(store, conn, TREASURY_WALLET);
    const available = min(BigInt(s.credit) - BigInt(s.debit), BigInt(policy.dailyCap) - BigInt(s.dailyDebit));
    if (available >= 10_000_000n) {
      const plan = await chain.prepare(available.toString());
      if (plan) {
        await verifyBuybackPlan(plan);
        if (Date.now() - plan.preparedAt > 30_000) throw Error("Fresh buyback plan required");
        if (BigInt(buybackReservation(plan)) > available) throw Error("Buyback exceeds revenue budget");
        const tx = VersionedTransaction.deserialize(Buffer.from(plan.unsigned, "base64"));
        tx.sign([signer]);
        const signed = Buffer.from(tx.serialize()).toString("base64");
        s.pending = { id: buybackId(plan), plan, signed, signature: verifyBuybackSigned(plan, signed) };
        await store.save();
        await store.maySend();
        await chain.send(s.pending);
        return { outcome: "buy_and_burn_submitted", signature: s.pending.signature };
      }
    }
    const outcome = await collection(store, conn, signer);
    s.lastOutcome = outcome;
    await store.save();
    return { outcome, eligibleLamports: s.credit, spentLamports: s.debit, burnedRaw: s.burned };
  } finally { await store.close(); }
}
