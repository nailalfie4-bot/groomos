# Stage 2 — local test checklist (real Supabase auth)

Run this on your own machine with your real Supabase keys. Each step says what a
**pass** looks like. If something fails, the app and the `/debug` page will tell
you what's wrong.

## 0. One-time Supabase setup

- [ ] **Keys in `.env.local`** — real `NEXT_PUBLIC_SUPABASE_URL` and
      `NEXT_PUBLIC_SUPABASE_ANON_KEY` (not the `YOUR-…` placeholders). Adding
      `SUPABASE_SERVICE_ROLE_KEY` makes `/debug` a little more thorough but isn't
      required.
- [ ] **Run the SQL migrations** (Supabase → SQL Editor → paste → Run), if not
      already done:
  - `supabase/migrations/0001_initial_schema.sql`
  - `supabase/migrations/0002_auth_signup_trigger.sql`
  - `supabase/migrations/0003_health_check.sql`  ← new; powers `/debug`
- [ ] **Email confirmation OFF** — Authentication → Providers → Email →
      **Confirm email** toggle **off** → Save. *(Turn back ON before launch.)*

## 1. Start the app

```bash
npm run dev
```

- [ ] Open **http://localhost:3000** — the landing page loads and now shows a
      **Log in** link in the header (that link only appears when real keys are
      detected — its presence confirms "configured mode" is on).

## 2. Run the health check — `/debug`

Open **http://localhost:3000/debug**.

- [ ] **PASS** — "Supabase connection & anon key"
- [ ] **PASS** — "Core tables (businesses, users, settings, …)"
- [ ] **PASS** — "Signup trigger (migration 0002)"
- [ ] **PASS** — "Email confirmation — OFF (good for testing)"

A green **"All checks passed — you're ready to test signup."** banner means you
can proceed. Any **FAIL/WARN** row tells you the exact fix (which migration to
run, or which setting to change). Fix it, click **Re-run checks**.

> If "Signup trigger" shows **—/unknown** saying to install the diagnostics
> function, you skipped `0003_health_check.sql`. Run it and re-check.

## 3. Sign up

Landing → **Start your free week** (→ `/signup`). Enter a business name, an
email, and a 6+ char password → **Create account**.

- [ ] **Pass:** you land on the **dashboard** immediately. (It still shows the
      demo/mock data — Biscuit, Paws & Co. — that's expected until Stage 3. Open
      the menu; your **email** is shown there, proving you're really logged in.)
- [ ] **If it fails, the message is specific**, e.g.:
  - "Signup failed while setting up your business…" → run migrations 0001/0002.
  - "…its business wasn't set up — the signup trigger (0002) hasn't run." →
    run 0002, delete the half-made user (Authentication → Users), retry.
  - "That email already has an account…" → use a new email or log in.
  - "Couldn't reach Supabase…" → check keys / restart dev server.

## 4. Check the database

Supabase → **Table Editor**:

- [ ] **businesses** — one new row with your business name.
- [ ] **users** — one new row; its `id` matches the new user and `business_id`
      points at that business (your tenant link).
- [ ] **settings** — one new row for that `business_id` (default values).
- [ ] **Authentication → Users** — your new account is listed.

## 5. Log out

Menu (top-right on mobile / sidebar on desktop) → **Log out**.

- [ ] **Pass:** you're taken to **/login**.

## 6. Protected routes really are protected

While logged out, type **http://localhost:3000/dashboard** in the address bar.

- [ ] **Pass:** you're redirected to **/login?redirectedFrom=/dashboard**.

## 7. Log in

On `/login`, enter the same email + password → **Log in**.

- [ ] **Pass:** back on the dashboard. (If you'd been redirected from a specific
      page, you land back there.)
- [ ] **If it fails:** "Email or password is incorrect." (wrong details) or
      "This email hasn't been confirmed yet…" (email confirmation is still ON —
      turn it off, step 0).

---

## Quick failure → fix map

| What you see | Likely cause | Fix |
|---|---|---|
| `/debug`: connection FAIL | wrong URL/anon key, or dev server not restarted | fix `.env.local`, restart `npm run dev` |
| `/debug`: tables FAIL | 0001 not run | run `0001_initial_schema.sql` |
| `/debug`: trigger FAIL | 0002 not run | run `0002_auth_signup_trigger.sql` |
| `/debug`: trigger unknown | 0003 not run | run `0003_health_check.sql` |
| signup: "Database error saving new user" | a table is missing so the trigger errors | run 0001 + 0002 |
| signup lands on "check your email" | email confirmation is ON | turn it OFF (step 0) |
| dashboard shows Paws & Co., not my business | expected in Stage 2 | real data comes in Stage 3 |

Demo untouched: with no real keys (the public site / a fresh clone) everything
stays open and mock, exactly as before.
