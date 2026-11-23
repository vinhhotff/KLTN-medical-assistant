import colors from 'tailwindcss/colors.js';

/**
 * MEDIASSIST CLINICAL PALETTE (Stitch redesign, 2026-11)
 * - Cool neutral canvas: Tailwind `slate` (no remap) — page bg slate-50, cards white, hairlines slate-200
 * - Patient accent: `indigo` (`brand`) — triage, booking, profile, history
 * - Doctor / document accent: real Tailwind `teal`
 * - Admin chrome: slate-900 sidebar + indigo accent
 * - Safety: `rose` for red-flag / emergency, `amber` for the medical disclaimer and warnings
 */

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
        brand: colors.indigo,
        neutral: colors.slate,
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

        primary: colors.slate[900],
        "on-primary": '#FFFFFF',
        "primary-container": colors.slate[800],
        "primary-fixed": colors.indigo[100],
        "on-primary-fixed": colors.slate[900],

        secondary: colors.indigo[600],
        "on-secondary": '#FFFFFF',
        "secondary-container": colors.indigo[100],
        "on-secondary-container": colors.indigo[800],
        "secondary-fixed": colors.indigo[200],
        "secondary-fixed-dim": colors.indigo[300],
        "on-secondary-fixed": colors.indigo[950],

        surface: colors.slate[50],
        "surface-variant": colors.slate[200],
        "surface-container-lowest": '#FFFFFF',
        "surface-container-low": colors.slate[100],
        "surface-container": colors.slate[100],
        "surface-container-high": colors.slate[200],
        "on-surface": colors.slate[900],
        "on-surface-variant": colors.slate[600],
        outline: colors.slate[500],
        "outline-variant": colors.slate[300],

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
        sans: ["'Be Vietnam Pro'", "'Inter'", "-apple-system", "BlinkMacSystemFont", "'Segoe UI'", "Roboto", "sans-serif"],
        display: ["'Be Vietnam Pro'", "'Inter'", "-apple-system", "BlinkMacSystemFont", "'Segoe UI'", "Roboto", "sans-serif"],
        serif: ["'Be Vietnam Pro'", "'Inter'", "-apple-system", "BlinkMacSystemFont", "'Segoe UI'", "Roboto", "sans-serif"],
        mono: ["'Be Vietnam Pro'", "'Inter'", "-apple-system", "BlinkMacSystemFont", "'Segoe UI'", "Roboto", "sans-serif"],
        code: ["'JetBrains Mono'", "monospace"],
      },
      fontSize: {
        "display-lg": ["42px", { lineHeight: "52px", letterSpacing: "-0.02em", fontWeight: "700" }],
        "headline-lg": ["30px", { lineHeight: "38px", letterSpacing: "-0.018em", fontWeight: "700" }],
        "headline-md": ["24px", { lineHeight: "32px", letterSpacing: "-0.015em", fontWeight: "700" }],
        "headline-sm": ["20px", { lineHeight: "28px", letterSpacing: "-0.01em", fontWeight: "600" }],
        "title-md": ["16px", { lineHeight: "24px", letterSpacing: "-0.005em", fontWeight: "600" }],
        "body-lg": ["16px", { lineHeight: "26px", fontWeight: "400" }],
        "body-md": ["14px", { lineHeight: "22px", fontWeight: "400" }],
        "body-sm": ["12.5px", { lineHeight: "18px", fontWeight: "400" }],
        "label-md": ["12px", { lineHeight: "16px", letterSpacing: "0.02em", fontWeight: "600" }],
        "label-sm": ["11px", { lineHeight: "15px", letterSpacing: "0.03em", fontWeight: "600" }],
      },
      borderRadius: {
        "DEFAULT": "0.375rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "2xl": "1rem",
        "3xl": "1.25rem",
        "full": "9999px"
      },
      boxShadow: {
        "2xs": "0 1px 1px 0 rgba(15, 23, 42, 0.03)",
        "xs": "0 1px 2px 0 rgba(15, 23, 42, 0.05)",
        "sm": "0 1px 2px 0 rgba(15, 23, 42, 0.05), 0 1px 3px 0 rgba(15, 23, 42, 0.04)",
        "md": "0 4px 6px -1px rgba(15, 23, 42, 0.06), 0 2px 4px -2px rgba(15, 23, 42, 0.05)",
        "lg": "0 10px 15px -3px rgba(15, 23, 42, 0.07), 0 4px 6px -4px rgba(15, 23, 42, 0.05)",
        "xl": "0 20px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.05)",
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
