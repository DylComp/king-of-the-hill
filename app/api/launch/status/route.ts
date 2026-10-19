import { fail, json } from "@/lib/api";
import { launchStatus } from "@/lib/launch/server";

export async function GET() {
  try {
    return json(await launchStatus());
  } catch (e) {
    return fail(e, "launch status");
  }
}
