# GroomOS backend — Stage 1: Supabase foundation

This stage lays the groundwork for a real backend. **Nothing in the working
demo changed** — the app still runs entirely on the in-browser mock store. These
steps create your Supabase project and database tables, ready for Stage 2 to
start using them.

You'll do three things, all in your browser / a text editor:

- **A.** Create a Supabase project
- **B.** Put your keys into `.env.local`
- **C.** Run one SQL script to create the tables

Nothing here is automatic — you're in control. The app will not touch Supabase
until a later stage.

---

## A. Create your Supabase project (~5 minutes)

1. Go to **https://supabase.com** and click **Start your project** (or **Sign
   in** if you have an account). You can sign in with GitHub or email.
2. On the dashboard, click **New project**.
3. Choose your **Organization** (create one if asked — any name works, e.g. your
   business name).
4. Fill in the form:
   - **Name:** `groomos` (anything you like).
   - **Database Password:** click **Generate a password** and **save it
     somewhere safe** (a password manager is ideal). You won't need it
     day-to-day, but don't lose it.
   - **Region:** pick the one closest to you (e.g. *West EU (London)* for the UK).
5. Click **Create new project** and wait ~2 minutes while it provisions
   ("Setting up project…").

## B. Find your keys and put them in `.env.local`

1. In your project, click the **Settings** gear (bottom-left) → **API**.
   - On newer dashboards this may be split into **Settings → API Keys** and
     **Settings → Data API** (the URL lives under *Data API*).
2. Copy these three values:

   | What to copy | Where it is | Paste into this variable |
   |---|---|---|
   | **Project URL** (e.g. `https://abcd1234.supabase.co`) | "Project URL" / *Data API* | `NEXT_PUBLIC_SUPABASE_URL` |
   | **anon / public key** (a long token; also called "Publishable") | "Project API keys" → `anon` `public` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
   | **service_role / secret key** (click **Reveal** first) | "Project API keys" → `service_role` `secret` | `SUPABASE_SERVICE_ROLE_KEY` |

3. In the project folder, copy the template to a real env file and fill it in:
   ```bash
   cp .env.local.example .env.local
   ```
   Then open `.env.local` and replace each `YOUR-...` placeholder with the value
   you copied.
4. **Never share the service_role / secret key**, and never commit `.env.local`
   (it's already gitignored). The `service_role` key can read/write *everything*,
   bypassing all security — treat it like a master password.
5. If the app is running, stop it and run `npm run dev` again so it picks up the
   new env file. *(Stage 1 doesn't use these values yet — this just gets them in
   place.)*

## C. Create the tables (run the SQL)

1. In Supabase, click **SQL Editor** in the left sidebar.
2. Click **+ New query**.
3. Open **`supabase/migrations/0001_initial_schema.sql`** from this project,
   select **all** of it, copy, and paste it into the editor.
4. Click **Run** (or press Cmd/Ctrl + Enter). You should see
   **"Success. No rows returned."**
5. Verify it worked: click **Table Editor** in the left sidebar. You should now
   see **7 tables** — `businesses`, `users`, `clients`, `pets`, `services`,
   `appointments`, `settings` — all empty. ✅

> The script is safe to run again if you ever need to — it won't duplicate
> tables or wipe data.

### About the "RLS" / "unrestricted" notes you might see
The script turns on **Row Level Security (RLS)** — think of it as a lock that
keeps each groomer's data private from everyone else. Until a later stage adds
login, the tables are intentionally locked to outside access. The **Table
Editor** still shows them because the dashboard is a trusted admin view. This is
the correct, safe setup — you don't need to change anything.

---

## What this gave you

- A real Postgres database (your Supabase project).
- Seven tables modelled on the app's existing types, with multi-tenant
  foreign keys (every record belongs to a `business`).
- Security locks (RLS) switched on and ready for login.
- The Supabase client libraries installed in the app, and an unused client
  helper (`lib/supabase/client.ts`) waiting for Stage 2.

**The live demo is byte-for-byte the same** — it still runs on mock data in the
browser.

## What's next — Stage 2 (not started)

Introduce a thin data layer and a real Supabase login **behind a feature flag**,
so the app can talk to the database **without** removing the working mock store.
We'll be able to flip between "demo (mock)" and "real (Supabase)" while we
migrate screen by screen. Nothing breaks in between.
