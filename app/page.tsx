import type { Metadata } from "next";
import Game from "@/components/Game";
import { isAddress } from "@/lib/chain";
import { shortAddr } from "@/lib/game";
import { findProfile } from "@/lib/launch/profile";

type Props = { searchParams: Promise<{ w?: string }> };

/** Shared tower links preview the actual building instead of the generic card. */
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const w = (await searchParams).w;
  if (!w || !isAddress(w)) return {};
  // A pump.fun profile's name reads better than an address (cached, and skipped if pump is slow).
  const p = await Promise.race([findProfile(w).catch(() => null), new Promise<null>((r) => setTimeout(() => r(null), 1500))]);
  const title = `${p?.username ? `@${p.username}` : shortAddr(w)}'s tower · king of the hill`;
  const image = `/api/og?w=${w}`;
  return {
    title,
    openGraph: { title, images: [image] },
    twitter: { card: "summary_large_image", title, images: [image] },
  };
}

export default function Page() {
  return <Game />;
}
