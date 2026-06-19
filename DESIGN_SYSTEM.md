# GroomOS — Design System Foundations

The operating system for modern grooming businesses. These are the foundations:
the tokens, primitives, and rules every screen is built from. Reference bar:
Linear, Stripe, Monzo, Notion — restrained, confident, generous with whitespace.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000 — the foundations showcase
npm run build    # production build
npm run typecheck
```

The showcase at `/` (`app/page.tsx`) demonstrates every foundation and primitive
in context.

## Principles

- **One warm neutral base.** Stone off-white canvas `#FAFAF8`, near-black ink
  `#1A1A1A`. These are the only greys in the system.
- **One accent.** Evergreen `#1F7A4D`, reserved for the single primary action on
  a view and for focus rings. Never decoration, never a rainbow.
- **4px spacing rhythm.** Generous padding. Density is the enemy.
- **Soft elevation.** 1px hairline borders (`#EAEAEA`) and low-spread shadows —
  no heavy drop shadows.
- **One radius family.** 8–12px, never mixed.
- **Deliberate type.** Inter via `next/font`, scale 12 / 14 / 16 / 20 / 28 / 40 /
  56 with tight line-heights. Numbers use tabular figures.

## Tokens

All tokens live in [`tailwind.config.ts`](tailwind.config.ts). Tailwind's default
palette is replaced entirely so stray blues/greys can't leak in.

| Group | Tokens |
| --- | --- |
| Surfaces | `canvas`, `surface`, `surface-sunken` |
| Text | `ink`, `ink-muted`, `ink-subtle`, `ink-inverse` |
| Lines | `border`, `border-strong` |
| Accent | `accent-50…700` (`accent` = 500) |
| States | `success`, `warning`, `danger` (+ `*-soft`) |
| Radius | `sm` 6 · `DEFAULT/md` 8 · `lg` 10 · `xl` 12 |
| Shadow | `xs`, `sm`, `card`, `md`, `lg`, `focus` |
| Motion | `duration-fast` 150ms · `duration-normal` 200ms · `ease-out-soft` |

## Primitives

| Component | File | Notes |
| --- | --- | --- |
| `Logo` / `LogoMark` | `components/logo.tsx` | GroomOS wordmark + comb mark |
| `Button` | `components/ui/button.tsx` | primary / secondary / ghost / danger · 40px · loading state |
| `Input` | `components/ui/input.tsx` | accent focus ring, inline validation, leading icon |
| `Card` | `components/ui/card.tsx` | header / title / description / content / footer |
| `Badge` | `components/ui/badge.tsx` | neutral / accent / success / warning / danger · optional dot |
| `Stat` | `components/ui/stat.tsx` | tabular figures, signed delta |
| `Skeleton` | `components/ui/skeleton.tsx` | shimmer loader — use instead of spinners |
| `EmptyState` | `components/ui/empty-state.tsx` | icon + heading + one line + one CTA |
| `Modal` | `components/ui/modal.tsx` | Framer Motion scrim + spring panel |
| `Toaster` / `toast` | `components/ui/toaster.tsx` (sonner) | action confirmations, not alerts |

## Conventions

- Compose classes with `cn()` from `lib/utils.ts` (clsx + tailwind-merge).
- Icons: Lucide only, one weight, 16px in controls.
- Loading: skeletons, never spinners (the button busy state aside).
- Feedback: toasts, never `alert()`.
- Motion: 150–200ms ease-out, reserved for meaningful moments.
