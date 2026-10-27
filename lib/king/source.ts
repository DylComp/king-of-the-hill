// Server-only: who the squads are. pump.fun refuses scripted reads of its Squad Invitational,
// so the top 100 squads and their members were read once from pump.fun in a browser when the
// cup started (squads.json). Membership is locked for the cup, so that list stays right.
// Everything that changes, the SOL each squad banks, is read on chain (scan.ts).
import { HOUR, hourOf, type Member, type Squad } from "./model";
import { bankedAt, bankedTotal } from "./store";
import snapshot from "./squads.json";

type Raw = { groupId: string; name: string; rank: number; struck: boolean; image: string | null; members: [string, string | null, number][] };
const SQUADS = (snapshot as { takenAt: string; squads: Raw[] }).squads;
export const SNAPSHOT_AT = Date.parse((snapshot as { takenAt: string }).takenAt);

/** A squad's members in the cup, owner first, in the order they joined. */
export function squadMembers(groupId: string): Member[] {
  const s = SQUADS.find((x) => x.groupId === groupId);
  if (!s) throw Error("unknown squad");
  return s.members.map(([wallet, username, owner], i) => ({ wallet, username, role: owner ? "OWNER" : "MEMBER", joinedAt: i, inCompetition: true }));
}

/** Every wallet of the given squads, with its squad. */
export function walletsOf(groupIds: Set<string>) {
  return SQUADS.filter((s) => groupIds.has(s.groupId)).flatMap((s) => s.members.map(([wallet]) => ({ wallet, groupId: s.groupId })));
}

export const struckSquads = () => new Set(SQUADS.filter((s) => s.struck).map((s) => s.groupId));

export type Board = { takenAt: number; squads: Squad[] };

const sol = (lamports: string | undefined) => (lamports == null ? 0 : Number(BigInt(lamports)) / 1e9);

/**
 * The board: every squad with the SOL it banked this hour, last hour and in total. Only squads
 * with a coin are tracked; the rest show no numbers. Tracked squads lead, most banked first.
 */
export async function competitionBoard(tracked: Set<string>, now = Date.now()): Promise<Board> {
  const [hour, last, total] = await Promise.all([bankedAt(hourOf(now)), bankedAt(hourOf(now) - HOUR), bankedTotal()]);
  const squads: Squad[] = SQUADS.map((s) => {
    const on = tracked.has(s.groupId);
    return {
      groupId: s.groupId,
      name: s.name,
      image: s.image,
      rank: s.rank,
      members: s.members.length,
      struck: s.struck,
      bankedHour: on ? sol(hour[s.groupId]) : null,
      bankedLast: on ? sol(last[s.groupId]) : null,
      bankedTotal: on ? sol(total[s.groupId]) : null,
    };
  });
  squads.sort((a, b) => Number(b.bankedHour != null) - Number(a.bankedHour != null) || (b.bankedHour ?? 0) - (a.bankedHour ?? 0) || a.rank - b.rank);
  return { takenAt: SNAPSHOT_AT, squads };
}

/** All squads participate without requiring a token. */
export const trackedSquads = () => new Set(SQUADS.map(s => s.groupId));

/** Historical roster only; unavailable diagnostic values stay null. */
export function rosterBoard(){return {takenAt:SNAPSHOT_AT,squads:SQUADS.map(s=>({groupId:s.groupId,name:s.name,image:s.image,rank:s.rank,members:s.members.length,struck:s.struck,bankedHour:null,bankedLast:null,bankedTotal:null}))};}
