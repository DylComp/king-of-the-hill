import { createPublicKey, verify } from "node:crypto";
import { PublicKey, VersionedTransaction, type VersionedTransactionResponse } from "@solana/web3.js";
import bs58 from "bs58";

export type Pending = { mint: string; dev: string; leg: "curve" | "amm"; signed: string; signature: string; lastValidBlockHeight: number; temporaryAccount?: string };
export const MIN_CLAIM = 1_000_000n;
export const MAX_NETWORK_FEE = 100_000n;
export const DAILY_NETWORK_CAP = 1_000_000n;
export function standardDevCreator(o: { creator: string; dev: string; quote: string; native: string; cashback: boolean; holderReward: boolean; mayhem: boolean }) {
  return o.creator === o.dev && [o.native, PublicKey.default.toBase58()].includes(o.quote) && !o.cashback && !o.holderReward && !o.mayhem;
}
export function verifiedPending(p: Pending) {
  const tx = VersionedTransaction.deserialize(Buffer.from(p.signed, "base64"));
  if (tx.serialize().length > 1232 || tx.message.addressTableLookups.length ||
      tx.message.staticAccountKeys[0].toBase58() !== p.dev || bs58.encode(tx.signatures[0]) !== p.signature ||
      tx.signatures.length !== (p.temporaryAccount ? 2 : 1) || !Number.isSafeInteger(p.lastValidBlockHeight) || p.lastValidBlockHeight < 1) throw Error("Invalid dev collection attempt");
  if (p.temporaryAccount && tx.message.staticAccountKeys[1].toBase58() !== p.temporaryAccount) throw Error("Invalid temporary collection account");
  for (let i = 0; i < tx.signatures.length; i++) {
    const key = createPublicKey({ key: Buffer.concat([Buffer.from("302a300506032b6570032100", "hex"), tx.message.staticAccountKeys[i].toBuffer()]), format: "der", type: "spki" });
    if (!verify(null, tx.message.serialize(), key, tx.signatures[i])) throw Error("Invalid collection signature");
  }
  return tx;
}
export function collectionReceipt(p: Pending, tx: VersionedTransactionResponse) {
  const saved = verifiedPending(p), meta = tx.meta;
  if (!meta || tx.transaction.signatures[0] !== p.signature || !Buffer.from(tx.transaction.message.serialize()).equals(Buffer.from(saved.message.serialize()))) throw Error("Collection receipt mismatch");
  const [before, after, fee] = [meta.preBalances[0], meta.postBalances[0], meta.fee];
  if (![before, after, fee].every(n => Number.isSafeInteger(n) && n >= 0) || BigInt(fee) > MAX_NETWORK_FEE) throw Error("Invalid collection balances");
  const net = BigInt(after) - BigInt(before);
  if (meta.err ? net !== -BigInt(fee) : net <= 0n) throw Error("Collection did not preserve dev funds");
  if (p.temporaryAccount) {
    const i = saved.message.staticAccountKeys.findIndex(k => k.toBase58() === p.temporaryAccount);
    if (meta.preBalances[i] !== 0 || meta.postBalances[i] !== 0) throw Error("Temporary fee account was not closed");
  }
  return { signature: p.signature, success: !meta.err, slot: tx.slot, netLamports: net.toString(), networkFee: String(fee) };
}
