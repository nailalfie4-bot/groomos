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

const SITE_URL = "https://groomos.vercel.app";
const OG_TITLE = "Stop no-shows costing you — online booking + reminders for UK dog groomers";
const OG_DESCRIPTION =
  "One no-show costs you £45. GroomOS costs £29. Give clients an online booking page with an automatic reminder before every appointment — so far fewer no-shows, and your calendar fills without the DMs.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "GroomOS — Stop no-shows costing you. Online booking + reminders for UK dog groomers",
  description:
    "GroomOS gives UK dog groomers an online booking page with an automatic reminder before every appointment — so far fewer no-shows, and less time lost to booking DMs. Free 30-day trial, no card needed.",
  applicationName: "GroomOS",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "GroomOS",
  },
  openGraph: {
    type: "website",
    siteName: "GroomOS",
    url: SITE_URL,
    title: OG_TITLE,
    description: OG_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: OG_TITLE,
    description: OG_DESCRIPTION,
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
