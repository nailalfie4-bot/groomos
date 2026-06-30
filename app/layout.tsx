import type { Metadata, Viewport } from "next";
import { Inter, Fraunces, Caveat } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import { StoreProvider } from "@/lib/mock/store";
import { AuthProvider } from "@/components/auth-provider";
import { SWRegister } from "@/components/sw-register";
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
  applicationName: "GroomOS",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "GroomOS",
  },
};

export const viewport: Viewport = {
  themeColor: "#FCF6F4",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable} ${caveat.variable}`}>
      <body>
        <AuthProvider>
          <StoreProvider>{children}</StoreProvider>
        </AuthProvider>
        <Toaster />
        <SWRegister />
      </body>
    </html>
  );
}
