# GroomOS backend — Stage 2: real Supabase authentication

Real signup/login is now wired in **without** removing the working demo. The
dashboard still shows mock data — swapping that to the database is Stage 3.

## How it behaves

Auth is **off** until Supabase is configured with real keys:

- **Demo mode** (no real keys — the public site, a fresh clone): the app stays
  open exactly as before. "Start your free week" drops you straight into the
  mock dashboard. `/login` and `/signup` show a "Demo mode" notice.
- **Real mode** (your `.env.local` has the real keys from Stage 1): signup and
  login work, and `/dashboard` (and the other app routes) are protected — logged
  out users are bounced to `/login`.

So your local machine (real keys) gets real auth; the public demo keeps working.

---

## What you need to do in Supabase (one-time, ~3 minutes)

### 1. Turn OFF email confirmation (so you can test instantly)

1. Supabase dashboard → **Authentication** (left sidebar).
2. → **Providers** → click **Email**.
   *(If your dashboard differs, look under **Authentication → Sign In / Up**, or
   **Authentication → Settings** for "Confirm email" / "Enable email
   confirmations".)*
3. Turn the **Confirm email** toggle **OFF**.
4. Click **Save**.

> ⚠️ **Turn this back ON before any real public launch.** With it off, anyone can
> sign up with an unverified email. It's off now only so you can create test
> accounts quickly during the build.

### 2. Run the signup trigger SQL

This makes each new signup automatically get its own business + owner row.

1. Supabase dashboard → **SQL Editor** → **+ New query**.
2. Paste **all** of `supabase/migrations/0002_auth_signup_trigger.sql`.
3. Click **Run**. Expect "Success. No rows returned."

### 3. Confirm your keys are set

Your `.env.local` (from Stage 1) must hold your real `NEXT_PUBLIC_SUPABASE_URL`
and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (not the `YOUR-...` placeholders). That's the
switch that turns real auth on. Restart `npm run dev` after any `.env.local`
change.

---

## Test it end to end

With email confirmation off, the trigger SQL run, and real keys in `.env.local`:

1. **Start the app:** `npm run dev`, open `http://localhost:3000`.
2. **Sign up:** click **Start your free week** (→ `/signup`). Enter a business
   name (e.g. "Test Grooming"), an email, and a password (6+ chars). Click
   **Create account**. You should land on the **dashboard** immediately (still
   showing mock data — that's expected until Stage 3).
3. **Check the database:** in Supabase → **Table Editor**:
   - **businesses** → a new row with your business name.
   - **users** → a new row whose `id` matches the new auth user and whose
     `business_id` points at that business (your tenant link).
   - **settings** → a new row for that `business_id` (default values).
   - (**Authentication → Users** also shows the new account.)
4. **Log out:** open the menu (top-right on mobile, sidebar on desktop) → **Log
   out**. You're sent to `/login`.
5. **Protected routes are protected:** while logged out, visit
   `http://localhost:3000/dashboard` directly → you're redirected to `/login`.
6. **Log in:** enter the same email + password → back to the dashboard.

If a step fails: most often it's email confirmation still on (step 1), the
trigger SQL not run (step 2), or placeholder keys still in `.env.local` (step 3).

---

## Viewing the demo

You don't lose the demo: any logged-in account currently shows the same mock
dashboard (real data is Stage 3). On the public site (no keys) it's open without
login. If you want a dedicated demo login, just sign up a `demo@…` account.

---

## What's next — Stage 3 (not started)

Swap the dashboard (and the rest of the app) from the mock store to **real
Supabase data scoped to the logged-in user's `business_id`** — read/write
clients, pets, services, appointments and settings from Postgres, one screen at
a time, with the mock store as a fallback so nothing breaks mid-migration.
