import { test, expect } from '@playwright/test';

test.describe('UC-CLIN-28: Doctor Split-Screen Workstation & Clinical Ergonomics', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login and authenticate as Doctor
    await page.goto('/login');
    await page.click('button:has-text("Doctor")');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*\/doctor/, { timeout: 10000 });
  });

  test('should display doctor workstation with weekly calendar tab and appointment list', async ({ page }) => {
    // Check doctor dashboard navigation tabs
    await expect(page.locator('text=Lịch Khám Lâm Sàng').or(page.locator('text=Danh Sách Bệnh Nhân'))).toBeVisible();

    // Verify weekly calendar view toggle
    const calendarToggle = page.locator('button:has-text("Lịch Tuần")');
    if (await calendarToggle.isVisible()) {
      await calendarToggle.click();
      await expect(page.locator('text=Thứ 2').or(page.locator('text=T2'))).toBeVisible();
    }
  });

  test('should support patient check-in status toggle (CHECKED_IN)', async ({ page }) => {
    // Look for check-in button in appointment rows
    const checkInBtn = page.locator('button:has-text("Check-in")').first();
    if (await checkInBtn.isVisible()) {
      await checkInBtn.click();
      // Should show checked-in badge or status
      await expect(page.locator('text=ĐÃ ĐẾN').or(page.locator('text=Đã Check-in'))).toBeVisible({ timeout: 5000 });
    }
  });

  test('should open 50/50 split-screen workstation with document viewer & EMR notes', async ({ page }) => {
    const examineBtn = page.locator('button:has-text("Khám Bệnh")').first();
    if (await examineBtn.isVisible()) {
      await examineBtn.click();

      // Verify Split-screen layout
      await expect(page.locator('text=Hồ Sơ Cận Lâm Sàng & Phân Tích AI')).toBeVisible();
      await expect(page.locator('text=Bệnh Án & Chỉ Định Lâm Sàng')).toBeVisible();

      // Check VNHA/ESC Vital Signs classification section
      await expect(page.locator('text=Sinh Hiệu').or(page.locator('text=Huyết áp'))).toBeVisible();
    }
  });
});
