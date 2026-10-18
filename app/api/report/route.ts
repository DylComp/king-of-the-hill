import { body, json } from "@/lib/api";
import { alert } from "@/lib/alert";
import { limited } from "@/lib/limit";

/** Crashes in players' browsers, sent by components/ErrorReporter. */
export async function POST(req: Request) {
  const slow = await limited(req, "report");
  if (slow) return slow;
  const { message, where } = await body<{ message: string; where: string }>(req);
  if (typeof message !== "string" || !message) return json({ error: "bad request" }, 400);
  await alert(`browser ${typeof where === "string" ? where.slice(0, 40) : ""}`.trim(), new Error(message.slice(0, 300)));
  return json({ ok: true });
}
