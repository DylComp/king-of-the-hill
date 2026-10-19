import { createRequire } from "node:module";
import { PublicKey } from "@solana/web3.js";
const require = createRequire(import.meta.url);
const { holderRewardsPda } = require("@pump-fun/pump-sdk") as typeof import("@pump-fun/pump-sdk");
/** Holder Rewards uses the normal trade path but its creator must be the per-mint PDA. */
export function validHolderCreator(mint: PublicKey, holderReward: boolean, creator: PublicKey) {
  return !holderReward || creator.equals(holderRewardsPda(mint));
}
