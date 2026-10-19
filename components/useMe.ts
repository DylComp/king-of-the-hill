"use client";
import { useCallback, useEffect, useState } from "react";
import { connectWallet, isMobile, post, provider, rejected, signIn } from "./wallet";

/** The signed-in wallet for pages outside the game, with connect and sign-out. */
export function useMe() {
  const [me, setMe] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [mobilePick, setMobilePick] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((j: { wallet: string | null }) => setMe(j.wallet))
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const connect = useCallback(async (): Promise<string | null> => {
    const p = provider();
    if (!p) {
      if (isMobile()) setMobilePick(true);
      else window.open("https://phantom.app/", "_blank", "noopener");
      return null;
    }
    try {
      const addr = await connectWallet(p);
      if (addr !== me) {
        await signIn(p, addr);
        setMe(addr);
      }
      return addr;
    } catch (e) {
      setNote(rejected(e) ? "wallet said no" : e instanceof Error ? e.message : "could not sign in");
      return null;
    }
  }, [me]);

  const signOut = useCallback(async () => {
    await provider()?.disconnect?.().catch(() => {});
    await post("/api/auth/logout").catch(() => {});
    setMe(null);
  }, []);

  return { me, ready, connect, signOut, mobilePick, setMobilePick, note, setNote };
}
