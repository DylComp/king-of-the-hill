import type { Metadata } from "next";
import King from "@/components/King";

export const metadata: Metadata = {
  title: "king of the hill",
  description: "Track every squad in pump.fun's Squad Invitational. Wallet activity decides the hourly crown. No squad tokens required.",
  openGraph: { title: "king of the hill", description: "Track every squad. Follow wallet activity. Compete for the hourly crown." },
  twitter: { card: "summary_large_image" },
};

export default function Page() {
  return <King />;
}
