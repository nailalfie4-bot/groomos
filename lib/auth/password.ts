/**
 * Password strength — a sensible, non-draconian minimum shared by the
 * change-password, reset-password and invite-accept flows.
 *
 * Rule: at least 8 characters, with at least one letter and one number. The
 * score (0–3) drives the strength meter; `ok` gates submission.
 */
export interface PasswordCheck {
  ok: boolean;
  score: 0 | 1 | 2 | 3;
  label: string;
  issues: string[];
}

export function checkPassword(pw: string): PasswordCheck {
  const issues: string[] = [];
  if (pw.length < 8) issues.push("Use at least 8 characters");
  if (!/[a-zA-Z]/.test(pw)) issues.push("Add a letter");
  if (!/[0-9]/.test(pw)) issues.push("Add a number");

  const ok = pw.length >= 8 && /[a-zA-Z]/.test(pw) && /[0-9]/.test(pw);

  let raw = 0;
  if (pw.length >= 8) raw++;
  if (pw.length >= 12) raw++;
  const variety =
    /[^a-zA-Z0-9]/.test(pw) || (/[a-z]/.test(pw) && /[A-Z]/.test(pw) && /[0-9]/.test(pw));
  if (variety) raw++;
  const score = Math.min(3, raw) as 0 | 1 | 2 | 3;

  const label = !pw ? "" : !ok ? "Too weak" : score >= 3 ? "Strong" : score === 2 ? "Good" : "OK";
  return { ok, score, label, issues };
}

export const PASSWORD_RULE_HINT = "At least 8 characters, with a letter and a number.";
