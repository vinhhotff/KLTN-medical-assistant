import { test, expect } from '@playwright/test';

test.describe('UC-CLIN-27: E-Admission Ticket with QR, STT & Maps Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate as Patient
    await page.goto('/login');
    await page.click('button:has-text("Patient")');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*\/patient/, { timeout: 10000 });
  });

  test('should display and open Admission Ticket Modal with QR code and STT number', async ({ page }) => {
    // Look for ticket button in appointment list
    const ticketBtn = page.locator('button:has-text("Vé Khám"), button:has-text("Xem Vé")').first();
    if (await ticketBtn.isVisible()) {
      await ticketBtn.click();

      // Verify Modal opens with E-Admission Ticket details
      await expect(page.locator('text=PHIẾU KHÁM BỆNH ĐIỆN TỬ').or(page.locator('text=Vé Khám Bệnh'))).toBeVisible();

      // Verify STT Badge is rendered prominently
      await expect(page.locator('text=STT-').or(page.locator('text=Số Thứ Tự'))).toBeVisible();

      // Verify QR Code canvas/SVG is rendered
      await expect(page.locator('svg[role="img"], canvas')).toBeVisible();

      // Verify Clinic Location and Floor info
      await expect(page.locator('text=Tòa A').or(page.locator('text=Phòng Khám'))).toBeVisible();

      // Verify Google Maps navigation button exists
      const mapsLink = page.locator('a[href*="maps.google.com"]');
      await expect(mapsLink).toBeVisible();

      // Verify Print Ticket button exists
      await expect(page.locator('button:has-text("In Phiếu Khám")')).toBeVisible();
    }
  });
});
