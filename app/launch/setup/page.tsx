import type { Metadata } from "next";
import LaunchSetup from "@/components/LaunchSetup";

export const metadata: Metadata = { title: "launchpad setup · pump tower", robots: { index: false } };

export default function Page() {
  return <LaunchSetup />;
}
