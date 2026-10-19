import { Keypair, PublicKey } from "@solana/web3.js";
import { DEV_WALLET } from "../game";
import { connection } from "../launch/pump";
import { prepareCollection } from "./chain.ts";
import { collectionReceipt, verifiedPending, DAILY_NETWORK_CAP, MAX_NETWORK_FEE } from "./model.ts";
import { openDevFeeStore } from "./store.ts";

export async function runDevFeeCollection() {
  const mint = process.env.PTWR_OFFICIAL_MINT?.trim();
  if (!mint) return { outcome: "awaiting_official_mint" };
  if (process.env.PTWR_DEV_FEE_COLLECTION_ENABLED !== "true") return { outcome: "disabled" };
  if (!DEV_WALLET) throw Error("Dev wallet not configured");
  const signer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(process.env.PTWR_DEV_SECRET_KEY || "[]")));
  if (signer.publicKey.toBase58() !== DEV_WALLET) throw Error("Dev signer mismatch");
  const conn = connection();
  if (await conn.getGenesisHash() !== "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d") throw Error("Mainnet required");
  const store = await openDevFeeStore(new PublicKey(mint).toBase58(), DEV_WALLET);
  if (!store) return { outcome: "busy" };
  const s = store.state;
  try {
    const day = new Date().toISOString().slice(0, 10);
    if (s.day !== day) { s.day = day; s.dailyNetworkFees = "0"; }
    if (s.pending) {
      if (s.pending.mint !== mint || s.pending.dev !== DEV_WALLET) throw Error("Pending dev collection identity mismatch");
      verifiedPending(s.pending);
      const tx = await conn.getTransaction(s.pending.signature, { commitment: "finalized", maxSupportedTransactionVersion: 0 });
      if (tx) {
        const receipt = collectionReceipt(s.pending, tx);
        s.totalNetLamports = (BigInt(s.totalNetLamports) + BigInt(receipt.netLamports)).toString();
        s.dailyNetworkFees = (BigInt(s.dailyNetworkFees) + BigInt(receipt.networkFee)).toString();
        s.lastReceipt = receipt;
        s.nextLeg = s.pending.leg === "curve" ? "amm" : "curve";
        s.pending = null;
        await store.save();
        return { outcome: receipt.success ? "collected" : "collection_failed", ...receipt };
      }
      if (await conn.getBlockHeight("finalized") > s.pending.lastValidBlockHeight) return { outcome: "expired_unresolved", signature: s.pending.signature };
    } else {
      if (BigInt(s.dailyNetworkFees) + MAX_NETWORK_FEE > DAILY_NETWORK_CAP) return { outcome: "daily_network_limit" };
      const pending = await prepareCollection(conn, new PublicKey(mint), signer, s.nextLeg);
      if (!pending) return { outcome: "below_threshold_or_needs_gas" };
      verifiedPending(pending);
      s.pending = pending;
      // Commit signed bytes before sending: a crash/retry never creates a second attempt.
      await store.save();
    }
    await store.maySend();
    const signature = await conn.sendRawTransaction(Buffer.from(s.pending.signed, "base64"), { skipPreflight: false, maxRetries: 3 });
    if (signature !== s.pending.signature) throw Error("Collection submission mismatch");
    return { outcome: "submitted", signature, recipient: DEV_WALLET };
  } finally { await store.close(); }
}
