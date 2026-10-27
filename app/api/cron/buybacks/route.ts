export const dynamic = "force-dynamic";
export async function GET() {
  return Response.json({ disabled: true, reason: "The legacy PTWR worker is retired. KOTH burns belong to the single-KOTH worker." });
}
