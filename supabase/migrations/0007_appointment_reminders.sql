-- ===========================================================================
-- GroomOS — automatic appointment reminders
-- ---------------------------------------------------------------------------
-- Tracks when the ~24h-before email reminder was sent for an upcoming
-- appointment, so the daily reminder cron never emails the same booking twice.
-- Kept separate from `reminder_sent_at` (which the retention / "due for a
-- groom" rebooking flow uses on COMPLETED appointments) so the two never clash.
--
-- HOW TO RUN: Supabase Dashboard -> SQL Editor -> New query -> paste -> Run.
-- Safe to re-run.
-- ===========================================================================

alter table public.appointments
  add column if not exists appointment_reminder_sent_at timestamptz;

-- The cron scans upcoming, not-yet-reminded appointments by start time.
create index if not exists appointments_reminder_scan_idx
  on public.appointments (start_at)
  where appointment_reminder_sent_at is null;
