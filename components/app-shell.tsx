"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  CalendarDays,
  CreditCard,
  ExternalLink,
  HeartHandshake,
  LayoutDashboard,
  LogOut,
  Menu,
  PawPrint,
  RotateCcw,
  Scissors,
  Settings,
  Users,
  X,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { Skeleton } from "@/components/ui/skeleton";
import { useStore } from "@/lib/mock/store";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/appointments", label: "Appointments", icon: PawPrint },
  { href: "/retention", label: "Due for a groom", icon: HeartHandshake },
  { href: "/services", label: "Services", icon: Scissors },
  { href: "/billing", label: "Billing", icon: CreditCard },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

/** Core tabs surfaced in the mobile bottom bar — every screen one tap away. */
const MOBILE_TABS = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/services", label: "Services", icon: Scissors },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, hydrated, business, logout, resetDemo } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);

  // Demo auth guard — bounce to onboarding if there's no session.
  useEffect(() => {
    if (hydrated && !session) router.replace("/");
  }, [hydrated, session, router]);

  if (!hydrated || !session) {
    return (
      <div className="min-h-screen bg-canvas p-6">
        <Skeleton className="h-8 w-40" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-DEFAULT bg-surface md:flex">
        <div className="flex h-16 items-center px-5">
          <Logo />
        </div>
        <nav className="flex-1 space-y-1 px-3 py-2">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-fast",
                isActive(pathname, href)
                  ? "bg-surface-sunken font-medium text-ink"
                  : "text-ink-muted hover:bg-surface-sunken hover:text-ink",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-DEFAULT p-3">
          <Link
            href="/book"
            target="_blank"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink-muted transition-colors duration-fast hover:bg-surface-sunken hover:text-ink"
          >
            <ExternalLink className="h-4 w-4" />
            Public booking
          </Link>
          <button
            onClick={resetDemo}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink-muted transition-colors duration-fast hover:bg-surface-sunken hover:text-ink"
          >
            <RotateCcw className="h-4 w-4" />
            Reset demo data
          </button>
          <button
            onClick={() => {
              logout();
              router.replace("/");
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink-muted transition-colors duration-fast hover:bg-surface-sunken hover:text-ink"
          >
            <LogOut className="h-4 w-4" />
            Exit demo
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-DEFAULT bg-canvas/85 px-4 backdrop-blur-md md:hidden">
        <Logo />
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Menu"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-sunken"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* Mobile overflow menu */}
      {menuOpen && (
        <div className="fixed inset-0 top-14 z-20 bg-canvas px-4 py-4 md:hidden">
          <p className="px-1 pb-2 text-xs font-medium uppercase tracking-wider text-ink-subtle">
            {business.name}
          </p>
          <nav className="space-y-1">
            {NAV.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm",
                  isActive(pathname, href)
                    ? "bg-surface-sunken font-medium text-ink"
                    : "text-ink-muted",
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
            <Link
              href="/book"
              target="_blank"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-ink-muted"
            >
              <ExternalLink className="h-4 w-4" />
              Public booking page
            </Link>
            <button
              onClick={() => {
                resetDemo();
                setMenuOpen(false);
              }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-ink-muted"
            >
              <RotateCcw className="h-4 w-4" />
              Reset demo data
            </button>
            <button
              onClick={() => {
                logout();
                router.replace("/");
              }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-ink-muted"
            >
              <LogOut className="h-4 w-4" />
              Exit demo
            </button>
          </nav>
        </div>
      )}

      {/* Main content */}
      <main className="md:pl-60">
        <div className="mx-auto max-w-5xl px-4 pb-24 pt-6 sm:px-6 md:pb-12">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav — thumb-friendly, every screen one tap away */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-DEFAULT bg-surface/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
        {MOBILE_TABS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className="flex flex-1 flex-col items-center gap-1 pb-1.5 pt-2 text-[11px] font-medium"
            >
              <span
                className={cn(
                  "flex h-7 w-12 items-center justify-center rounded-full transition-colors duration-fast",
                  active ? "bg-accent-100 text-accent-700" : "text-ink-subtle",
                )}
              >
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <span className={active ? "text-accent-700" : "text-ink-subtle"}>
                {label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
