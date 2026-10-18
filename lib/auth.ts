// Sign in with a wallet signature. Nothing is ever sent on chain: the wallet signs a
// plain text message, the server checks it with the wallet's public key and hands
// back a session cookie.
import { createHmac, createPublicKey, randomBytes, timingSafeEqual, verify } from "node:crypto";
import { cookies } from "next/headers";
import { base58Decode } from "./base58";
import { redis } from "./redis";

const COOKIE = "pt_session";
const SESSION_DAYS = 30;
const NONCE_TTL = 300;

/** HMAC key lives in the database, generated once, so no secret has to be configured by hand. */
async function secret(): Promise<string> {
  const existing = await redis<string | null>("GET", "pt:secret");
  if (existing) return existing;
  await redis("SET", "pt:secret", randomBytes(32).toString("hex"), "NX");
  return (await redis<string>("GET", "pt:secret"))!;
}

export function signInMessage(wallet: string, nonce: string) {
  return `Pump Tower sign in\n\nThis only proves you own this wallet. It does not send a transaction or cost anything.\n\nWallet: ${wallet}\nNonce: ${nonce}`;
}

export async function newNonce(wallet: string) {
  const nonce = randomBytes(12).toString("hex");
  await redis("SET", `pt:nonce:${wallet}`, nonce, "EX", NONCE_TTL);
  return signInMessage(wallet, nonce);
}

function ed25519Verify(wallet: string, message: string, signature: Uint8Array) {
  const pub = base58Decode(wallet);
  if (pub.length !== 32 || signature.length !== 64) return false;
  const key = createPublicKey({ key: { kty: "OKP", crv: "Ed25519", x: Buffer.from(pub).toString("base64url") }, format: "jwk" });
  return verify(null, Buffer.from(message, "utf8"), key, signature);
}

export async function checkSignature(wallet: string, signatureB64: string): Promise<boolean> {
  const nonce = await redis<string | null>("GETDEL", `pt:nonce:${wallet}`);
  if (!nonce) return false;
  try {
    return ed25519Verify(wallet, signInMessage(wallet, nonce), Buffer.from(signatureB64, "base64"));
  } catch {
    return false;
  }
}

async function mac(payload: string) {
  return createHmac("sha256", await secret()).update(payload).digest("base64url");
}

export async function startSession(wallet: string) {
  const exp = Date.now() + SESSION_DAYS * 86_400_000;
  const payload = `${wallet}.${exp}`;
  (await cookies()).set(COOKIE, `${payload}.${await mac(payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

/** The signed-in wallet, or null. */
export async function sessionWallet(): Promise<string | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const [wallet, exp, sig] = raw.split(".");
  if (!wallet || !exp || !sig || Number(exp) < Date.now()) return null;
  const expected = Buffer.from(await mac(`${wallet}.${exp}`));
  const got = Buffer.from(sig);
  return expected.length === got.length && timingSafeEqual(expected, got) ? wallet : null;
}
