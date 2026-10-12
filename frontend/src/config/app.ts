/** Shared app-level constants. Keep values here instead of hard-coding them in pages. */

/** Hospital hotline printed on tickets and support banners. */
export const SUPPORT_HOTLINE = '1900 6868';
export const SUPPORT_HOTLINE_TEL = '19006868';

/** National emergency number — must stay visible on every patient flow. */
export const EMERGENCY_NUMBER = '115';

/**
 * Fallback USD→VND rate used only when /admin/ai-usage does not return a rate.
 * Backend source of truth: app.ai.cost.vnd-per-usd in application.properties.
 */
export const FALLBACK_USD_VND_RATE = 25450;

/** Show the demo-account quick-login buttons (seeded accounts). */
export const ENABLE_DEMO_LOGIN = import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEMO_LOGIN === 'true';

/** Show developer tools such as the AI offline toggle outside the admin role. */
export const ENABLE_DEV_TOOLS = import.meta.env.VITE_ENABLE_DEV_TOOLS === 'true';

/**
 * Show the system-wide AI mode switch as a demo tool (capstone defense) for non-admins.
 * Strict comparison on purpose: NOT enabled by `npm run dev`, so patients don't see it by default.
 * Can also be unlocked per tab with Ctrl+Shift+D (see hooks/useDemoToolsHotkey).
 */
export const ENABLE_DEMO_AI_TOGGLE = import.meta.env.VITE_ENABLE_DEMO_LOGIN === 'true';
