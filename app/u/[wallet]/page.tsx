import type { Metadata } from "next";
import { notFound } from "next/navigation";
import UserPage from "@/components/UserPage";
import { isAddress } from "@/lib/launch/model";
import { shortAddr } from "@/lib/game";

type Props = { params: Promise<{ wallet: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { wallet } = await params;
  return { title: `${isAddress(wallet) ? shortAddr(wallet) : "profile"} · king of the hill` };
}

export default async function Page({ params }: Props) {
  const { wallet } = await params;
  if (!isAddress(wallet)) notFound();
  return <UserPage wallet={wallet} />;
}
