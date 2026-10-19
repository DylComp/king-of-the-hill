import type { Metadata } from "next";
import Tokens from "@/components/Tokens";

export const metadata: Metadata = {
  title: "tokens · pump tower",
  description: "Every coin launched on Pump Tower: 80% of creator fees to a pump user, 20% to $PTWR buybacks.",
};

export default function Page() {
  return <Tokens />;
}
