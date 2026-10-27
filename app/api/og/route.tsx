export async function GET(req: Request) { return Response.redirect(new URL("/king/opengraph-image",req.url),307); }
