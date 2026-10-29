// Canonical public origin is shared by server rendering, browser links and token metadata.
// Internal authenticated worker calls use the stable project origin separately.
export const SITE_HOST = "www.kothcoins.fun";
export const SITE_URL = `https://${SITE_HOST}`;

/** Repoint only our own historical URLs; preserve external image/social hosts. */
export function canonicalSiteUrl(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    const url = new URL(value);
    if (["pumptowers.fun", "www.pumptowers.fun", "pump-tower.vercel.app", "kingofthehills.fun", "www.kingofthehills.fun", "kothcoins.fun"].includes(url.hostname)) {
      return SITE_URL + url.pathname + url.search + url.hash;
    }
  } catch {}
  return value;
}

/** Source code, linked from the nav and footer. */
export const GITHUB_URL = "https://github.com/DylanLauren/king-of-the-hill";

/** The project's X account, linked beside GitHub in the nav and footer. */
export const X_URL = "https://x.com/KothSqauds";
