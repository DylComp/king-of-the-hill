// Server-only: the treasury's two jobs. Paying out every launched coin's waiting creator fees
// (anyone can trigger it; pump.fun sends 80/20 straight to the shareholders), and buying back
// $PTWR with the treasury's SOL and burning it in the same transaction. Both are built here
// unsigned; a person signs each one in their wallet. Nothing here holds or uses a key.
import { createRequire } from "node:module";
import {
  AddressLookupTableAccount,
  ComputeBudgetProgram,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
  type ParsedInstruction,
} from "@solana/web3.js";
import { createBurnCheckedInstruction, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { HOUSE_MINT, TREASURY_WALLET } from "../game";
import { getJson, hasDb, pipeline, redis } from "../redis";
import { loadLookupTable } from "./alt";
import { connection } from "./pump";
import { latestCoins } from "./registry";

const require = createRequire(import.meta.url);
const sdk = require("@pump-fun/pump-sdk") as typeof import("@pump-fun/pump-sdk");
const { OnlinePumpSdk, creatorVaultPda, feeSharingConfigPda } = sdk;

const SOL = "So11111111111111111111111111111111111111112";
const JUPITER = "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4";
const ALLOWED = new Set([
  JUPITER,
  "ComputeBudget111111111111111111111111111111",
  "11111111111111111111111111111111",
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
]);
/** pump.fun coins start with a billion tokens at 6 decimals; anything missing from the supply was burned. */
const START_SUPPLY = 1_000_000_000n * 1_000_000n;
/** Below this a payout costs more in network fees than it moves. */
export const MIN_PAYOUT_SOL = 0.005;
/** The treasury always keeps this much SOL for network fees. */
export const TREASURY_RESERVE_SOL = 0.02;
const SLIPPAGE_BPS = 300;
const MAX_PAYOUT_TXS = 4;

const k = { burns: "pt:burns", burn: (sig: string) => `pt:burn:${sig}` };

export type Burn = { signature: string; at: number; sol: number; tokens: number };
export type TreasuryState = {
  treasury: string | null;
  houseMint: string | null;
  balanceSol: number;
  spendableSol: number;
  burnedTokens: number;
  burnedPct: number;
  waitingSol: number;
  waitingCoins: number;
  burns: Burn[];
};

const pk = (a: string) => new PublicKey(a);

/** Every launched coin with enough fees waiting in its creator vault to be worth paying out. */
async function readyCoins(): Promise<{ mint: string; sol: number }[]> {
  const coins = await latestCoins(0, 500);
  if (!coins.length) return [];
  const conn = connection();
  const vaults = coins.map((c) => creatorVaultPda(feeSharingConfigPda(pk(c.mint))));
  const rent = await conn.getMinimumBalanceForRentExemption(0);
  const out: { mint: string; sol: number }[] = [];
  for (let i = 0; i < vaults.length; i += 100) {
    const infos = await conn.getMultipleAccountsInfo(vaults.slice(i, i + 100), "confirmed");
    infos.forEach((a, j) => {
      const sol = Math.max(0, (a?.lamports ?? 0) - rent) / 1e9;
      if (sol >= MIN_PAYOUT_SOL) out.push({ mint: coins[i + j].mint, sol });
    });
  }
  return out.sort((a, b) => b.sol - a.sol);
}

export async function treasuryState(): Promise<TreasuryState> {
  const conn = connection();
  const [ready, balance, supply, burns] = await Promise.all([
    readyCoins().catch(() => []),
    TREASURY_WALLET ? conn.getBalance(pk(TREASURY_WALLET), "confirmed") : Promise.resolve(0),
    HOUSE_MINT ? conn.getTokenSupply(pk(HOUSE_MINT), "confirmed").then((s) => BigInt(s.value.amount)) : Promise.resolve(START_SUPPLY),
    recentBurns(),
  ]);
  const burned = supply < START_SUPPLY ? START_SUPPLY - supply : 0n;
  return {
    treasury: TREASURY_WALLET,
    houseMint: HOUSE_MINT,
    balanceSol: balance / 1e9,
    spendableSol: Math.max(0, balance / 1e9 - TREASURY_RESERVE_SOL),
    burnedTokens: Number(burned) / 1e6,
    burnedPct: Number((burned * 1_000_000n) / START_SUPPLY) / 10_000,
    waitingSol: ready.reduce((s, c) => s + c.sol, 0),
    waitingCoins: ready.length,
    burns,
  };
}

/**
 * Unsigned transactions that pay out every coin with fees waiting, packed as many coins per
 * transaction as fit. Whoever signs only covers the network fee; the SOL goes 80/20 to each
 * coin's recipient and the treasury, exactly as pump.fun locked it at launch.
 */
export async function payoutAllTxs(payer: string): Promise<{ txs: string[]; coins: number; sol: number }> {
  const p = pk(payer);
  const ready = await readyCoins();
  if (!ready.length) throw Error("No coin has enough fees waiting yet. Check back later.");
  const conn = connection();
  const online = new OnlinePumpSdk(conn);
  const table = await loadLookupTable();
  const latest = await conn.getLatestBlockhash("confirmed");
  const budget = [ComputeBudgetProgram.setComputeUnitLimit({ units: 1_000_000 }), ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1_000 })];
  const compile = (ixs: TransactionInstruction[]) => {
    const tx = new VersionedTransaction(new TransactionMessage({ payerKey: p, recentBlockhash: latest.blockhash, instructions: [...budget, ...ixs] }).compileToV0Message(table ? [table] : []));
    try {
      return tx.serialize().length <= 1232 ? tx : null;
    } catch {
      return null;
    }
  };

  const batches: { tx: VersionedTransaction; mints: string[] }[] = [];
  let ixs: TransactionInstruction[] = [];
  let mints: string[] = [];
  let built: VersionedTransaction | null = null;
  for (const c of ready) {
    if (batches.length >= MAX_PAYOUT_TXS) break;
    const mine = (await online.buildDistributeCreatorFeesInstructions(pk(c.mint), { payer: p })).instructions;
    const tried = compile([...ixs, ...mine]);
    if (tried) {
      ixs = [...ixs, ...mine];
      mints = [...mints, c.mint];
      built = tried;
      continue;
    }
    if (built) batches.push({ tx: built, mints });
    const alone = compile(mine);
    [ixs, mints, built] = alone ? [mine, [c.mint], alone] : [[], [], null];
  }
  if (built && batches.length < MAX_PAYOUT_TXS) batches.push({ tx: built, mints });

  const good: typeof batches = [];
  for (const b of batches) {
    const sim = await conn.simulateTransaction(b.tx, { sigVerify: false, commitment: "confirmed" });
    if (sim.value.err) console.error("payout-all simulation", b.mints, JSON.stringify(sim.value.err), sim.value.logs?.slice(-4));
    else good.push(b);
  }
  if (!good.length) throw Error("The payout didn't pass a dry run. Make sure this wallet has a little SOL for fees.");
  const paid = new Set(good.flatMap((b) => b.mints));
  return {
    txs: good.map((b) => Buffer.from(b.tx.serialize()).toString("base64")),
    coins: paid.size,
    sol: ready.filter((c) => paid.has(c.mint)).reduce((s, c) => s + c.sol, 0),
  };
}

// --- buy and burn ----------------------------------------------------------------------------

type JupIx = { programId: string; accounts: { pubkey: string; isSigner: boolean; isWritable: boolean }[]; data: string };
type Quote = { inputMint: string; outputMint: string; inAmount: string; outAmount: string; otherAmountThreshold: string; priceImpactPct?: string };

const jupBase = () => (process.env.JUPITER_API_KEY ? "https://api.jup.ag/swap/v1" : "https://lite-api.jup.ag/swap/v1");
async function jupiter<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(jupBase() + path, {
    ...init,
    headers: { "content-type": "application/json", ...(process.env.JUPITER_API_KEY ? { "x-api-key": process.env.JUPITER_API_KEY } : {}) },
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null);
  if (!res) throw Error("The swap provider didn't respond. Try again.");
  if (res.status === 429) throw Error("The swap provider is busy. Try again in a few seconds.");
  const data = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!res.ok || !data || data.error) throw Error(res.status < 500 ? `No swap route to $PTWR right now.` : "The swap provider is down. Try again later.");
  return data;
}

const toIx = (i: JupIx) =>
  new TransactionInstruction({
    programId: pk(i.programId),
    keys: i.accounts.map((a) => ({ pubkey: pk(a.pubkey), isSigner: a.isSigner, isWritable: a.isWritable })),
    data: Buffer.from(i.data, "base64"),
  });

/** Every instruction must come from a known program and need no signer but the treasury. */
export function checkBuyback(ixs: TransactionInstruction[], treasury: string) {
  for (const i of ixs) {
    if (!ALLOWED.has(i.programId.toBase58())) throw Error("The swap route uses an unreviewed program.");
    if (i.keys.some((a) => a.isSigner && a.pubkey.toBase58() !== treasury)) throw Error("The swap route needs an unexpected signer.");
  }
  if (!ixs.some((i) => i.programId.toBase58() === JUPITER)) throw Error("Swap instruction missing.");
}

/**
 * One transaction: swap `sol` of the treasury's SOL into $PTWR through Jupiter, then burn the
 * swap's guaranteed minimum plus any $PTWR already sitting in the treasury. Only the treasury
 * wallet can sign it, and it simulates clean before it comes back.
 */
export async function buybackTx(sol: number) {
  if (!HOUSE_MINT) throw Error(`Buybacks start once $PTWR is launched.`);
  if (!TREASURY_WALLET) throw Error("The treasury wallet isn't set yet.");
  const treasury = pk(TREASURY_WALLET);
  const mint = pk(HOUSE_MINT);
  const conn = connection();
  const [balance, mintInfo] = await Promise.all([conn.getBalance(treasury, "confirmed"), conn.getAccountInfo(mint, "confirmed")]);
  if (!mintInfo) throw Error("Can't read $PTWR right now, try again.");
  const spendable = balance - TREASURY_RESERVE_SOL * 1e9;
  const lamports = Math.floor(Math.min(sol, spendable / 1e9) * 1e9);
  if (!(lamports >= 1_000_000)) throw Error(`The treasury needs more than ${TREASURY_RESERVE_SOL} SOL to buy back.`);

  const program = mintInfo.owner;
  const ata = getAssociatedTokenAddressSync(mint, treasury, false, program);
  const held = await conn.getTokenAccountBalance(ata, "confirmed").then((b) => BigInt(b.value.amount), () => 0n);

  const q = await jupiter<Quote>(
    "/quote?" + new URLSearchParams({ inputMint: SOL, outputMint: HOUSE_MINT, amount: String(lamports), swapMode: "ExactIn", slippageBps: String(SLIPPAGE_BPS), restrictIntermediateTokens: "true" }),
  );
  if (q.inputMint !== SOL || q.outputMint !== HOUSE_MINT || BigInt(q.inAmount) !== BigInt(lamports)) throw Error("Unexpected swap quote.");
  const ix = await jupiter<{ computeBudgetInstructions?: JupIx[]; setupInstructions?: JupIx[]; swapInstruction: JupIx; cleanupInstruction?: JupIx; addressLookupTableAddresses?: string[] }>(
    "/swap-instructions",
    {
      method: "POST",
      body: JSON.stringify({
        quoteResponse: q,
        userPublicKey: TREASURY_WALLET,
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: { priorityLevelWithMaxLamports: { maxLamports: 200_000, priorityLevel: "high" } },
      }),
    },
  );
  const burn = held + BigInt(q.otherAmountThreshold);
  const ixs = [...(ix.computeBudgetInstructions ?? []), ...(ix.setupInstructions ?? []), ix.swapInstruction, ...(ix.cleanupInstruction ? [ix.cleanupInstruction] : [])].map(toIx);
  checkBuyback(ixs, TREASURY_WALLET);
  ixs.push(createBurnCheckedInstruction(ata, mint, treasury, burn, 6, [], program));

  const lutKeys = ix.addressLookupTableAddresses ?? [];
  if (lutKeys.length > 4) throw Error("That swap route is too complex, try a smaller amount.");
  const luts = (await conn.getMultipleAccountsInfo(lutKeys.map(pk), "confirmed")).map((a, i) => {
    if (!a) throw Error("Can't load the swap route, try again.");
    return new AddressLookupTableAccount({ key: pk(lutKeys[i]), state: AddressLookupTableAccount.deserialize(a.data) });
  });
  const latest = await conn.getLatestBlockhash("confirmed");
  const tx = new VersionedTransaction(new TransactionMessage({ payerKey: treasury, recentBlockhash: latest.blockhash, instructions: ixs }).compileToV0Message(luts));
  let bytes: Uint8Array;
  try {
    bytes = tx.serialize();
  } catch {
    throw Error("That swap route doesn't fit in one transaction, try a smaller amount.");
  }
  const sim = await conn.simulateTransaction(tx, { sigVerify: false, commitment: "confirmed" });
  if (sim.value.err) {
    console.error("buyback simulation", JSON.stringify(sim.value.err), sim.value.logs?.slice(-6));
    throw Error("The buyback failed a dry run. Try again, or a smaller amount.");
  }
  return {
    tx: Buffer.from(bytes).toString("base64"),
    lastValidBlockHeight: latest.lastValidBlockHeight,
    sol: lamports / 1e9,
    burnTokens: Number(burn) / 1e6,
    priceImpactPct: q.priceImpactPct ? Number(q.priceImpactPct) : null,
  };
}

/**
 * Records a buyback for the history list, after reading it back off chain: it must have landed,
 * been signed by the treasury and burned $PTWR. Anyone can report one; only real burns count.
 */
export async function recordBurn(signature: string): Promise<Burn | null> {
  if (!HOUSE_MINT || !TREASURY_WALLET || !hasDb()) return null;
  const known = await getJson<Burn>(k.burn(signature));
  if (known) return known;
  const tx = await connection().getParsedTransaction(signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
  if (!tx || tx.meta?.err) return null;
  const keys = tx.transaction.message.accountKeys;
  if (keys[0]?.pubkey.toBase58() !== TREASURY_WALLET || !keys[0].signer) return null;
  let raw = 0n;
  for (const i of tx.transaction.message.instructions as ParsedInstruction[]) {
    const p = i.parsed as { type?: string; info?: { mint?: string; authority?: string; amount?: string; tokenAmount?: { amount: string } } } | undefined;
    if (!p || (p.type !== "burn" && p.type !== "burnChecked")) continue;
    if (p.info?.mint !== HOUSE_MINT || p.info.authority !== TREASURY_WALLET) continue;
    raw += BigInt(p.info.amount ?? p.info.tokenAmount?.amount ?? 0);
  }
  if (raw === 0n) return null;
  const spent = (tx.meta!.preBalances[0] - tx.meta!.postBalances[0]) / 1e9;
  const b: Burn = { signature, at: (tx.blockTime ?? Math.floor(Date.now() / 1000)) * 1000, sol: Math.max(0, spent), tokens: Number(raw) / 1e6 };
  await pipeline([
    ["SET", k.burn(signature), JSON.stringify(b)],
    ["ZADD", k.burns, b.at, signature],
  ]);
  return b;
}

export async function recentBurns(count = 20): Promise<Burn[]> {
  if (!hasDb()) return [];
  const sigs = await redis<string[]>("ZREVRANGE", k.burns, 0, count - 1).catch(() => []);
  if (!sigs.length) return [];
  const raw = await redis<(string | null)[]>("MGET", ...sigs.map(k.burn));
  return raw.flatMap((r) => (r ? [JSON.parse(r) as Burn] : []));
}
