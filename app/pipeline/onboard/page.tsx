/**
 * Onboarding moved into Settings → Founder → "Onboard a groomer". This route is
 * kept only to redirect any stale bookmark there. It still sits behind the
 * /pipeline founder gate, so a non-founder gets a 404 before any redirect.
 */
import { redirect } from "next/navigation";

export default function OnboardMoved() {
  redirect("/settings");
}
