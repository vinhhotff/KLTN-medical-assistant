import colors from 'tailwindcss/colors.js';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      // One palette for the whole app (B-23). Change colours HERE, not in pages.
      // Root scales: brand (teal) · neutral (slate) · success/warning/danger/info.
      // The Material-3 names below are kept only because LandingPage + index.html use them;
      // they now point at the root scales so Landing/Login match the dashboards.
      colors: {
        brand: colors.teal,
        neutral: colors.slate,
        success: colors.emerald,
        warning: colors.amber,
        danger: colors.rose,
        info: colors.sky,

        primary: colors.slate[900],
        "on-primary": colors.white,
        "primary-container": colors.slate[800],
        "primary-fixed": colors.teal[100],
        "on-primary-fixed": colors.slate[900],

        secondary: colors.teal[700],
        "on-secondary": colors.white,
        "secondary-container": colors.teal[200],
        "on-secondary-container": colors.teal[800],
        "secondary-fixed": colors.teal[200],
        "secondary-fixed-dim": colors.teal[300],
        "on-secondary-fixed": colors.teal[950],

        surface: colors.slate[50],
        "surface-variant": colors.slate[200],
        "surface-container-lowest": colors.white,
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
        "display-lg": ["Plus Jakarta Sans", "sans-serif"],
        "headline-lg": ["Plus Jakarta Sans", "sans-serif"],
        "headline-md": ["Plus Jakarta Sans", "sans-serif"],
        "headline-sm": ["Plus Jakarta Sans", "sans-serif"],
        "title-md": ["Plus Jakarta Sans", "sans-serif"],
        "body-lg": ["Inter", "sans-serif"],
        "body-md": ["Inter", "sans-serif"],
        "body-sm": ["Inter", "sans-serif"],
        "label-md": ["Inter", "sans-serif"],
        "label-sm": ["Inter", "sans-serif"],
      },
      fontSize: {
        "display-lg": ["40px", { lineHeight: "48px", letterSpacing: "-0.02em", fontWeight: "700" }],
        "headline-lg": ["32px", { lineHeight: "40px", letterSpacing: "-0.02em", fontWeight: "700" }],
        "headline-md": ["24px", { lineHeight: "32px", letterSpacing: "-0.01em", fontWeight: "600" }],
        "headline-sm": ["20px", { lineHeight: "28px", fontWeight: "600" }],
        "title-md": ["16px", { lineHeight: "24px", fontWeight: "600" }],
        "body-lg": ["16px", { lineHeight: "24px", fontWeight: "400" }],
        "body-md": ["14px", { lineHeight: "20px", fontWeight: "400" }],
        "body-sm": ["12px", { lineHeight: "16px", fontWeight: "400" }],
        "label-md": ["13px", { lineHeight: "18px", letterSpacing: "0.01em", fontWeight: "600" }],
        "label-sm": ["11px", { lineHeight: "14px", letterSpacing: "0.04em", fontWeight: "600" }],
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
        "full": "9999px"
      },
      boxShadow: {
        "2xs": "0 1px 1px 0 rgba(15, 41, 66, 0.04)",
        "xs": "0 1px 2px 0 rgba(15, 41, 66, 0.05)",
      },
      // Utilities used across pages that Tailwind 3 does not ship by default
      backdropBlur: {
        xs: "2px",
      },
      keyframes: {
        fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
        scaleUp: { from: { opacity: "0", transform: "scale(0.97)" }, to: { opacity: "1", transform: "scale(1)" } },
      },
      animation: {
        fadeIn: "fadeIn 150ms ease-out",
        scaleUp: "scaleUp 150ms ease-out",
      },
    },
  },
  plugins: [],
}
