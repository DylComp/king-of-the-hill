import type { Metadata } from "next";
import King from "@/components/King";
export const metadata: Metadata = {
  title: "king of the hill · KOTH",
  description: "One KOTH token. Back a squad. 40% winning squad, 40% eligible supporters, 20% holder SOL airdrops.",
  alternates: { canonical: "/" },
};
export default function Page() { return <King />; }
