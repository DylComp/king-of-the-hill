import type { Metadata } from "next";
import Activity from "@/components/Activity";

export const metadata: Metadata = {
  title: "activity · king of the hill",
  description: "Hourly King of the Hill results, holder payouts in SOL, rollover and public transaction receipts.",
};

export default function Page() {
  return <Activity />;
}
