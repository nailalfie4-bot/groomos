import type { Metadata } from "next";
import { Inter, Fraunces, Caveat } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import { StoreProvider } from "@/lib/mock/store";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

// Editorial display serif — warm, soft, optical-sized. Pairs with Inter for
// the landing page's headlines (the only place the serif appears).
const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

// Neat handwriting — the "marker on the whiteboard" voice on the calendar.
const caveat = Caveat({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-hand",
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "GroomOS — Grooming business, run simply",
  description:
    "The operating system for modern grooming businesses. Bookings, clients, services and billing in one calm place.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable} ${caveat.variable}`}>
      <body>
        <StoreProvider>{children}</StoreProvider>
        <Toaster />
      </body>
    </html>
  );
}
