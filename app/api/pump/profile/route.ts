import { fail, json } from "@/lib/api";
import { limited } from "@/lib/limit";
import { findProfile, parseQuery } from "@/lib/launch/profile";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  if (!parseQuery(q)) return json({ error: "Enter a pump.fun username, profile link or wallet." }, 400);
  const slow = await limited(req, "profile");
  if (slow) return slow;
  try {
    const profile = await findProfile(q);
    return profile ? json({ profile }) : json({ error: "No pump.fun user with that name." }, 404);
  } catch (e) {
    console.error("pump profile", e);
    return json({ error: "pump.fun didn't answer. Paste their wallet or profile link instead." }, 502);
  }
}
