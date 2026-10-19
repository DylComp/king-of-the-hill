import type { Metadata } from "next";
import Activity from "@/components/Activity";

export const metadata: Metadata = {
  title: "activity · pump tower",
  description: "Live $PTWR buybacks and burns, every creator fee collected, and each transaction from the buy & burn wallet on Solscan.",
};

export default function Page() {
  return <Activity />;
}
