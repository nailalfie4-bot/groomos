/**
 * Turn raw Supabase auth errors into specific, human-readable messages that
 * point at the likely fix — so a misconfigured first run explains itself
 * instead of showing a cryptic message or crashing.
 */
type AuthErrorLike =
  | { message?: string; code?: string; status?: number }
  | null
  | undefined;

export function friendlyAuthError(
  error: AuthErrorLike,
  context: "login" | "signup",
): string {
  if (!error) return "Something went wrong. Please try again.";
  const code = (error.code ?? "").toLowerCase();
  const msg = (error.message ?? "").toLowerCase();

  // Can't reach Supabase at all — wrong URL, offline, or dev server not
  // restarted after editing .env.local.
  if (
    error.status === 0 ||
    msg.includes("failed to fetch") ||
    msg.includes("fetch failed") ||
    msg.includes("networkerror") ||
    msg.includes("enotfound") ||
    msg.includes("getaddrinfo")
  ) {
    return "Couldn't reach Supabase. Check NEXT_PUBLIC_SUPABASE_URL is right, that you're online, and restart the dev server after editing .env.local. Open /debug to diagnose.";
  }

  // Bad / missing API key.
  if (code === "invalid_api_key" || msg.includes("invalid api key") || msg.includes("no api key")) {
    return "Supabase rejected the API key. Check NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local, then restart the dev server. Open /debug to diagnose.";
  }

  // The signup trigger errored (e.g. a table is missing), so GoTrue rolled the
  // whole signup back. This is the classic "database isn't fully set up" signal.
  if (msg.includes("database error saving new user") || msg.includes("database error")) {
    return "Signup failed while setting up your business. The database probably isn't fully set up — run migrations 0001 and 0002 in Supabase, then check /debug.";
  }

  // Login-specific.
  if (code === "invalid_credentials" || msg.includes("invalid login credentials")) {
    return "Email or password is incorrect.";
  }
  if (code === "email_not_confirmed" || msg.includes("email not confirmed")) {
    return "This email hasn't been confirmed yet. Check your inbox — or, for fast testing, turn OFF email confirmation in Supabase (Authentication → Providers → Email → Confirm email) and try again.";
  }

  // Signup-specific.
  if (
    code === "user_already_exists" ||
    code === "email_exists" ||
    msg.includes("already registered") ||
    msg.includes("already been registered") ||
    msg.includes("user already registered")
  ) {
    return context === "signup"
      ? "That email already has an account — try logging in instead."
      : "That email already has an account.";
  }
  if (code === "weak_password" || msg.includes("password should be")) {
    return "Please choose a stronger password (at least 6 characters).";
  }
  if (
    code === "signup_disabled" ||
    msg.includes("signups not allowed") ||
    msg.includes("signup is disabled")
  ) {
    return "New signups are turned off in Supabase (Authentication → Providers → Email). Enable them to create an account.";
  }
  if (code.includes("rate") || msg.includes("rate limit") || error.status === 429) {
    return "Too many attempts. Wait a minute, then try again.";
  }

  // Anything else: show the raw message but point at the diagnostics page.
  return `${error.message ?? "Sign-in failed."} — open /debug to check your Supabase setup.`;
}
