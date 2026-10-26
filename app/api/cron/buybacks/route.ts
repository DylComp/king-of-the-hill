export const dynamic = "force-dynamic";
export async function GET() {
  return Response.json({ disabled: true, reason: "Buybacks are not part of King of the Hill." });
}
