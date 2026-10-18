import type { Metadata } from "next";
import Game from "@/components/Game";
import { isAddress } from "@/lib/chain";
import { shortAddr } from "@/lib/game";

type Props = { searchParams: Promise<{ w?: string }> };

/** Shared tower links preview the actual building instead of the generic card. */
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const w = (await searchParams).w;
  if (!w || !isAddress(w)) return {};
  const title = `${shortAddr(w)}'s tower · pump tower`;
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
