// Server-only helpers shared by the launch routes.
import { TREASURY_WALLET } from "../game";
import { hasDb } from "../redis";
import { lookupTableAddress } from "./alt";

/** Launching opens once the treasury wallet is set and the lookup table exists. */
export async function launchStatus(): Promise<{ open: boolean; reason: string | null; treasury: string | null }> {
  if (!TREASURY_WALLET) return { open: false, reason: "The launchpad opens once the Pump Tower treasury wallet is set.", treasury: null };
  if (!hasDb() || !(await lookupTableAddress())) return { open: false, reason: "The launchpad needs its one-time setup at /launch/setup, from any wallet.", treasury: TREASURY_WALLET };
  return { open: true, reason: null, treasury: TREASURY_WALLET };
}

export const pendingKey = (mint: string) => `pt:launch:pend:${mint}`;
