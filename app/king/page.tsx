import type { Metadata } from "next";
import King from "@/components/King";

export const metadata: Metadata = {
  title: "king of the hill",
  description: "Every squad in pump.fun's Squad Invitational has a coin. Every hour the squad that banks the most profit is King, and its holders are paid in SOL.",
  openGraph: { title: "king of the hill", description: "Every squad has a coin. Every hour, one squad is King, and its holders get paid in SOL." },
  twitter: { card: "summary_large_image" },
};

export default function Page() {
  return <King />;
}
