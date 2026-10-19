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

async function pump<T>(path: string): Promise<T | null> {
  const res = await fetch(API + path, { headers: { accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(6000) });
  if (res.status === 404) return null;
  if (!res.ok) throw Error(`pump ${res.status}`);
  return (await res.json()) as T;
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

/** Looks the user up, cached for 10 minutes. A plain wallet with no pump profile still works. */
export async function findProfile(q: string): Promise<Profile | null> {
  const parsed = parseQuery(q);
  if (!parsed) return null;
  const cacheKey = `pt:pumpuser:${"wallet" in parsed ? parsed.wallet : parsed.username.toLowerCase()}`;
  if (hasDb()) {
    const hit = await getJson<Profile | { none: true }>(cacheKey).catch(() => null);
    if (hit) return "none" in hit ? null : hit;
  }
  let profile: Profile | null = null;
  if ("wallet" in parsed) {
    const u = await pump<PumpUser>(`/users/${parsed.wallet}`).catch(() => null);
    profile = u && !u.is_banned ? toProfile(u, parsed.wallet) : { wallet: parsed.wallet, username: null, image: null, x: null, followers: null };
  } else {
    const list = await pump<PumpUser[]>(`/users/search-v2?offset=0&limit=10&includeLabelledWallets=false&searchTerm=${encodeURIComponent(parsed.username)}`);
    const u = (list ?? []).find((x) => x.username?.toLowerCase() === parsed.username.toLowerCase());
    const wallet = u?.canonical_svm_wallet || u?.address;
    if (u && !u.is_banned && wallet && isAddress(wallet)) profile = toProfile(u, wallet);
  }
  if (hasDb()) await setJson(cacheKey, profile ?? { none: true }, 600).catch(() => {});
  return profile;
}

/** Up to eight pump.fun users whose names match a partial search, best matches first. */
export async function searchProfiles(term: string): Promise<Profile[]> {
  const t = term.trim().replace(/^@/, "");
  if (!/^[A-Za-z0-9_.]{2,32}$/.test(t)) return [];
  const list = await pump<PumpUser[]>(`/users/search-v2?offset=0&limit=8&includeLabelledWallets=false&searchTerm=${encodeURIComponent(t)}`);
  return (list ?? []).flatMap((u) => {
    const wallet = u.canonical_svm_wallet || u.address;
    return !u.is_banned && wallet && isAddress(wallet) ? [toProfile(u, wallet)] : [];
  });
}
