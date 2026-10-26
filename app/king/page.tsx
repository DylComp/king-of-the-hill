import type { Metadata } from "next";
import King from "@/components/King";

export const metadata: Metadata = {
  title: "king of the hill · pump tower",
  description: "Every squad in pump.fun's Squad Invitational has a coin. Every hour the squad that banks the most profit is King, and its holders are paid in SOL.",
};

export default function Page() {
  return <King />;
}
