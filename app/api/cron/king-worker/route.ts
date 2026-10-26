export const dynamic = "force-dynamic";
export async function GET() {
 return Response.json({ enabled: false, outcome: "disabled_tracking_only", launchesEnabled: false, payoutsEnabled: false });
}
export const POST = GET;
