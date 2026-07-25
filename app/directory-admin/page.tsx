import {
  listAllGroomers,
  listTowns,
  listSchools,
  listAllBlogPosts,
  listClaimRequests,
  listRemovalRequests,
} from "@/lib/directory/data";
import { AdminDashboard } from "@/components/directory/admin/dashboard";

export const dynamic = "force-dynamic";

export default async function DirectoryAdminPage() {
  const [groomers, towns, schools, posts, claims, removals] = await Promise.all([
    listAllGroomers().catch(() => []),
    listTowns().catch(() => []),
    listSchools().catch(() => []),
    listAllBlogPosts().catch(() => []),
    listClaimRequests().catch(() => []),
    listRemovalRequests().catch(() => []),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Directory admin</h1>
      <p className="mt-1 text-sm text-ink-muted">Founder-only. Manage listings, towns, schools, blog, claims and removals.</p>
      <AdminDashboard
        groomers={groomers}
        towns={towns}
        schools={schools}
        posts={posts}
        claims={claims}
        removals={removals}
      />
    </div>
  );
}
