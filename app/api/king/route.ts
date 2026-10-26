import { fail, live } from "@/lib/api";
import { trackingBoard } from "@/lib/king/tracking";
export async function GET() {
 try { return live(await trackingBoard(),10); }
 catch(e) {return fail(e,"king tracking board");}
}
