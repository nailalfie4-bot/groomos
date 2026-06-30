import Link from "next/link";
import { Logo } from "@/components/logo";

/** Shared centred card shell for the login + signup pages. */
export function AuthCard({
  title,
  subtitle,
  configured,
  children,
  altPrompt,
  altLabel,
  altHref,
}: {
  title: string;
  subtitle: string;
  configured: boolean;
  children: React.ReactNode;
  altPrompt: string;
  altLabel: string;
  altHref: string;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-5 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="rounded-2xl border border-DEFAULT bg-surface p-6 shadow-card sm:p-8">
          <h1 className="text-xl font-semibold tracking-tight text-ink">{title}</h1>
          <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>

          {!configured && (
            <div className="mt-4 rounded-xl border border-accent/20 bg-accent-50 p-3 text-xs leading-relaxed text-ink-muted">
              <span className="font-medium text-ink">Demo mode.</span> Supabase
              isn&apos;t configured here, so creating and using accounts is
              switched off.{" "}
              <Link href="/dashboard" className="font-medium text-accent hover:underline">
                View the demo →
              </Link>
            </div>
          )}

          <div className="mt-6">{children}</div>
        </div>

        <p className="mt-6 text-center text-sm text-ink-muted">
          {altPrompt}{" "}
          <Link href={altHref} className="font-medium text-accent hover:underline">
            {altLabel}
          </Link>
        </p>
      </div>
    </div>
  );
}
