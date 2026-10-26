// The docs shown in the "docs" section: what King of the Hill is, then every
// section of the site and its features, in page order. Kept next to the rules so each change
// updates it in the same commit; numbers are read from the rules, not typed in.
import {
  CASH_PER_SOL,
  HOUSE_BOOST,
  HOUSE_SYMBOL,
  MAX_FURNITURE,
  TREASURY_WALLET,
  TIERS,
  WALLET_BONUS,
  citizensFor,
  floorRate,
  streakReward,
} from "./game";
import { FEE_TIERS, FEE_TIER_NAMES, SPLIT } from "./launch/model";
import { HOLDERS_BPS, MAX_MEMBERS, MAX_PAYEES, MIN_PAYOUT_LAMPORTS, POT_BPS } from "./king/model";
import { ALL_QUESTS_BONUS, QUESTS, REFERRED_REWARD, REFERRER_REWARD } from "./quests";

export type DocSection = { id: string; title: string; summary: string; items: [string, string][] };

export const DOCS_INTRO = "King of the Hill tracks all 100 squads through their wallets. No squad tokens, launches, buybacks or automatic cash payouts. The tower game remains a read-only view of your wallet.";
export const DOCS: DocSection[] = [{id:"king",title:"Squad tracker",summary:"All squads compete without tokens.",items:[["Tracking","Trading results count from each wallet's first scan. The scanner rotates through wallets every five minutes."],["Crowns","The best positive trading result wins each hourly crown. Incomplete scan coverage is marked."],["No token launches","Automatic and manual launches are disabled. Existing coins are retired from the competition; their blockchain records remain."],["Funds","The tracker does not sign transactions or spend SOL. Existing treasury funds are left untouched."]]}];
