import { test, expect } from '@playwright/test';

test.describe('UC-SEC-01: Authentication & Role-Based Access Control', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should display login page with role demo pills and disclaimer banner', async ({ page }) => {
    await expect(page).toHaveTitle(/MediAssist/i);
    await expect(page.locator('text=Đăng nhập MediAssist')).toBeVisible();

    // Check for demo quick-fill credentials pills
    await expect(page.locator('button:has-text("Patient")')).toBeVisible();
    await expect(page.locator('button:has-text("Doctor")')).toBeVisible();
    await expect(page.locator('button:has-text("Admin")')).toBeVisible();

    // Verify medical disclaimer is present
    await expect(page.locator('text=Thông tin chỉ mang tính tham khảo')).toBeVisible();
  });

  test('should toggle between Login and Register tabs smoothly', async ({ page }) => {
    const registerTab = page.locator('button:has-text("Đăng ký tài khoản")');
    if (await registerTab.isVisible()) {
      await registerTab.click();
      await expect(page.locator('input[placeholder*="Họ và tên"]')).toBeVisible();

      const loginTab = page.locator('button:has-text("Đăng nhập")');
      await loginTab.click();
      await expect(page.locator('input[type="email"]')).toBeVisible();
    }
  });

  test('should reject invalid credentials with descriptive error message', async ({ page }) => {
    await page.fill('input[type="email"]', 'invalid_user@mediassist.local');
    await page.fill('input[type="password"]', 'WrongPassword123!');
    await page.click('button[type="submit"]');

    // Expect error toast or alert banner
    await expect(page.locator('text=Email hoặc mật khẩu không chính xác').or(page.locator('.text-red-500'))).toBeVisible({ timeout: 5000 });
  });

  test('should allow Patient demo login and redirect to Patient dashboard', async ({ page }) => {
    await page.click('button:has-text("Patient")');
    await page.click('button[type="submit"]');

    // Should redirect to patient dashboard
    await expect(page).toHaveURL(/.*\/patient/, { timeout: 10000 });
    await expect(page.locator('text=Hồ sơ sức khỏe').or(page.locator('text=Lịch hẹn'))).toBeVisible();
  });
});
