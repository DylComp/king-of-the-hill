import type { Metadata } from "next";
import Launch from "@/components/Launch";

export const metadata: Metadata = {
  title: "launch a coin · king of the hill",
  description: "Launch a pump.fun coin for any pump user. 80% of creator fees go to them, 20% goes to the treasury, and the coin becomes a floor in their tower.",
};

export default function Page() {
  return <Launch />;
}
