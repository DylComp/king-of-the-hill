export const dynamic = "force-dynamic";
export async function GET() {
 return Response.json({ enabled: false, outcome: "disabled_legacy_squad_worker", launchesEnabled: false, payoutsEnabled: false });
}
export const POST = GET;
