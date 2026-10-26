import type { Metadata } from "next";
import KingSquad from "@/components/KingSquad";

type Props = { params: Promise<{ squad: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { squad } = await params;
  const name = decodeURIComponent(squad).slice(0, 40);
  return { title: `${name} · king of the hill`, description: `${name}'s fan coin, fee split and crowns in Pump Tower's King of the Hill.` };
}

export default async function Page({ params }: Props) {
  const { squad } = await params;
  return <KingSquad name={decodeURIComponent(squad).slice(0, 40)} />;
}
