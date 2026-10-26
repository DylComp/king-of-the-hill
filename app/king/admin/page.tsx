import type { Metadata } from "next";
import KingAdmin from "@/components/KingAdmin";

export const metadata: Metadata = { title: "launch squad coins · king of the hill", robots: { index: false } };

export default function Page() {
  return <KingAdmin />;
}
