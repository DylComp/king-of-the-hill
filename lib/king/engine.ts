// Server-only: the King of the Hill clock. Runs every few minutes from a cron:
//  - at the top of each hour, reads every squad's banked profit and every squad coin's
//    lifetime fees;
//  - at a secret minute inside the hour, counts the holders of every squad coin;
//  - once the next hour's readings are in, crowns the squad whose banked profit rose most
//    and writes the payout list. The treasury workers send the SOL; nothing here signs.
import { getJson, setJson } from "../redis";
import { lifetimeLamports, holderBalances } from "./chain";
import { COMPETITION_ENDS, HOLDERS_BPS, HOUR, hourId, hourOf, pickKing, potLamports, snapshotMinute, splitPot, type Reign } from "./model";
import { competitionBoard, type Board } from "./source";
import { allSquadCoins, boardAt, carried, feesAt, hasHolders, holdersAt, reign, saveBoard, saveFees, saveHolders, saveReign, setCarried } from "./store";

const LATEST = "pt:king:latest";
const NOW = "pt:king:now";
export const latestBoard = () => getJson<Board>(LATEST);

const secret = () => process.env.KING_SECRET || process.env.CRON_SECRET || "";

export async function runKing(now = Date.now()) {
  const hour = hourOf(now);
  if (hour > COMPETITION_ENDS + HOUR) return { done: "competition over" };
  const coins = await allSquadCoins();
  const log: string[] = [];

  // Live board for the pages, refreshed every run.
  const board = await competitionBoard();
  await setJson(LATEST, board, 3600);

  // Top-of-hour readings.
  if (!(await boardAt(hour))) {
    await saveBoard(hour, Object.fromEntries(board.squads.map((s) => [s.groupId, s.realizedUsd])));
    const fees: Record<string, string> = {};
    const read = await lifetimes(coins.map((c) => c.mint));
    for (const c of coins) fees[c.mint] = read[c.mint] ?? (await previousFee(hour, c.mint));
    await saveFees(hour, fees);
    log.push(`readings ${hourId(hour)}`);
  }

  // Holder count at the hour's secret minute.
  if (secret() && now >= hour + (await snapshotMinute(hour, secret())) * 60_000) {
    let counted = 0;
    for (const c of coins) {
      if (counted >= 25 || (await hasHolders(hour, c.mint))) continue;
      await saveHolders(hour, c.mint, await holderBalances(c.mint, c.launcher));
      counted++;
    }
    if (counted) log.push(`holders ${counted}`);
  }

  // Crown last hour.
  const prev = hour - HOUR;
  if (!(await reign(hourId(prev)))) {
    const [start, end, feesStart, feesEnd] = await Promise.all([boardAt(prev), boardAt(hour), feesAt(prev), feesAt(hour)]);
    if (start && end && feesStart && feesEnd) {
      const struck = new Set(board.squads.filter((s) => s.struck).map((s) => s.groupId));
      const winner = pickKing({ hour: prev, start, end }, new Set(coins.map((c) => c.groupId)), struck);
      const coin = winner && coins.find((c) => c.groupId === winner.groupId)!;
      const carriedIn = await carried();
      const pot = potLamports(feesStart, feesEnd) + carriedIn;
      let r: Reign;
      if (!coin) {
        r = { hour: hourId(prev), king: null, potLamports: pot.toString(), holdersLamports: "0", burnLamports: "0", carriedInLamports: carriedIn.toString(), rolloverLamports: pot.toString(), snapshotAt: null, payouts: [], status: "paid" };
      } else {
        let balances = await holdersAt(prev, coin.mint);
        let snapshotAt = prev + (await snapshotMinute(prev, secret())) * 60_000;
        if (!balances) {
          // The count was missed (outage): count now rather than skip the hour.
          balances = await holderBalances(coin.mint, coin.launcher);
          snapshotAt = now;
        }
        const holders = (pot * BigInt(HOLDERS_BPS)) / 10_000n;
        const split = splitPot(holders, Object.entries(balances).map(([wallet, a]) => ({ wallet, amount: BigInt(a) })));
        r = {
          hour: hourId(prev),
          king: { groupId: coin.groupId, squad: coin.squad, mint: coin.mint, gainUsd: winner!.gainUsd },
          potLamports: pot.toString(),
          holdersLamports: split.paid.toString(),
          burnLamports: (pot - holders).toString(),
          carriedInLamports: carriedIn.toString(),
          rolloverLamports: split.rollover.toString(),
          snapshotAt,
          payouts: split.payouts,
          status: split.payouts.length || pot > holders ? "pending" : "paid",
        };
      }
      await saveReign(r);
      await setCarried(BigInt(r.rolloverLamports));
      log.push(`king ${r.hour}: ${r.king?.squad ?? "none"}`);
    }
  }
  await potSoFar(now).catch(() => null);
  return { hour: hourId(hour), coins: coins.length, log };
}

/** Lifetime fees for many coins, ten at a time; a failed read is left out. */
async function lifetimes(mints: string[]) {
  const out: Record<string, string> = {};
  for (let i = 0; i < mints.length; i += 10) {
    await Promise.all(mints.slice(i, i + 10).map(async (m) => {
      const v = await lifetimeLamports(m).catch(() => null);
      if (v != null) out[m] = v.toString();
    }));
  }
  return out;
}

/** The pot building up this hour so far (plus carry), for the live page. Cached a few minutes. */
export async function potSoFar(now = Date.now()) {
  const cached = await getJson<{ hour: number; lamports: string; at: number }>(NOW);
  if (cached && cached.hour === hourOf(now) && now - cached.at < 4 * 60_000) return BigInt(cached.lamports);
  const start = await feesAt(hourOf(now));
  if (!start) return carried();
  const lamports = potLamports(start, await lifetimes(Object.keys(start))) + (await carried());
  await setJson(NOW, { hour: hourOf(now), lamports: lamports.toString(), at: now }, 600);
  return lamports;
}

/** What the page shows: the last pot reading for this hour, never a fresh chain read. */
export async function cachedPot(now = Date.now()) {
  const cached = await getJson<{ hour: number; lamports: string }>(NOW);
  return cached && cached.hour === hourOf(now) ? BigInt(cached.lamports) : await carried();
}

/** If a fee read fails, carry the last known total so the hour's pot isn't inflated later. */
async function previousFee(hour: number, mint: string) {
  for (let h = hour - HOUR; h > hour - 24 * HOUR; h -= HOUR) {
    const f = await feesAt(h);
    if (f?.[mint]) return f[mint];
  }
  return "0";
}
