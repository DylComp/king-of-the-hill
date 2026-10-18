import { json } from "@/lib/api";
import { endSession } from "@/lib/auth";

export async function POST() {
  await endSession();
  return json({ ok: true });
}
