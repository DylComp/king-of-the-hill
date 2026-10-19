import { Keypair } from "@solana/web3.js";
import { collection as collectProfileFees } from "./collection.ts";
import { TREASURY_WALLET } from "../game";
import { connection, collectTx, verifyLaunch } from "../launch/pump";
import { latestCoins } from "../launch/registry";
import { openStore, type Store } from "./store.ts";

export const collection = (store: Store, conn: ReturnType<typeof connection>, signer: Keypair) =>
  collectProfileFees(store, conn, signer, { latestCoins, verifyLaunch, collectTx, officialMint: process.env.PTWR_OFFICIAL_MINT?.trim() });

/** Profile payouts are independent of the unlaunched official token and buyback switch. */
export async function runProfileClaims() {
  if (process.env.PTWR_PROFILE_CLAIMS_ENABLED !== "true") return { outcome: "disabled" };
  if (!TREASURY_WALLET) throw Error("Treasury not configured");
  const signer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(process.env.PTWR_TREASURY_SECRET_KEY || "[]")));
  if (signer.publicKey.toBase58() !== TREASURY_WALLET) throw Error("Treasury signer mismatch");
  const conn = connection();
  if (await conn.getGenesisHash() !== "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d") throw Error("Mainnet required");
  // Pin the collection ledger to its payer, never to the future buyback mint.
  const store = await openStore(TREASURY_WALLET, "profile-fees");
  if (!store) return { outcome: "busy" };
  try {
    const outcome = await collection(store, conn, signer);
    store.state.lastOutcome = outcome;
    await store.save();
    return { outcome, treasury: TREASURY_WALLET, signature: store.state.collection?.signature ?? null, nextCoinOffset: store.state.coinOffset };
  } finally { await store.close(); }
}
