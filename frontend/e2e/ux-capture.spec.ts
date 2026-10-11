import { test } from '@playwright/test';
import { installMockApi, type Role } from './fixtures/mockApi';

/**
 * UX audit screenshot capture (not a regression test).
 * Run with: UX_CAPTURE=before npx playwright test ux-capture --project=chromium
 * Output: ux-audit/<UX_CAPTURE>/<role>-<page>-<viewport>.png (folder is git-ignored).
 */
const phase = process.env.UX_CAPTURE;

const PAGES: Array<{ role: Role | null; name: string; path: string }> = [
  { role: null, name: 'landing', path: '/' },
  { role: null, name: 'login', path: '/login' },
  { role: 'PATIENT', name: 'dashboard', path: '/patient' },
  { role: 'PATIENT', name: 'triage', path: '/patient/triage' },
  { role: 'PATIENT', name: 'documents', path: '/patient/documents' },
  { role: 'PATIENT', name: 'doctors', path: '/patient/doctors' },
  { role: 'DOCTOR', name: 'dashboard', path: '/doctor' },
  { role: 'DOCTOR', name: 'patients', path: '/doctor/patients' },
  { role: 'DOCTOR', name: 'profile', path: '/doctor/profile' },
  { role: 'ADMIN', name: 'dashboard', path: '/admin' },
  { role: 'ADMIN', name: 'appointments', path: '/admin/appointments' },
  { role: 'ADMIN', name: 'triage', path: '/admin/triage' },
  { role: 'ADMIN', name: 'doctors', path: '/admin/doctors' },
  { role: 'ADMIN', name: 'users', path: '/admin/users' },
  { role: 'ADMIN', name: 'specialties', path: '/admin/specialties' },
  { role: 'ADMIN', name: 'audit-logs', path: '/admin/audit-logs' },
];

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

test.describe('UX audit capture', () => {
  test.skip(!phase, 'Set UX_CAPTURE=before|after to capture screenshots');

  for (const vp of VIEWPORTS) {
    for (const p of PAGES) {
      test(`${vp.name} ${p.role ?? 'public'} ${p.name}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await installMockApi(page, { role: p.role });
        await page.goto(p.path);
        await page.waitForLoadState('networkidle').catch(() => undefined);
        await page.waitForTimeout(800);
        await page.screenshot({
          path: `ux-audit/${phase}/${(p.role ?? 'public').toLowerCase()}-${p.name}-${vp.name}.png`,
          fullPage: true,
        });
      });
    }
  }
});
