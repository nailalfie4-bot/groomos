import Link from "next/link";
import { PawPrint } from "lucide-react";

/** Public directory chrome — its own light header + footer, distinct from the
 *  groomer-facing app. The footer carries the required /directory-information
 *  link on every directory page. */
export default function DirectoryLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-canvas text-ink">
      <header className="border-b border-DEFAULT bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/directory" className="inline-flex items-center gap-2 font-semibold tracking-tight text-ink">
            <PawPrint className="h-5 w-5 text-accent" />
            GroomOS <span className="font-normal text-ink-muted">Directory</span>
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-ink-inverse transition-colors hover:bg-accent-600"
          >
            List your business
          </Link>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-DEFAULT bg-surface">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-6 text-sm text-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} GroomOS — the UK dog grooming directory.</p>
          <nav className="flex flex-wrap gap-x-4 gap-y-1">
            <Link href="/directory" className="hover:text-ink">Directory</Link>
            <Link href="/directory-information" className="hover:text-ink">About this directory</Link>
            <Link href="/" className="hover:text-ink">GroomOS for groomers</Link>
            <Link href="/privacy" className="hover:text-ink">Privacy</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
