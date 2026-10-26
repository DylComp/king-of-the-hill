// Server-only: reads pump.fun's public Squad Invitational data, the same public JSON the
// launchpad already reads for profiles. Read only: nothing here joins, enters or trades.
// pump.fun's numbers are preliminary until it publishes final results.
import { COMPETITION_ID, type Member, type Squad } from "./model";

const API = "https://frontend-api-v3.pump.fun";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(API + path, { headers: { accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw Error(`pump ${path.split("?")[0]} HTTP ${res.status}`);
  return (await res.json()) as T;
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

export type Board = { builtAt: number; totalRanked: number; entries: number; squads: Squad[] };

/** The competition's top squads (pump.fun lists 100), ranked by total profit. */
export async function competitionBoard(): Promise<Board> {
  const j = await get<{ competition: { entriesCount: number }; leaderboard: { builtAtMs: number; totalRanked: number; entries: Entry[] } }>(`/competitions/${COMPETITION_ID}`);
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
  return { builtAt: j.leaderboard?.builtAtMs ?? Date.now(), totalRanked: j.leaderboard?.totalRanked ?? squads.length, entries: j.competition?.entriesCount ?? 0, squads };
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
    const j = await get<{ members: RawMember[]; hasMore: boolean }>(`/groups/${groupId}/members?status=ACTIVE&limit=50&offset=${offset}`);
    for (const m of j.members ?? []) {
      if (!m.profile?.walletAddress) continue;
      out.push({ wallet: m.profile.walletAddress, username: m.profile.username ?? null, role: m.role, joinedAt: Date.parse(m.createdAt) || 0, inCompetition: !!m.inCompetition });
    }
    if (!j.hasMore) break;
  }
  return out;
}
