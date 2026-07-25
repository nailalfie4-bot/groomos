/**
 * POST /api/directory/admin — the founder-only admin API for the directory.
 *
 * A single gated endpoint that dispatches on `action`. The founder gate is
 * enforced HERE (server-side), independent of the admin page's own gate, so no
 * admin mutation is reachable without being the founder.
 */
import { NextResponse } from "next/server";
import { getFounder } from "@/lib/auth/founder";
import { createSupabaseAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import {
  createGroomer, updateGroomer, setGroomerStatus, deleteGroomer,
  upsertTown, deleteTown, upsertSchool, deleteSchool, upsertBlogPost, deleteBlogPost,
  importUnverifiedCsv, resolveClaim, resolveRemoval,
  type GroomerInput,
} from "@/lib/directory/admin";
import type { ListingStatus } from "@/lib/directory/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const founder = await getFounder();
  if (!founder) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  if (!isAdminConfigured()) return NextResponse.json({ ok: false, error: "not_available" }, { status: 503 });

  let body: { action?: string; payload?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
  const action = body.action;
  const p = (body.payload ?? {}) as Record<string, unknown>;
  const str = (k: string) => (typeof p[k] === "string" ? (p[k] as string) : undefined);

  try {
    switch (action) {
      case "import":
        return NextResponse.json({ ok: true, result: await importUnverifiedCsv(str("csv") ?? "") });

      case "groomer.save": {
        if (str("id")) {
          await updateGroomer(str("id")!, p as unknown as Partial<GroomerInput>);
          return NextResponse.json({ ok: true, id: str("id") });
        }
        if (!str("name")?.trim()) return NextResponse.json({ ok: false, error: "name_required" }, { status: 400 });
        return NextResponse.json({ ok: true, id: await createGroomer(p as unknown as GroomerInput) });
      }
      case "groomer.status":
        await setGroomerStatus(str("id")!, str("status") as ListingStatus);
        return NextResponse.json({ ok: true });
      case "groomer.delete":
        await deleteGroomer(str("id")!);
        return NextResponse.json({ ok: true });

      case "town.save":
        return NextResponse.json({ ok: true, id: await upsertTown(p as unknown as Parameters<typeof upsertTown>[0]) });
      case "town.delete":
        await deleteTown(str("id")!);
        return NextResponse.json({ ok: true });

      case "school.save":
        return NextResponse.json({ ok: true, id: await upsertSchool(p as unknown as Parameters<typeof upsertSchool>[0]) });
      case "school.delete":
        await deleteSchool(str("id")!);
        return NextResponse.json({ ok: true });

      case "blog.save":
        return NextResponse.json({ ok: true, id: await upsertBlogPost(p as unknown as Parameters<typeof upsertBlogPost>[0]) });
      case "blog.delete":
        await deleteBlogPost(str("id")!);
        return NextResponse.json({ ok: true });

      case "claim.resolve":
        await resolveClaim(str("id")!, str("status") as "approved" | "rejected", {
          groomerId: str("groomerId"),
          businessId: str("businessId"),
        });
        return NextResponse.json({ ok: true });
      case "removal.resolve":
        await resolveRemoval(str("id")!, str("action") as "remove" | "dismiss", str("groomerId"));
        return NextResponse.json({ ok: true });

      case "upload":
        return NextResponse.json({ ok: true, url: await uploadPhoto(str("dataUrl") ?? "", str("ext") ?? "webp") });

      default:
        return NextResponse.json({ ok: false, error: "unknown_action" }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ ok: false, error: "server_error", message: (e as Error).message }, { status: 500 });
  }
}

/** Store an already-compressed (client-side WebP) image in the `directory` bucket. */
async function uploadPhoto(dataUrl: string, ext: string): Promise<string> {
  const m = /^data:(.+?);base64,(.+)$/.exec(dataUrl);
  if (!m) throw new Error("Invalid image data.");
  const buffer = Buffer.from(m[2], "base64");
  const admin = createSupabaseAdminClient();
  const path = `groomers/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await admin.storage.from("directory").upload(path, buffer, {
    contentType: m[1],
    upsert: false,
  });
  if (error) throw error;
  return admin.storage.from("directory").getPublicUrl(path).data.publicUrl;
}
