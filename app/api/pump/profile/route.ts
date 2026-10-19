import { fail, json } from "@/lib/api";
import { limited } from "@/lib/limit";
import { findProfile, parseQuery, searchProfiles } from "@/lib/launch/profile";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  if (!parseQuery(q)) return json({ error: "Enter a pump.fun username, profile link or wallet." }, 400);
  const slow = await limited(req, "profile");
  if (slow) return slow;
  try {
    const profile = await findProfile(q);
    if (profile) return json({ profile });
    // No exact username: offer every pump.fun user whose name matches, to pick from.
    const matches = await searchProfiles(q).catch(() => []);
    return matches.length ? json({ profile: null, matches }) : json({ error: "No pump.fun user matches that. Try their exact username, profile link or wallet." }, 404);
  } catch (e) {
    console.error("pump profile", e);
    return json({ error: "pump.fun didn't answer. Paste their wallet or profile link instead." }, 502);
  }
}
