"use client";
// Shows a wallet as its pump.fun name and picture when it has a pump profile,
// otherwise as its short address. Names are fetched in batches and kept for the visit.
import { useEffect, useState } from "react";
import { shortAddr } from "@/lib/game";
import { ProfilePic } from "./Pics";

type Name = { username: string; image: string | null };
const known = new Map<string, Name | null>();

async function load(wallets: string[]) {
  const todo = [...new Set(wallets)].filter((w) => w && !known.has(w));
  for (let i = 0; i < todo.length; i += 40) {
    const chunk = todo.slice(i, i + 40);
    chunk.forEach((w) => known.set(w, null));
    try {
      const res = await fetch(`/api/pump/names?w=${chunk.join(",")}`);
      const { names } = (await res.json()) as { names?: Record<string, Name> };
      for (const [w, n] of Object.entries(names ?? {})) known.set(w, n);
    } catch {
      chunk.forEach((w) => known.delete(w));
    }
  }
}

/** Looks up pump names for these wallets; re-renders once they arrive. */
export function usePumpNames(wallets: (string | null | undefined)[]) {
  const key = wallets.filter(Boolean).join(",");
  const [, bump] = useState(0);
  useEffect(() => {
    if (!key) return;
    let live = true;
    void load(key.split(",")).then(() => live && bump((n) => n + 1));
    return () => {
      live = false;
    };
  }, [key]);
  return (w: string | null | undefined) => (w ? (known.get(w) ?? null) : null);
}

/** The wallet's pump name with its picture, or its short address. */
export default function PumpName({ wallet, name, pic = 18 }: { wallet: string; name: Name | null; pic?: number }) {
  if (!name) return <>{shortAddr(wallet)}</>;
  return (
    <span className="pump-name" title={wallet}>
      <ProfilePic profile={{ wallet, username: name.username, image: name.image }} size={pic} />
      <span>@{name.username}</span>
    </span>
  );
}
