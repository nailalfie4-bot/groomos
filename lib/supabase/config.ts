/**
 * Is Supabase actually configured with real keys?
 *
 * This is the switch that lets real auth coexist with the demo. When the env
 * vars are missing or still hold the ".env.local.example" placeholders, the app
 * runs in open "demo mode" (no auth, mock data) exactly as before. When real
 * keys are present, auth turns on and routes are protected.
 *
 * Works on both the server and the client because it only reads NEXT_PUBLIC_*
 * vars, which Next.js inlines at build time.
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(
    url &&
      key &&
      !url.includes("YOUR-PROJECT-REF") &&
      !key.startsWith("YOUR-"),
  );
}
