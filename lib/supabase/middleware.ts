/**
 * Session refresh + route protection for Next.js middleware.
 *
 * Runs on every matched request: refreshes the Supabase auth cookie and, when
 * auth is configured, redirects logged-out visitors away from the protected
 * app routes. If Supabase isn't configured (the public demo), it does nothing
 * and lets every request through, so the demo keeps working untouched.
 */
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/** App routes that require a logged-in user (the (app) route group). */
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/calendar",
  "/clients",
  "/appointments",
  "/retention",
  "/services",
  "/billing",
  "/settings",
];

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  // Demo mode (no real keys): never gate anything.
  if (!isSupabaseConfigured()) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: getUser() validates the token with Supabase and refreshes the
  // cookie. Do not run code between createServerClient and getUser.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // Logged out + heading somewhere protected -> send to login.
  if (!user && isProtected(path)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectedFrom", path);
    return NextResponse.redirect(url);
  }

  // Logged in + on an auth page -> send to the dashboard.
  if (user && (path === "/login" || path === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}
