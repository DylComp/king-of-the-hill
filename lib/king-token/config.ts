import { PublicKey } from '@solana/web3.js';
export function kingMint(): string|null {
 const raw=process.env.KING_MINT?.trim();
 if(!raw)return null;
 if(raw==='5ChT61vPfByx2NApxSNT4iPMTRCV39m5z88bXYcppump')throw Error('legacy_mint_forbidden');
 const key=new PublicKey(raw);
 if(key.toBase58()!==raw)throw Error('invalid_king_mint');
 return raw;
}
// Hard acceptance gate: remove only after official rankings AND hourly winners are verified.
export const RANKINGS_VERIFIED = false;
export function enabled(){const mint=kingMint();return RANKINGS_VERIFIED && process.env.KING_TOKEN_WORKER_ENABLED==='true' && !!mint;}
