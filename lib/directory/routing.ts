/**
 * Directory request routing (called from middleware): permanent 301s for changed
 * slugs, and a 410 Gone for removed listings (so they drop out of the index for
 * good). Fails open — any error just lets the request through to the page, which
 * renders normally or 404s.
 */
import { NextResponse, type NextRequest } from "next/server";
import { isAdminConfigured } from "@/lib/supabase/admin";
import { getRedirectTarget, getGroomerStatusBySlug } from "./data";

const GONE_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="robots" content="noindex"><title>Listing removed</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>body{font-family:system-ui,sans-serif;margin:0;display:grid;min-height:100vh;place-items:center;background:#FCF6F4;color:#4A2D28;text-align:center;padding:2rem}a{color:#C9756B}</style>
</head><body><div><h1>This listing has been removed</h1>
<p>It's no longer part of the GroomOS directory.</p>
<p><a href="/directory">Browse dog groomers</a></p></div></body></html>`;

function isDirectoryPath(pathname: string): boolean {
  return (
    pathname.startsWith("/groomers/") ||
    pathname.startsWith("/dog-groomers-in-") ||
    pathname.startsWith("/grooming-schools/") ||
    pathname.startsWith("/blog/")
  );
}

export async function directoryRouting(request: NextRequest): Promise<NextResponse | null> {
  const { pathname, search } = request.nextUrl;
  if (!isDirectoryPath(pathname) || !isAdminConfigured()) return null;

  try {
    // 1) A recorded slug change → permanent redirect to the new URL.
    const to = await getRedirectTarget(pathname);
    if (to && to !== pathname) {
      return NextResponse.redirect(new URL(to + search, request.url), 301);
    }
    // 2) A removed groomer profile → 410 Gone.
    if (pathname.startsWith("/groomers/")) {
      const slug = pathname.slice("/groomers/".length).split("/")[0];
      if (slug && (await getGroomerStatusBySlug(slug)) === "removed") {
        return new NextResponse(GONE_HTML, {
          status: 410,
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      }
    }
  } catch {
    // fail open
  }
  return null;
}
