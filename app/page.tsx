import type { Metadata } from "next";
import King from "@/components/King";
export const metadata: Metadata = {
  title: "king of the hill · KING",
  description: "One KING token. Back a squad. 40% winning squad, 40% eligible supporters, 20% KING buy-and-burn.",
  alternates: { canonical: "/" },
};
export default function Page() { return <King />; }
