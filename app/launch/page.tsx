import type { Metadata } from "next";
import Launch from "@/components/Launch";

export const metadata: Metadata = {
  title: "launch a coin · pump tower",
  description: "Launch a pump.fun coin for any pump user. 80% of creator fees go to them, 20% buys back $PTWR, and the coin becomes a floor in their tower.",
};

export default function Page() {
  return <Launch />;
}
