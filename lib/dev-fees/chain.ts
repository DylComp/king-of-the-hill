import { createRequire } from "node:module";
import { ComputeBudgetProgram, Keypair, PublicKey, SystemProgram, TransactionMessage, VersionedTransaction, type Connection } from "@solana/web3.js";
import { ACCOUNT_SIZE, NATIVE_MINT, TOKEN_PROGRAM_ID, createInitializeAccount3Instruction, createCloseAccountInstruction, unpackAccount } from "@solana/spl-token";
import bs58 from "bs58";
import { MIN_CLAIM, MAX_NETWORK_FEE, standardDevCreator, type Pending } from "./model.ts";
const require = createRequire(import.meta.url);
const sdk = require("@pump-fun/pump-sdk") as typeof import("@pump-fun/pump-sdk");
const amm = require("@pump-fun/pump-swap-sdk") as typeof import("@pump-fun/pump-swap-sdk");

export async function prepareCollection(conn: Connection, mint: PublicKey, signer: Keypair, preferred: "curve" | "amm"): Promise<Pending | null> {
  const dev = signer.publicKey;
  const vault = sdk.creatorVaultPda(dev), poolAddress = sdk.canonicalPumpPoolPda(mint);
  const ammAuthority = amm.coinCreatorVaultAuthorityPda(dev), ammVault = amm.coinCreatorVaultAtaPda(ammAuthority, NATIVE_MINT, TOKEN_PROGRAM_ID);
  const result = await conn.getMultipleAccountsInfoAndContext([sdk.bondingCurvePda(mint), poolAddress, vault, ammVault, dev], "confirmed");
  const [c, poolInfo, nativeVault, tokenVault, wallet] = result.value;
  if (!c?.owner.equals(sdk.PUMP_PROGRAM_ID) || c.executable) throw Error("Official curve unavailable");
  const curve = sdk.PUMP_SDK.decodeBondingCurve(c);
  const isDirect = (creator: PublicKey, quote: PublicKey, cashback: boolean, holderReward: boolean, mayhem: boolean) => standardDevCreator({ creator: creator.toBase58(), dev: dev.toBase58(), quote: quote.toBase58(), native: NATIVE_MINT.toBase58(), cashback, holderReward, mayhem });
  if (!isDirect(curve.creator, curve.quoteMint, curve.isCashbackCoin, curve.isHolderReward, curve.isMayhemMode)) throw Error("Official mint does not pay standard fees to the dev wallet");
  if (!wallet || !wallet.owner.equals(SystemProgram.programId) || wallet.data.length || wallet.executable || wallet.lamports < 10_000_000) return null;
  const pumpProgram = sdk.getPumpProgram(conn), ammProgram = sdk.getPumpAmmProgram(conn);
  let poolFees = 0n;
  if (poolInfo) {
    if (!poolInfo.owner.equals(sdk.PUMP_AMM_PROGRAM_ID) || poolInfo.executable) throw Error("Invalid official AMM pool owner");
    const pool = ammProgram.coder.accounts.decode("pool", Buffer.concat([poolInfo.data, Buffer.alloc(Math.max(0, ammProgram.account.pool.size - poolInfo.data.length))])) as ReturnType<typeof amm.PUMP_AMM_SDK.decodePool> & { creatorFees: import("bn.js"); isHolderReward: boolean };
    if (!pool.baseMint.equals(mint) || !pool.creator.equals(sdk.pumpPoolAuthorityPda(mint)) || !isDirect(pool.coinCreator, pool.quoteMint, pool.isCashbackCoin, pool.isHolderReward, pool.isMayhemMode)) throw Error("Official AMM pool does not pay the dev wallet");
    poolFees = BigInt(pool.creatorFees.toString());
  }
  const rent = await conn.getMinimumBalanceForRentExemption(0);
  if (nativeVault && (!nativeVault.owner.equals(SystemProgram.programId) || nativeVault.data.length !== 0 || nativeVault.executable)) throw Error("Invalid creator vault");
  const curveFees = BigInt(curve.creatorFee.toString());
  const nativeDue = BigInt(Math.max(0, (nativeVault?.lamports ?? 0) - rent)) + curveFees;
  let tokenDue = poolFees;
  if (tokenVault) {
    const a = unpackAccount(ammVault, tokenVault, TOKEN_PROGRAM_ID);
    if (!a.owner.equals(ammAuthority) || !a.mint.equals(NATIVE_MINT) || !a.isNative || a.isFrozen) throw Error("Invalid AMM creator vault");
    tokenDue += a.amount;
  }
  const due = { curve: nativeDue, amm: tokenDue };
  const other = preferred === "curve" ? "amm" : "curve";
  const leg = due[preferred] >= MIN_CLAIM ? preferred : other;
  if (due[leg] < MIN_CLAIM) return null;
  const instructions = [ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }), ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000 })];
  let temporary: Keypair | undefined;
  if (leg === "curve") {
    if (curveFees > 0n) instructions.push(await sdk.PUMP_SDK.sweepCreatorFeeInstruction({ payer: dev, mint, creator: dev, quoteMint: NATIVE_MINT }));
    instructions.push(await pumpProgram.methods.collectCreatorFeeV2().accountsPartial({ creator: dev, quoteMint: NATIVE_MINT, quoteTokenProgram: TOKEN_PROGRAM_ID, creatorVault: vault }).instruction());
  } else {
    if (poolFees > 0n) instructions.push(await sdk.PUMP_SDK.sweepPoolCreatorFeeInstruction({ payer: dev, mint, coinCreator: dev, quoteMint: NATIVE_MINT }));
    // A fresh WSOL account prevents collection from closing or spending any existing dev ATA.
    temporary = Keypair.generate();
    instructions.push(
      SystemProgram.createAccount({ fromPubkey: dev, newAccountPubkey: temporary.publicKey, lamports: await conn.getMinimumBalanceForRentExemption(ACCOUNT_SIZE), space: ACCOUNT_SIZE, programId: TOKEN_PROGRAM_ID }),
      createInitializeAccount3Instruction(temporary.publicKey, NATIVE_MINT, dev),
      await ammProgram.methods.collectCoinCreatorFee().accountsPartial({ coinCreator: dev, coinCreatorTokenAccount: temporary.publicKey, quoteMint: NATIVE_MINT, quoteTokenProgram: TOKEN_PROGRAM_ID }).instruction(),
      createCloseAccountInstruction(temporary.publicKey, dev, dev),
    );
  }
  const block = await conn.getLatestBlockhash({ commitment: "confirmed", minContextSlot: result.context.slot });
  const tx = new VersionedTransaction(new TransactionMessage({ payerKey: dev, recentBlockhash: block.blockhash, instructions }).compileToV0Message());
  if (tx.serialize().length > 1232) throw Error("Dev collection exceeds packet size");
  const fee = (await conn.getFeeForMessage(tx.message, "confirmed")).value;
  if (fee == null || BigInt(fee) > MAX_NETWORK_FEE) throw Error("Dev collection network fee exceeds limit");
  const sim = await conn.simulateTransaction(tx, { sigVerify: false, commitment: "confirmed", minContextSlot: result.context.slot, accounts: { encoding: "base64", addresses: [dev.toBase58(), ...(temporary ? [temporary.publicKey.toBase58()] : [])] } });
  const after = sim.value.accounts?.[0];
  if (sim.value.err || !after || after.owner !== SystemProgram.programId.toBase58() || after.executable || after.data[0] !== "" || after.lamports - wallet.lamports < 100_000 || (temporary && sim.value.accounts?.[1] != null)) return null;
  tx.sign(temporary ? [signer, temporary] : [signer]);
  return { mint: mint.toBase58(), dev: dev.toBase58(), leg, signed: Buffer.from(tx.serialize()).toString("base64"), signature: bs58.encode(tx.signatures[0]), lastValidBlockHeight: block.lastValidBlockHeight, ...(temporary ? { temporaryAccount: temporary.publicKey.toBase58() } : {}) };
}
