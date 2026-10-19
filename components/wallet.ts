// Browser wallet plumbing shared by every page: find the injected wallet, connect,
// sign in with a free message signature, and sign transactions the server built.
"use client";

export type WalletLike = {
  // Phantom resolves with the key; Solflare resolves empty and sets `publicKey` on itself.
  connect: (o?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey?: { toString(): string } } | void>;
  publicKey?: { toString(): string } | null;
  disconnect?: () => Promise<void>;
  signMessage?: (msg: Uint8Array, display?: string) => Promise<{ signature: Uint8Array } | Uint8Array>;
  signTransaction?: <T>(tx: T) => Promise<T>;
  signAndSendTransaction?: <T>(tx: T) => Promise<{ signature: string | Uint8Array }>;
  isSolflare?: boolean;
};

export async function post<T>(url: string, data?: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data ?? {}) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "something broke");
  return json as T;
}

export function provider(): WalletLike | null {
  const w = window as unknown as { phantom?: { solana?: WalletLike }; solana?: WalletLike; solflare?: WalletLike; backpack?: WalletLike };
  return w.phantom?.solana ?? w.solflare ?? w.backpack ?? w.solana ?? null;
}

export async function connectWallet(p: WalletLike, o?: { onlyIfTrusted?: boolean }): Promise<string> {
  const r = await p.connect(o);
  const key = (r && r.publicKey) || p.publicKey;
  if (!key) throw new Error("no wallet key");
  return key.toString();
}

export const isMobile = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

/** Phone browsers have no wallet extension: these open this page inside the wallet app's browser. */
export function walletLinks() {
  const url = encodeURIComponent(window.location.href);
  const ref = encodeURIComponent(window.location.origin);
  return [
    { name: "Phantom", href: `https://phantom.app/ul/browse/${url}?ref=${ref}` },
    { name: "Solflare", href: `https://solflare.com/ul/v1/browse/${url}?ref=${ref}` },
  ];
}

export const toB64 = (bytes: Uint8Array) => {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
};
export const fromB64 = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

/** Keeps a ?ref= invite from the link this visitor arrived on, for their first sign-in. */
export function rememberRef() {
  try {
    const ref = new URL(window.location.href).searchParams.get("ref");
    if (ref && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(ref) && !localStorage.getItem("pt_ref")) localStorage.setItem("pt_ref", ref);
  } catch {}
}
const storedRef = () => {
  try {
    return localStorage.getItem("pt_ref") ?? undefined;
  } catch {
    return undefined;
  }
};

/** Counts a quest step for the signed-in wallet. Fire and forget. */
export const questEvent = (event: "visit" | "coin" | "share", target?: string) =>
  post<{ paid: number; extraCash: number }>("/api/quests", { event, target }).catch(() => null);

/** Proves wallet ownership with a free message signature. Throws a readable message. */
export async function signIn(p: WalletLike, addr: string) {
  if (!p.signMessage) throw new Error("this wallet can't sign messages");
  const { message, nonce } = await post<{ message: string; nonce: string }>("/api/auth/nonce", { wallet: addr });
  const out = await p.signMessage(new TextEncoder().encode(message), "utf8");
  const sig = out instanceof Uint8Array ? out : out.signature;
  await post("/api/auth/verify", { wallet: addr, nonce, signature: toB64(sig), ref: storedRef() });
}

export const rejected = (e: unknown) => e instanceof Error && /reject|denied|cancel|declin/i.test(e.message);

const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
/** Wallets return a sent transaction's signature as base58 text or as raw bytes. */
export function sigText(sig: string | Uint8Array): string {
  if (typeof sig === "string") return sig;
  let n = 0n;
  for (const b of sig) n = n * 256n + BigInt(b);
  let out = "";
  while (n > 0n) {
    out = B58[Number(n % 58n)] + out;
    n /= 58n;
  }
  for (const b of sig) {
    if (b !== 0) break;
    out = "1" + out;
  }
  return out;
}
