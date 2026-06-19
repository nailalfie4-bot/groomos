# GroomOS

The operating system for modern grooming businesses.

This repository contains the **design system foundations** — the tokens,
primitives, and rules every GroomOS screen is built from. Reference bar:
Linear, Stripe, Monzo, Notion — restrained, confident, generous with whitespace.

## Stack

- [Next.js 14](https://nextjs.org) (App Router) + TypeScript
- [Tailwind CSS](https://tailwindcss.com) with a fully custom token set
- [Inter](https://rsms.me/inter/) via `next/font`
- [Framer Motion](https://www.framer.com/motion/) for meaningful moments
- [Lucide](https://lucide.dev) icons · [sonner](https://sonner.emilkowal.ski) toasts

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000 — the foundations showcase
npm run build      # production build
npm run typecheck  # tsc --noEmit
```

The showcase at `/` (`app/page.tsx`) demonstrates every token and primitive
in context.

## Documentation

See [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) for the principles, the full token
reference, the primitive catalogue, and the system conventions.
