import type { Metadata } from "next";
import KingAdmin from "@/components/KingAdmin";

export const metadata: Metadata = { title: "launch squad coins · pump tower", robots: { index: false } };

export default function Page() {
  return <KingAdmin />;
}
