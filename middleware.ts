import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { SITE_URL, LEGACY_HOST } from "@/lib/site";

/**
 * 1) Permanently (301) send the legacy Vercel host to the primary domain,
 *    preserving path + query, so existing booking links never 404. Preview
 *    deployments (their own *.vercel.app hosts) are untouched.
 * 2) Refresh the Supabase session and protect the app routes. When Supabase
 *    isn't configured (the public demo), updateSession is a no-op.
 */
export async function middleware(request: NextRequest) {
  const host = request.headers.get("host");
  if (host === LEGACY_HOST) {
    const target = new URL(request.nextUrl.pathname + request.nextUrl.search, SITE_URL);
    return NextResponse.redirect(target, 301);
  }
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Run on all routes except static assets, images and PWA files. Auth pages
     * and the public landing/booking pages pass through (gating happens inside
     * updateSession only for the protected app routes).
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icon.png|apple-icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
