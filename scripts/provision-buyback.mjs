// Run only after PTWR_OFFICIAL_MINT is set and the treasury has setup SOL.
// Creates the treasury's token ATA and AMM volume account, never buys tokens.
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { Connection, Keypair, PublicKey, TransactionMessage, VersionedTransaction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, getAssociatedTokenAddressSync, createAssociatedTokenAccountIdempotentInstruction } from '@solana/spl-token';
const require = createRequire(import.meta.url);
const { PUMP_AMM_SDK, userVolumeAccumulatorPda } = require('@pump-fun/pump-swap-sdk');
const mint = new PublicKey(process.env.PTWR_OFFICIAL_MINT || '');
const key = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(process.env.PTWR_TREASURY_KEY_FILE ? fs.readFileSync(process.env.PTWR_TREASURY_KEY_FILE, 'utf8') : process.env.PTWR_TREASURY_SECRET_KEY || '[]')));
if (key.publicKey.toBase58() !== process.env.PTWR_TREASURY_ADDRESS) throw Error('Set PTWR_TREASURY_ADDRESS to the reviewed treasury address');
const rpc = process.env.HELIUS_API_KEY ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}` : process.env.SOLANA_RPC_URL;
if (!rpc) throw Error('Production RPC required');
const conn = new Connection(rpc, 'confirmed');
if (await conn.getGenesisHash() !== '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d') throw Error('Mainnet required');
const info = await conn.getAccountInfo(mint);
if (!info || ![TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID].some(p => p.equals(info.owner))) throw Error('Official mint missing or unsupported');
const ixs = [createAssociatedTokenAccountIdempotentInstruction(key.publicKey, getAssociatedTokenAddressSync(mint, key.publicKey, false, info.owner), key.publicKey, mint, info.owner)];
if (!await conn.getAccountInfo(userVolumeAccumulatorPda(key.publicKey))) ixs.push(await PUMP_AMM_SDK.initUserVolumeAccumulator({ payer: key.publicKey, user: key.publicKey }));
const block = await conn.getLatestBlockhash();
const tx = new VersionedTransaction(new TransactionMessage({ payerKey: key.publicKey, recentBlockhash: block.blockhash, instructions: ixs }).compileToV0Message());
const sim = await conn.simulateTransaction(tx, { sigVerify: false });
if (sim.value.err) throw Error('Provisioning simulation failed');
if (!process.argv.includes('--execute')) { console.log('Provisioning simulation passed. Use --execute to create the accounts.'); process.exit(0); }
tx.sign([key]);
const signature = await conn.sendRawTransaction(tx.serialize(), { skipPreflight: false });
const result = await conn.confirmTransaction({ ...block, signature }, 'finalized');
if (result.value.err) throw Error('Provisioning failed on chain');
console.log('Provisioned:', signature);
