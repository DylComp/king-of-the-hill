// Reads that quietly try again once when the server is busy or the network drops,
// so a passing hiccup never shows up as an error.
export async function getRetry(url: string): Promise<Response> {
  const res = await fetch(url).catch(() => null);
  if (res && res.status !== 429 && res.status < 500) return res;
  await new Promise((r) => setTimeout(r, 1200));
  return fetch(url);
}
