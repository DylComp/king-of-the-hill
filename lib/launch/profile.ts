// Finds a pump.fun user by username, wallet or profile link, using pump.fun's public
// frontend API. Fees always go to the wallet; the name and picture are for display.
import { getJson, hasDb, setJson } from "../redis.ts";
import { isAddress } from "./model.ts";
import type { Profile } from "./registry.ts";

const API = "https://frontend-api-v3.pump.fun";

type PumpUser = { address?: string; canonical_svm_wallet?: string | null; username?: string | null; profile_image?: string | null; x_username?: string | null; followers?: number | null; is_banned?: boolean };

/** Accepts "name", "@name", a wallet, or a pump.fun/profile/... link. */
export function parseQuery(q: string): { wallet: string } | { username: string } | null {
  let s = q.trim();
  const m = s.match(/^(?:https?:\/\/)?(?:www\.)?pump\.fun\/profile\/([^/?#]+)/i);
  if (m) s = decodeURIComponent(m[1]);
  s = s.replace(/^@/, "");
  if (isAddress(s)) return { wallet: s };
  if (/^[A-Za-z0-9_.]{1,32}$/.test(s)) return { username: s };
  return null;
}

/**
 * GET from pump.fun's API. Rate limits and hiccups are retried with a short backoff; a 404
 * is "no such user". Anything still failing throws, so callers never mistake an outage for
 * a missing profile.
 */
async function pump<T>(path: string): Promise<T | null> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(API + path, { headers: { accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(6000) }).catch(() => null);
    if (res?.status === 404) return null;
    if (res?.ok) return (await res.json()) as T;
    if (attempt >= 2) throw Error(`pump ${res?.status ?? "unreachable"}`);
    const wait = Number(res?.headers.get("retry-after")) * 1000 || 400 * 2 ** attempt;
    await new Promise((r) => setTimeout(r, Math.min(wait, 2500)));
  }
}

const safeImage = (u: string | null | undefined) => {
  if (!u) return null;
  try {
    const url = new URL(u);
    return url.protocol === "https:" && u.length < 400 ? u : null;
  } catch {
    return null;
  }
};

function toProfile(u: PumpUser, wallet: string): Profile {
  return {
    wallet,
    username: u.username && /^[A-Za-z0-9_.]{1,32}$/.test(u.username) ? u.username : null,
    image: safeImage(u.profile_image),
    x: u.x_username && /^[A-Za-z0-9_]{1,15}$/.test(u.x_username) ? u.x_username : null,
    followers: typeof u.followers === "number" ? u.followers : null,
  };
}

const FOUND_TTL = 3600;
const MISSING_TTL = 600;
/** A last good copy of every profile, served when pump.fun is rate limiting or down. */
const STALE_TTL = 30 * 86400;

/** Looks the user up: found profiles are cached for an hour, misses for 10 minutes, and a last good copy is kept for outages. */
export async function findProfile(q: string): Promise<Profile | null> {
  const parsed = parseQuery(q);
  if (!parsed) return null;
  const id = "wallet" in parsed ? parsed.wallet : parsed.username.toLowerCase();
  const cacheKey = `pt:pumpuser:${id}`;
  const staleKey = `pt:pumpuser:last:${id}`;
  if (hasDb()) {
    const hit = await getJson<Profile | { none: true }>(cacheKey).catch(() => null);
    if (hit) return "none" in hit ? null : hit;
  }
  let profile: Profile | null = null;
  try {
    if ("wallet" in parsed) {
      const u = await pump<PumpUser>(`/users/${parsed.wallet}`);
      profile = u && !u.is_banned ? toProfile(u, parsed.wallet) : { wallet: parsed.wallet, username: null, image: null, x: null, followers: null };
    } else {
      const list = await pump<PumpUser[]>(`/users/search-v2?offset=0&limit=10&includeLabelledWallets=false&searchTerm=${encodeURIComponent(parsed.username)}`);
      const u = (list ?? []).find((x) => x.username?.toLowerCase() === parsed.username.toLowerCase());
      const wallet = u?.canonical_svm_wallet || u?.address;
      if (u && !u.is_banned && wallet && isAddress(wallet)) profile = toProfile(u, wallet);
    }
  } catch (e) {
    // pump.fun is busy: fall back to the last copy we saw, or for a wallet just the wallet.
    const last = hasDb() ? await getJson<Profile>(staleKey).catch(() => null) : null;
    if (last) return last;
    if ("wallet" in parsed) return { wallet: parsed.wallet, username: null, image: null, x: null, followers: null };
    throw e;
  }
  if (hasDb()) {
    const found = profile?.username ? profile : null;
    await Promise.all([
      setJson(cacheKey, profile ?? { none: true }, found ? FOUND_TTL : MISSING_TTL),
      found ? setJson(staleKey, found, STALE_TTL) : null,
      // Found by name: file it under the wallet too, so the launch that follows reads it from cache.
      found && !("wallet" in parsed) ? setJson(`pt:pumpuser:${found.wallet}`, found, FOUND_TTL) : null,
      found && !("wallet" in parsed) ? setJson(`pt:pumpuser:last:${found.wallet}`, found, STALE_TTL) : null,
    ]).catch(() => {});
  }
  return profile;
}

/** Up to eight pump.fun users whose names match a partial search, best matches first. Cached for five minutes. */
export async function searchProfiles(term: string): Promise<Profile[]> {
  const t = term.trim().replace(/^@/, "");
  if (!/^[A-Za-z0-9_.]{2,32}$/.test(t)) return [];
  const cacheKey = `pt:pumpsearch:${t.toLowerCase()}`;
  if (hasDb()) {
    const hit = await getJson<Profile[]>(cacheKey).catch(() => null);
    if (hit) return hit;
  }
  const list = await pump<PumpUser[]>(`/users/search-v2?offset=0&limit=8&includeLabelledWallets=false&searchTerm=${encodeURIComponent(t)}`);
  const found = (list ?? []).flatMap((u) => {
    const wallet = u.canonical_svm_wallet || u.address;
    return !u.is_banned && wallet && isAddress(wallet) ? [toProfile(u, wallet)] : [];
  });
  if (hasDb()) await setJson(cacheKey, found, 300).catch(() => {});
  return found;
}
