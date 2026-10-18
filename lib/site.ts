// The site's public address. Vercel sets VERCEL_PROJECT_PRODUCTION_URL to the
// project's production domain (the custom domain once one is attached), so links,
// share cards and metadata follow the domain without code changes.
const host = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL || "pumptowers.fun";
export const SITE_HOST = host.replace(/^https?:\/\//, "");
export const SITE_URL = `https://${SITE_HOST}`;
