export const dynamic = "force-dynamic";
export async function GET() {
  return Response.json({ disabled: true, reason: "The legacy PTWR worker is retired. KING burns belong to the single-KING worker." });
}
