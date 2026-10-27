import type { Metadata } from "next";
import King from "@/components/King";
export const metadata: Metadata = {
  title: "king of the hill · squad tracker",
  description: "Follow all 100 squads, live wallet trading results and hourly crowns in pump.fun’s Squad Invitational.",
  alternates: { canonical: "/" },
};
export default function Page() { return <King />; }
