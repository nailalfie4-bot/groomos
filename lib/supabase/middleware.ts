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
import { isAppLocked } from "@/lib/trial";

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

/**
 * The "main app" working screens that are blocked once the free trial ends with
 * no active subscription. Billing + Settings stay open (so they can subscribe /
 * find their booking link), and public booking pages are never in this group.
 */
const TRIAL_GATED_PREFIXES = [
  "/dashboard",
  "/calendar",
  "/clients",
  "/appointments",
  "/retention",
  "/services",
];

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

function isTrialGated(pathname: string): boolean {
  return TRIAL_GATED_PREFIXES.some(
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
  // Wrapped so a misconfig/outage can't 500 every request — on error we treat
  // the visitor as logged out (fail closed) rather than crashing.
  let user = null;
  try {
    const result = await supabase.auth.getUser();
    user = result.data.user;
  } catch {
    user = null;
  }

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

  // Trial gate: once the 30-day trial is over with no active subscription, block
  // the main working screens and send them to the "trial ended" page. Public
  // booking pages (outside these prefixes) keep working so live bookings don't
  // break; Billing + Settings stay reachable so they can subscribe.
  if (user && isTrialGated(path)) {
    // Fail OPEN: a DB hiccup must never lock a paying groomer out of their app.
    try {
      const { data: biz } = await supabase
        .from("businesses")
        .select("subscription_status, plan, trial_ends_at")
        .maybeSingle();
      const b = biz as {
        subscription_status?: string | null;
        plan?: string | null;
        trial_ends_at?: string | null;
      } | null;
      if (
        b &&
        isAppLocked({
          subscriptionStatus: b.subscription_status,
          plan: b.plan,
          trialEndsAt: b.trial_ends_at,
        })
      ) {
        const url = request.nextUrl.clone();
        url.pathname = "/trial-ended";
        return NextResponse.redirect(url);
      }
    } catch {
      // ignore — let them through rather than risk a false lockout
    }
  }

  return response;
}
