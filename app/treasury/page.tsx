import type { Metadata } from "next";
import Treasury from "@/components/Treasury";

export const metadata: Metadata = {
  title: "treasury · pump tower",
  description: "Pump Tower's treasury: 20% of launchpad creator fees, spent buying back and burning $PTWR.",
};

export default function Page() {
  return <Treasury />;
}
