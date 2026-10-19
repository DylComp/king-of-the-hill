// The launchpad no longer needs a setup step. Old links land on the launchpad.
import { redirect } from "next/navigation";

export default function SetupPage() {
  redirect("/launch");
}
