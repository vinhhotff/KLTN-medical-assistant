import { test, expect } from '@playwright/test';
import { installMockApi } from './fixtures/mockApi';

test.use({ viewport: { width: 390, height: 844 } });

test.describe('Mobile navigation (390×844)', () => {
  test('patient bottom nav switches pages and marks the active tab', async ({ page }) => {
    await installMockApi(page, { role: 'PATIENT' });
    await page.goto('/patient');
    const nav = page.getByTestId('mobile-bottom-nav');
    await expect(nav).toBeVisible();
    await nav.getByRole('link', { name: 'Bác sĩ' }).click();
    await expect(page).toHaveURL(/\/patient\/doctors$/);
    await expect(nav.getByRole('link', { name: 'Bác sĩ' })).toHaveAttribute('aria-current', 'page');
    await nav.getByRole('link', { name: 'Xét nghiệm' }).click();
    await expect(page).toHaveURL(/\/patient\/documents$/);
    // The emergency number stays visible on phones (banner is not truncated)
    await expect(page.locator('a[href="tel:115"]').first()).toBeVisible();
  });

  test('doctor hamburger menu opens, navigates and closes', async ({ page }) => {
    await installMockApi(page, { role: 'DOCTOR' });
    await page.goto('/doctor');
    await page.getByRole('button', { name: 'Mở menu' }).click();
    const menu = page.locator('#doctor-mobile-menu');
    await expect(menu).toBeVisible();
    await menu.getByRole('link', { name: /Danh bạ bệnh nhân/ }).click();
    await expect(page).toHaveURL(/\/doctor\/patients$/);
    await expect(menu).toBeHidden();
  });

  test('admin drawer replaces the fixed sidebar', async ({ page }) => {
    await installMockApi(page, { role: 'ADMIN' });
    await page.goto('/admin');
    await page.getByRole('button', { name: 'Mở menu quản trị' }).click();
    const drawer = page.getByRole('dialog', { name: 'Menu quản trị' });
    await expect(drawer).toBeVisible();
    await drawer.getByRole('link', { name: 'Quản lý người dùng' }).click();
    await expect(page).toHaveURL(/\/admin\/users$/);
    await expect(drawer).toBeHidden();
  });

  test('no horizontal page scroll on key pages', async ({ page }) => {
    for (const [role, path] of [['PATIENT', '/patient'], ['PATIENT', '/patient/documents'], ['DOCTOR', '/doctor'], ['ADMIN', '/admin/users']] as const) {
      await installMockApi(page, { role });
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${path} overflows horizontally by ${overflow}px`).toBeLessThanOrEqual(1);
      await page.unrouteAll({ behavior: 'ignoreErrors' });
    }
  });
});
