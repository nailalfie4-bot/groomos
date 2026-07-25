import { notFound } from "next/navigation";
import { getFounder } from "@/lib/auth/founder";

/** Founder-only. Enforced here (page side) AND independently in every admin API
 *  route, so the admin can't be reached or driven by anyone else. */
export const dynamic = "force-dynamic";

export default async function DirectoryAdminLayout({ children }: { children: React.ReactNode }) {
  const founder = await getFounder();
  if (!founder) notFound();
  return <div className="min-h-[100dvh] bg-canvas text-ink">{children}</div>;
}
