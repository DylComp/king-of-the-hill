import type { Metadata } from "next";
import Tokens from "@/components/Tokens";

export const metadata: Metadata = {
  title: "tokens · king of the hill",
  description: "Every coin launched on King of the Hill: 80% of creator fees to a pump user, 20% to Treasury fees.",
};

export default function Page() {
  return <Tokens />;
}
