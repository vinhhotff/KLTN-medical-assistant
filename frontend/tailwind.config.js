import colors from 'tailwindcss/colors.js';

/**
 * AETHER BIO-ATELIER // SWISS CLINICAL PRECISION PALETTE
 * Replaces generic hospital teal + cool slate with:
 * - Warm Alabaster, Travertine & Obsidian Carbon (`slate` / `neutral` / `surface`)
 * - Electric Cobalt-Violet (`teal` / `brand` / `secondary`)
 * - Editorial Vermilion & Botanical Sage (`accent` / `success`)
 */
const obsidianStone = {
  50: '#F6F3EC',   // Warm Alabaster Paper Canvas
  100: '#EDE8DF',  // Soft Travertine Stone
  200: '#DDD6C9',  // Architectural Hairline Border
  300: '#C6BDB0',  // Warm Pewter
  400: '#9A9083',  // Muted Graphite
  500: '#6E665C',  // Editorial Secondary Ink
  600: '#504941',  // Deep Charcoal Ink
  700: '#36312B',  // Espresso Carbon
  800: '#1F1C18',  // Dark Obsidian Surface
  900: '#12100E',  // Pure Bio-Obsidian Ink
  950: '#090807',  // Void Carbon
};

const electricCobalt = {
  50: '#EEF0FF',
  100: '#DFE3FF',
  200: '#C5CCFF',
  300: '#9EA8FF',
  400: '#747DFF',
  500: '#5658F6',
  600: '#4338CA',  // Primary Electric Cobalt-Indigo
  700: '#352BA8',
  800: '#2A2287',
  900: '#1E1966',
  950: '#120E42',
};

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Remap legacy scales so every component adopts the Aether Bio-Atelier aesthetic
        teal: electricCobalt,
        slate: obsidianStone,
        brand: electricCobalt,
        neutral: obsidianStone,
        success: colors.emerald,
        warning: colors.amber,
        danger: colors.rose,
        info: colors.violet,
        vermilion: {
          50: '#FFF2EE',
          100: '#FFE1D6',
          500: '#F04E23',
          600: '#D93B12',
          700: '#B42D0B',
        },

        primary: obsidianStone[900],
        "on-primary": '#F6F3EC',
        "primary-container": obsidianStone[800],
        "primary-fixed": electricCobalt[100],
        "on-primary-fixed": obsidianStone[900],

        secondary: electricCobalt[600],
        "on-secondary": '#FFFFFF',
        "secondary-container": electricCobalt[100],
        "on-secondary-container": electricCobalt[800],
        "secondary-fixed": electricCobalt[200],
        "secondary-fixed-dim": electricCobalt[300],
        "on-secondary-fixed": electricCobalt[950],

        surface: obsidianStone[50],
        "surface-variant": obsidianStone[200],
        "surface-container-lowest": '#FCFBF8',
        "surface-container-low": obsidianStone[100],
        "surface-container": obsidianStone[100],
        "surface-container-high": obsidianStone[200],
        "on-surface": obsidianStone[900],
        "on-surface-variant": obsidianStone[600],
        outline: obsidianStone[500],
        "outline-variant": obsidianStone[300],

        error: colors.rose[700],
        "error-container": colors.rose[100],
        "on-error-container": colors.rose[900],
      },
      spacing: {
        "space-xs": "0.5rem",
        "gutter-sm": "1rem",
        "gutter": "1.5rem",
        "margin": "2rem",
        "space-xl": "2rem",
        "space-lg": "1.5rem",
        "space-2xs": "0.25rem",
        "space-2xl": "3rem",
        "margin-sm": "1rem",
        "space-md": "1rem",
        "space-sm": "0.75rem"
      },
      fontFamily: {
        sans: ["DM Sans", "sans-serif"],
        display: ["Space Grotesk", "sans-serif"],
        serif: ["Instrument Serif", "serif"],
        mono: ["JetBrains Mono", "monospace"],
        "display-lg": ["Space Grotesk", "sans-serif"],
        "headline-lg": ["Space Grotesk", "sans-serif"],
        "headline-md": ["Space Grotesk", "sans-serif"],
        "headline-sm": ["Space Grotesk", "sans-serif"],
        "title-md": ["Space Grotesk", "sans-serif"],
        "body-lg": ["DM Sans", "sans-serif"],
        "body-md": ["DM Sans", "sans-serif"],
        "body-sm": ["DM Sans", "sans-serif"],
        "label-md": ["JetBrains Mono", "monospace"],
        "label-sm": ["JetBrains Mono", "monospace"],
      },
      fontSize: {
        "display-lg": ["44px", { lineHeight: "50px", letterSpacing: "-0.03em", fontWeight: "700" }],
        "headline-lg": ["32px", { lineHeight: "38px", letterSpacing: "-0.025em", fontWeight: "700" }],
        "headline-md": ["24px", { lineHeight: "30px", letterSpacing: "-0.02em", fontWeight: "700" }],
        "headline-sm": ["20px", { lineHeight: "26px", letterSpacing: "-0.015em", fontWeight: "600" }],
        "title-md": ["16px", { lineHeight: "22px", letterSpacing: "-0.01em", fontWeight: "600" }],
        "body-lg": ["16px", { lineHeight: "26px", fontWeight: "400" }],
        "body-md": ["14px", { lineHeight: "21px", fontWeight: "400" }],
        "body-sm": ["12px", { lineHeight: "17px", fontWeight: "400" }],
        "label-md": ["12px", { lineHeight: "16px", letterSpacing: "0.03em", fontWeight: "600" }],
        "label-sm": ["11px", { lineHeight: "14px", letterSpacing: "0.06em", fontWeight: "600" }],
      },
      borderRadius: {
        "DEFAULT": "0.375rem",
        "lg": "0.625rem",
        "xl": "0.875rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
        "full": "9999px"
      },
      boxShadow: {
        "2xs": "0 1px 0 0 rgba(18, 16, 14, 0.06)",
        "xs": "0 2px 0 0 rgba(18, 16, 14, 0.07)",
        "sm": "0 2px 0 0 rgba(18, 16, 14, 0.08), 0 4px 12px -2px rgba(18, 16, 14, 0.05)",
        "md": "0 3px 0 0 rgba(18, 16, 14, 0.1), 0 8px 20px -4px rgba(18, 16, 14, 0.07)",
        "lg": "0 4px 0 0 rgba(18, 16, 14, 0.12), 0 14px 28px -6px rgba(18, 16, 14, 0.09)",
        "xl": "0 6px 0 0 rgba(18, 16, 14, 0.14), 0 20px 38px -8px rgba(18, 16, 14, 0.12)",
        "atelier": "0 3px 0 0 #12100E",
        "atelier-sm": "0 2px 0 0 #12100E",
        "atelier-cobalt": "0 3px 0 0 #2A2287",
      },
      backdropBlur: {
        xs: "2px",
      },
      keyframes: {
        fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
        scaleUp: { from: { opacity: "0", transform: "scale(0.97)" }, to: { opacity: "1", transform: "scale(1)" } },
        marquee: {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        fadeIn: "fadeIn 180ms ease-out",
        scaleUp: "scaleUp 180ms ease-out",
        marquee: "marquee 28s linear infinite",
      },
    },
  },
  plugins: [],
}
