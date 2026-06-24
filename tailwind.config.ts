import type { Config } from "tailwindcss";

/**
 * GroomOS design tokens.
 *
 * Principles:
 *  - One warm blush-cream base (warm canvas, soft near-black ink).
 *  - ONE accent (terracotta-rose) reserved for primary actions and focus.
 *  - Everything else is neutral. No rainbow.
 *  - 4px spacing rhythm, deliberate type scale, soft elevation, soft radius.
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

      // Warm blush-cream base — the only neutrals in the system.
      canvas: "#FCF6F4", // app background (warm blush-cream)
      surface: "#FFFFFF", // cards / raised surfaces
      "surface-sunken": "#F7EEEB", // wells, zebra, quiet fills

      ink: {
        DEFAULT: "#2A2422", // primary text (warm near-black)
        muted: "#8A7470", // secondary text
        subtle: "#B3A39E", // tertiary / placeholder
        inverse: "#FCF6F4", // text on accent / dark
      },

      border: {
        DEFAULT: "#F1DEDA", // hairline 1px borders
        strong: "#E7D0CB", // emphasized dividers, input borders
      },

      // ONE accent — warm terracotta-rose. Primary actions + focus only.
      accent: {
        50: "#FBEEEB", // faint tint
        100: "#F7E3DF", // soft accent / badge bg
        200: "#E8A8A0", // soft highlight / selected
        300: "#DD9189",
        400: "#D28076",
        500: "#C9756B", // primary
        600: "#B25F56", // hover
        700: "#7A3B36", // active / deep text-on-tint
        DEFAULT: "#C9756B",
      },

      // Functional states — gentle, distinct from the rose accent.
      success: { DEFAULT: "#5E8C6A", soft: "#E8F0E9", deep: "#3E6B4C" }, // soft sage
      warning: { DEFAULT: "#B08442", soft: "#F8EFDF", deep: "#7A5A26" }, // soft honey
      danger: { DEFAULT: "#BD5248", soft: "#F8E7E4", deep: "#8A3A33" }, // muted brick
    },

    borderColor: {
      DEFAULT: "#F1DEDA",
      strong: "#E7D0CB",
      transparent: "transparent",
      accent: "#C9756B",
      ink: "#2A2422",
      success: "#5E8C6A",
      warning: "#B08442",
      danger: "#BD5248",
    },

    // Spacing uses Tailwind's default 4px-based scale (0.5=2px, 1=4px, 2=8px,
    // 4=16px, …). It is intentionally left at the default so the full rhythm is
    // available; the design discipline is in *using* it consistently.

    fontFamily: {
      sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
      // Editorial display serif — landing headlines only.
      display: ["var(--font-display)", "ui-serif", "Georgia", "Cambria", "serif"],
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
      sm: "8px",
      DEFAULT: "10px",
      md: "10px",
      lg: "12px", // buttons, inputs
      xl: "16px", // cards
      "2xl": "20px", // hero / large surfaces
      full: "9999px",
    },

    boxShadow: {
      none: "none",
      // Soft, low-spread, warm-tinted elevation only — no heavy drop shadows.
      xs: "0 1px 1px rgba(74, 45, 40, 0.03)",
      sm: "0 1px 2px rgba(74, 45, 40, 0.05), 0 1px 1px rgba(74, 45, 40, 0.03)",
      card: "0 1px 2px rgba(74, 45, 40, 0.04), 0 4px 12px rgba(74, 45, 40, 0.04)",
      md: "0 4px 16px rgba(74, 45, 40, 0.07), 0 1px 3px rgba(74, 45, 40, 0.04)",
      lg: "0 16px 40px rgba(74, 45, 40, 0.12), 0 2px 8px rgba(74, 45, 40, 0.05)",
      // Premium elevation for hero surfaces and lifted cards.
      xl: "0 28px 64px rgba(74, 45, 40, 0.16), 0 6px 16px rgba(74, 45, 40, 0.06)",
      // Accent focus ring.
      focus: "0 0 0 3px rgba(201, 117, 107, 0.22)",
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
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      animation: {
        "fade-in": "fade-in 200ms cubic-bezier(0.22, 1, 0.36, 1)",
        "fade-up": "fade-up 240ms cubic-bezier(0.22, 1, 0.36, 1)",
        float: "float 6s cubic-bezier(0.42, 0, 0.58, 1) infinite",
      },
    },
  },
  plugins: [],
};

export default config;
