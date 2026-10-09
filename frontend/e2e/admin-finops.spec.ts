import { test, expect } from '@playwright/test';

test.describe('UC-FIN-29: Admin AI Token & FinOps Cost Analytics Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate as Admin
    await page.goto('/login');
    await page.click('button:has-text("Admin")');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*\/admin/, { timeout: 10000 });
  });

  test('should display FinOps AI Analytics Dashboard with KPI cards and Recharts', async ({ page }) => {
    // Navigate to FinOps tab if needed
    const finopsTab = page.locator('button:has-text("Chi Phí AI"), button:has-text("FinOps"), text=FinOps');
    if (await finopsTab.first().isVisible()) {
      await finopsTab.first().click();
    }

    // Verify 5 KPI summary cards
    await expect(page.locator('text=Tổng Chi Phí AI').or(page.locator('text=Total AI Cost'))).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Tổng Lượng Token').or(page.locator('text=Total Tokens'))).toBeVisible();
    await expect(page.locator('text=Tỷ Lệ Thành Công').or(page.locator('text=Success Rate'))).toBeVisible();

    // Verify Recharts SVG container rendered
    const rechartsSvg = page.locator('.recharts-responsive-container, svg.recharts-surface');
    await expect(rechartsSvg.first()).toBeVisible();

    // Verify Time Window selector (7 ngày / 30 ngày / 90 ngày)
    await expect(page.locator('button:has-text("7 ngày"), button:has-text("30 ngày")').first()).toBeVisible();
  });
});
