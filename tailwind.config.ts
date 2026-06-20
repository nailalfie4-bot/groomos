import type { Config } from "tailwindcss";

/**
 * GroomOS design tokens.
 *
 * Principles:
 *  - One warm neutral base (stone off-white canvas, near-black ink).
 *  - ONE accent (evergreen) reserved for primary actions and focus.
 *  - Everything else is neutral. No rainbow.
 *  - 4px spacing rhythm, deliberate type scale, soft elevation, single radius family.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    // Replace Tailwind's default palette entirely so stray blues/greys can't leak in.
    colors: {
      transparent: "transparent",
      current: "currentColor",
      white: "#FFFFFF",
      black: "#000000",

      // Warm neutral base — the only greys in the system.
      canvas: "#FAFAF8", // app background
      surface: "#FFFFFF", // cards / raised surfaces
      "surface-sunken": "#F4F4F1", // wells, code, table zebra

      ink: {
        DEFAULT: "#1A1A1A", // primary text
        muted: "#6B6B66", // secondary text
        subtle: "#9A9A93", // tertiary / placeholder
        inverse: "#FAFAF8", // text on accent / dark
      },

      border: {
        DEFAULT: "#EAEAEA", // hairline 1px borders
        strong: "#DCDCD6", // emphasized dividers, input borders
      },

      // ONE accent — evergreen. Used sparingly for primary actions + focus only.
      accent: {
        50: "#ECF6F0",
        100: "#D2EBDD",
        200: "#A8D7BE",
        300: "#76BD98",
        400: "#449E72",
        500: "#1F7A4D", // primary
        600: "#19663F", // hover
        700: "#134E31", // active
        DEFAULT: "#1F7A4D",
      },

      // Functional states — quiet, desaturated, never decorative.
      success: { DEFAULT: "#1F7A4D", soft: "#ECF6F0" },
      warning: { DEFAULT: "#9A6B16", soft: "#FAF2E2" },
      danger: { DEFAULT: "#B23B30", soft: "#FBEDEC" },
    },

    borderColor: {
      DEFAULT: "#EAEAEA",
      strong: "#DCDCD6",
      transparent: "transparent",
      accent: "#1F7A4D",
      ink: "#1A1A1A",
      success: "#1F7A4D",
      warning: "#9A6B16",
      danger: "#B23B30",
    },

    // Spacing uses Tailwind's default 4px-based scale (0.5=2px, 1=4px, 2=8px,
    // 4=16px, …). It is intentionally left at the default so the full rhythm is
    // available; the design discipline is in *using* it consistently.

    fontFamily: {
      sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
    },

    // Deliberate type scale: 12 / 14 / 16 / 20 / 28 / 40 / 56.
    fontSize: {
      xs: ["12px", { lineHeight: "16px", letterSpacing: "0" }],
      sm: ["14px", { lineHeight: "20px", letterSpacing: "0" }],
      base: ["16px", { lineHeight: "24px", letterSpacing: "0" }],
      lg: ["20px", { lineHeight: "28px", letterSpacing: "-0.01em" }],
      xl: ["28px", { lineHeight: "34px", letterSpacing: "-0.02em" }],
      "2xl": ["40px", { lineHeight: "44px", letterSpacing: "-0.025em" }],
      "3xl": ["56px", { lineHeight: "60px", letterSpacing: "-0.03em" }],
    },

    fontWeight: {
      normal: "400",
      medium: "500",
      semibold: "600",
    },

    borderRadius: {
      none: "0",
      sm: "6px",
      DEFAULT: "8px",
      md: "8px",
      lg: "10px",
      xl: "12px",
      full: "9999px",
    },

    boxShadow: {
      none: "none",
      // Soft, low-spread elevation only — no heavy drop shadows.
      xs: "0 1px 1px rgba(26, 26, 26, 0.03)",
      sm: "0 1px 2px rgba(26, 26, 26, 0.05), 0 1px 1px rgba(26, 26, 26, 0.03)",
      card: "0 1px 2px rgba(26, 26, 26, 0.04), 0 2px 6px rgba(26, 26, 26, 0.03)",
      md: "0 4px 12px rgba(26, 26, 26, 0.06), 0 1px 3px rgba(26, 26, 26, 0.04)",
      lg: "0 12px 32px rgba(26, 26, 26, 0.10), 0 2px 8px rgba(26, 26, 26, 0.05)",
      // Accent focus ring.
      focus: "0 0 0 3px rgba(31, 122, 77, 0.18)",
    },

    extend: {
      fontFeatureSettings: {
        tabular: '"tnum", "lnum"',
      },
      transitionTimingFunction: {
        "out-soft": "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      transitionDuration: {
        fast: "150ms",
        normal: "200ms",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-in": "fade-in 200ms cubic-bezier(0.22, 1, 0.36, 1)",
        "fade-up": "fade-up 240ms cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
