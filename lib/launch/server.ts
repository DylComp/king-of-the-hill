// Server-only helpers shared by the launch routes.
import { TREASURY_WALLET } from "../game";
import { hasDb } from "../redis";

/** Launching is open whenever the treasury wallet is set. */
export async function launchStatus(): Promise<{ open: boolean; reason: string | null; treasury: string | null }> {
  if (!TREASURY_WALLET) return { open: false, reason: "The launchpad opens once the Pump Tower treasury wallet is set.", treasury: null };
  if (!hasDb()) return { open: false, reason: "The launchpad is offline for a moment, try again soon.", treasury: TREASURY_WALLET };
  return { open: true, reason: null, treasury: TREASURY_WALLET };
}

export const pendingKey = (mint: string) => `pt:launch:pend:${mint}`;
