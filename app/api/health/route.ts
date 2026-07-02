import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/supabase/config";

// Always run fresh — this is a live diagnostic.
export const dynamic = "force-dynamic";

type Status = "pass" | "fail" | "warn" | "unknown";
interface Check {
  id: string;
  label: string;
  status: Status;
  detail: string;
}

/** Treat placeholder keys as "not set". */
function realKey(v: string | undefined): string | undefined {
  return v && !v.startsWith("YOUR-") ? v : undefined;
}

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = realKey(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!isSupabaseConfigured() || !url || !anon) {
    return NextResponse.json({
      configured: false,
      ok: false,
      message:
        "Supabase isn't configured (demo mode). Put your real keys in .env.local and restart the dev server to run these checks.",
      checks: [] as Check[],
    });
  }

  const checks: Check[] = [];

  // 1) Connection + anon key, and read the email-confirmation setting.
  let connectionPass = false;
  let autoconfirm: boolean | null = null;
  try {
    const res = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: anon },
      cache: "no-store",
    });
    if (res.ok) {
      const s = (await res.json()) as { mailer_autoconfirm?: boolean };
      autoconfirm = Boolean(s.mailer_autoconfirm);
      connectionPass = true;
      checks.push({
        id: "connection",
        label: "Supabase connection & anon key",
        status: "pass",
        detail: "Auth API reachable and the anon key was accepted.",
      });
    } else {
      checks.push({
        id: "connection",
        label: "Supabase connection & anon key",
        status: "fail",
        detail: `Auth API returned HTTP ${res.status}${res.status === 401 ? " — the anon key looks wrong." : "."} Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then restart the dev server.`,
      });
    }
  } catch {
    checks.push({
      id: "connection",
      label: "Supabase connection & anon key",
      status: "fail",
      detail: `Couldn't reach ${url}. Check NEXT_PUBLIC_SUPABASE_URL is correct and you're online.`,
    });
  }

  // If we can't even connect, the DB checks are meaningless — say so plainly.
  if (!connectionPass) {
    checks.push({
      id: "tables",
      label: "Core tables",
      status: "unknown",
      detail: "Can't check until the connection above is working.",
    });
    checks.push({
      id: "trigger",
      label: "Signup trigger (migration 0002)",
      status: "unknown",
      detail: "Can't check until the connection above is working.",
    });
    checks.push({
      id: "email",
      label: "Email confirmation",
      status: "unknown",
      detail: "Can't check until the connection above is working.",
    });
    return NextResponse.json({ configured: true, ok: false, usingServiceKey: Boolean(service), checks });
  }

  // Client for DB checks. Service role (if set) bypasses RLS for clean results;
  // the anon key also works because existence checks don't need to read rows.
  const supabase = createClient(url, service ?? anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 2) Core tables exist.
  const tables = [
    "businesses",
    "users",
    "settings",
    "clients",
    "pets",
    "services",
    "appointments",
  ];
  const missing: string[] = [];
  let otherError: string | null = null;
  for (const t of tables) {
    const { error } = await supabase.from(t).select("*", { head: true, count: "exact" });
    if (error) {
      const notFound =
        error.code === "42P01" ||
        error.code === "PGRST205" ||
        /does not exist|could not find the table/i.test(error.message);
      if (notFound) missing.push(t);
      else if (!otherError) otherError = error.message;
    }
  }
  if (missing.length === 0 && !otherError) {
    checks.push({
      id: "tables",
      label: "Core tables (businesses, users, settings, …)",
      status: "pass",
      detail: `All ${tables.length} tables present.`,
    });
  } else if (missing.length === tables.length) {
    checks.push({
      id: "tables",
      label: "Core tables",
      status: "fail",
      detail: "No tables found — run migration 0001_initial_schema.sql in the SQL editor.",
    });
  } else if (missing.length > 0) {
    checks.push({
      id: "tables",
      label: "Core tables",
      status: "fail",
      detail: `Missing: ${missing.join(", ")}. Re-run migration 0001_initial_schema.sql.`,
    });
  } else {
    checks.push({
      id: "tables",
      label: "Core tables",
      status: "warn",
      detail: `A query errored: ${otherError}. If it mentions permissions, add SUPABASE_SERVICE_ROLE_KEY to .env.local.`,
    });
  }

  // 3) Signup trigger, via the diagnostics function (migration 0003).
  const { data: health, error: healthError } = await supabase.rpc("groomos_health");
  if (healthError) {
    const notInstalled =
      healthError.code === "PGRST202" ||
      /could not find the function|function .* does not exist/i.test(healthError.message);
    checks.push({
      id: "trigger",
      label: "Signup trigger (migration 0002)",
      status: "unknown",
      detail: notInstalled
        ? "Can't verify yet — run supabase/migrations/0003_health_check.sql to install the diagnostics function, then re-run."
        : `Diagnostics function errored: ${healthError.message}`,
    });
  } else {
    const h = (health ?? {}) as Record<string, boolean>;
    const triggerOk = Boolean(h.signup_trigger && h.handle_new_user_fn);
    checks.push({
      id: "trigger",
      label: "Signup trigger (migration 0002)",
      status: triggerOk ? "pass" : "fail",
      detail: triggerOk
        ? "on_auth_user_created + handle_new_user() are installed."
        : "Not installed — run migration 0002_auth_signup_trigger.sql.",
    });
  }

  // 4) Email confirmation status.
  if (autoconfirm) {
    checks.push({
      id: "email",
      label: "Email confirmation — OFF (good for testing)",
      status: "pass",
      detail:
        "Auto-confirm is ON, so new signups get a session immediately. Turn email confirmation back ON before any public launch.",
    });
  } else {
    checks.push({
      id: "email",
      label: "Email confirmation — ON",
      status: "warn",
      detail:
        "Signups must confirm by email before logging in. For fast local testing, turn it OFF: Authentication → Providers → Email → Confirm email.",
    });
  }

  const ok = checks.every((c) => c.status === "pass");
  return NextResponse.json({ configured: true, ok, usingServiceKey: Boolean(service), checks });
}
