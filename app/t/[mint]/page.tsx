import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CoinPage from "@/components/CoinPage";
import { isAddress } from "@/lib/launch/model";
import { getCoin } from "@/lib/launch/registry";
import { hasDb } from "@/lib/redis";

type Props = { params: Promise<{ mint: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { mint } = await params;
  const c = isAddress(mint) && hasDb() ? await getCoin(mint).catch(() => null) : null;
  if (!c) return { title: "coin · pump tower" };
  const title = `$${c.ticker} · ${c.name} · pump tower`;
  const description = c.description || `Launched on Pump Tower. 80% of creator fees go to ${c.recipient.username ? `@${c.recipient.username}` : "a pump user"}, 20% buys back $PTWR.`;
  return {
    title,
    description,
    openGraph: { title, description, images: [{ url: `/api/og/coin?m=${mint}`, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description, images: [`/api/og/coin?m=${mint}`] },
  };
}

export default async function Page({ params }: Props) {
  const { mint } = await params;
  if (!isAddress(mint)) notFound();
  return <CoinPage mint={mint} />;
}
