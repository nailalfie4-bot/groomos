import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Refreshes the Supabase session and protects the app routes. When Supabase
 * isn't configured (the public demo), updateSession is a no-op.
 */
export async function middleware(request: NextRequest) {
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
