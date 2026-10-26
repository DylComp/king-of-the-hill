// Server-only: reads pump.fun's public Squad Invitational data, the same public JSON the
// launchpad already reads for profiles. Read only: nothing here joins, enters or trades.
// pump.fun's numbers are preliminary until it publishes final results.
// pump.fun refuses requests from Vercel's servers, so each answer can also come from the feed:
// dlao's worker fetches the same public paths and posts them to /api/king/feed.
import { getJson, setJson } from "../redis";
import { COMPETITION_ID, type Member, type Squad } from "./model";

const API = "https://frontend-api-v3.pump.fun";
export const BOARD_PATH = `/competitions/${COMPETITION_ID}`;
export const membersPath = (groupId: string, offset = 0) => `/groups/${groupId}/members?status=ACTIVE&limit=50&offset=${offset}`;
/** The only paths the feed takes. */
export const feedPath = (p: string) => p === BOARD_PATH || /^\/groups\/[0-9a-f-]{36}\/members\?status=ACTIVE&limit=50&offset=(0|50|100|150)$/.test(p);
const feedKey = (path: string) => `pt:king:feed:${path}`;
export const saveFeed = (path: string, data: unknown, at = Date.now()) => setJson(feedKey(path), { at, data }, 7 * 86400);

/** A path's JSON and when it was read: straight from pump.fun, else the feed's last copy. */
async function get<T>(path: string, maxAgeMs: number): Promise<{ data: T; at: number }> {
  const res = await fetch(API + path, { headers: { accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(8000) }).catch(() => null);
  if (res?.ok) return { data: (await res.json()) as T, at: Date.now() };
  const fed = await getJson<{ at: number; data: T }>(feedKey(path));
  if (fed && Date.now() - fed.at <= maxAgeMs) return fed;
  throw Error(`pump ${path.split("?")[0]} HTTP ${res?.status ?? "unreachable"}, no fresh feed`);
}

type Entry = {
  participantId: string;
  rank: number;
  pnlUsd: number;
  realizedPnlUsd: number;
  unrealizedPnlUsd: number;
  memberCount: number;
  struck: boolean;
  username: string | null;
  profileImageUrl: string | null;
};

/** fetchedAt: when the board was read (by us or the feed); builtAt: when pump.fun built it. */
export type Board = { builtAt: number; fetchedAt: number; totalRanked: number; entries: number; squads: Squad[] };

/** The competition's top squads (pump.fun lists 100), ranked by total profit. */
export async function competitionBoard(): Promise<Board> {
  const { data: j, at } = await get<{ competition: { entriesCount: number }; leaderboard: { builtAtMs: number; totalRanked: number; entries: Entry[] } }>(BOARD_PATH, 6 * 3600_000);
  const squads = (j.leaderboard?.entries ?? [])
    .filter((e) => e.participantId && e.username)
    .map((e) => ({
      groupId: e.participantId,
      name: e.username!,
      image: e.profileImageUrl ?? null,
      rank: e.rank,
      pnlUsd: Number(e.pnlUsd) || 0,
      realizedUsd: Number(e.realizedPnlUsd) || 0,
      unrealizedUsd: Number(e.unrealizedPnlUsd) || 0,
      members: e.memberCount,
      struck: !!e.struck,
    }));
  return { builtAt: j.leaderboard?.builtAtMs ?? at, fetchedAt: at, totalRanked: j.leaderboard?.totalRanked ?? squads.length, entries: j.competition?.entriesCount ?? 0, squads };
}

type RawMember = {
  role: string;
  createdAt: string;
  inCompetition: boolean;
  profile: { username: string | null; walletAddress: string | null };
};

/** A squad's active members and their public wallets, owner included. */
export async function squadMembers(groupId: string): Promise<Member[]> {
  if (!/^[0-9a-f-]{36}$/.test(groupId)) throw Error("bad squad id");
  const out: Member[] = [];
  for (let offset = 0; offset < 200; offset += 50) {
    const { data: j } = await get<{ members: RawMember[]; hasMore: boolean }>(membersPath(groupId, offset), 86400_000);
    for (const m of j.members ?? []) {
      if (!m.profile?.walletAddress) continue;
      out.push({ wallet: m.profile.walletAddress, username: m.profile.username ?? null, role: m.role, joinedAt: Date.parse(m.createdAt) || 0, inCompetition: !!m.inCompetition });
    }
    if (!j.hasMore) break;
  }
  return out;
}
