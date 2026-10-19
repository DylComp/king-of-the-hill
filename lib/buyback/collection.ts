import { Keypair, VersionedTransaction, type Connection } from "@solana/web3.js";
import bs58 from "bs58";
import type { Store } from "./store.ts";
export type CollectionDeps = {
  officialMint?: string;
  latestCoins: (offset: number, count: number) => Promise<{ mint: string; recipient: { wallet: string } }[]>;
  verifyLaunch: (mint: string, recipient: string, treasury: string) => Promise<{ ok: boolean }>;
  collectTx: (mint: string, payer: string, priority: number) => Promise<{ tx: string; lastValidBlockHeight: number }>;
};
export async function collection(store: Store, conn: Connection, signer: Keypair, deps: CollectionDeps) {
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
  const coins = await deps.latestCoins(s.coinOffset, 1);
  s.coinOffset = coins.length ? s.coinOffset + 1 : 0;
  await store.save();
  const coin = coins[0];
  if (!coin || coin.mint === deps.officialMint) return "no_eligible_collection";
  const treasury = signer.publicKey.toBase58();
  if (!(await deps.verifyLaunch(coin.mint, coin.recipient.wallet, treasury)).ok) return "ineligible_collection";
  if (await conn.getBalance(signer.publicKey, "confirmed") < 2_000_000) return "collection_needs_gas";
  const built = await deps.collectTx(coin.mint, treasury, 200_000);
  const tx = VersionedTransaction.deserialize(Buffer.from(built.tx, "base64"));
  const fee = (await conn.getFeeForMessage(tx.message, "confirmed")).value;
  if (fee === null || fee > 100_000) return "collection_network_fee_too_high";
  const sim = await conn.simulateTransaction(tx, { sigVerify: false, commitment: "confirmed", accounts: { encoding: "base64", addresses: [treasury] } });
  const before = await conn.getBalance(signer.publicKey, "confirmed");
  if (sim.value.err || !sim.value.accounts?.[0] || sim.value.accounts[0].lamports - before < 100_000) return "collection_below_threshold";
  if (tx.message.header.numRequiredSignatures !== 1 || !tx.message.staticAccountKeys[0].equals(signer.publicKey)) throw Error("Collection signer mismatch");
  tx.sign([signer]);
  s.collection = { mint: coin.mint, signed: Buffer.from(tx.serialize()).toString("base64"), signature: bs58.encode(tx.signatures[0]), lastValidBlockHeight: built.lastValidBlockHeight };
  await store.save();
  await store.maySend();
  await conn.sendRawTransaction(tx.serialize(), { skipPreflight: false, maxRetries: 3 });
  return "collection_submitted";
}


