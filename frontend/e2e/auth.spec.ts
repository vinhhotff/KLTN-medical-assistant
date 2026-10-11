import { test, expect } from '@playwright/test';
import { installMockApi } from './fixtures/mockApi';

test.describe('UC-SEC-01: Authentication', () => {
  test('login form starts empty and login button needs both fields', async ({ page }) => {
    await installMockApi(page);
    await page.goto('/login');
    await page.getByRole('button', { name: /Đăng nhập hệ thống ngay/ }).click();

    const email = page.locator('form input[type="email"]');
    const password = page.locator('form input[type="password"]');
    await expect(email).toHaveValue('');
    await expect(password).toHaveValue('');

    const submit = page.getByRole('button', { name: /Đăng Nhập Vào Hệ Thống/ });
    await expect(submit).toBeDisabled();
    await email.fill('patient@mediassist.local');
    await expect(submit).toBeDisabled();
    await password.fill('Patient@SecurePass2026!');
    await expect(submit).toBeEnabled();
  });

  test('demo presets are available in dev and log the patient in', async ({ page }) => {
    await installMockApi(page);
    await page.goto('/login');
    await page.getByRole('button', { name: /Đăng nhập hệ thống ngay/ }).click();
    await expect(page.getByTestId('demo-presets')).toBeVisible();
    await page.getByTestId('demo-presets').getByRole('button', { name: /Bệnh Nhân/ }).click();
    await page.getByRole('button', { name: /Đăng Nhập Vào Hệ Thống/ }).click();
    await expect(page).toHaveURL(/\/patient$/);
  });

  test('invalid credentials show the backend error', async ({ page }) => {
    await installMockApi(page);
    await page.goto('/login');
    await page.getByRole('button', { name: /Đăng nhập hệ thống ngay/ }).click();
    await page.locator('form input[type="email"]').fill('nobody@mediassist.local');
    await page.locator('form input[type="password"]').fill('WrongPassword1!');
    await page.getByRole('button', { name: /Đăng Nhập Vào Hệ Thống/ }).click();
    await expect(page.getByText('Email hoặc mật khẩu không đúng')).toBeVisible();
  });

  test('expired session opens the login tab with a notice', async ({ page }) => {
    await installMockApi(page);
    await page.goto('/login?expired=true');
    await expect(page.getByText('Phiên đăng nhập đã hết hạn')).toBeVisible();
    await expect(page.getByRole('button', { name: /Đăng Nhập Vào Hệ Thống/ })).toBeVisible();
  });

  test('forgot password calls the API, disables while sending and shows the neutral message', async ({ page }) => {
    const calls: Array<{ method: string; path: string; body: unknown }> = [];
    await installMockApi(page, {
      calls,
      overrides: {
        'POST /auth/forgot-password': {
          delay: 600,
          body: { success: true, data: null, message: 'Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được xử lý.' },
        },
      },
    });
    await page.goto('/login');
    await page.getByRole('button', { name: /Đăng nhập hệ thống ngay/ }).click();
    await page.getByText('Quên mật khẩu?').click();

    const dialog = page.getByRole('dialog', { name: 'Khôi phục mật khẩu' });
    const send = dialog.getByRole('button', { name: /Gửi hướng dẫn/ });
    await expect(send).toBeDisabled();
    await dialog.locator('#forgot-email').fill('not-an-email');
    await expect(send).toBeDisabled();
    await dialog.locator('#forgot-email').fill('patient@mediassist.local');
    await send.click();
    await expect(dialog.getByRole('button', { name: /Đang gửi/ })).toBeDisabled();
    await expect(page.getByTestId('forgot-success')).toContainText('Nếu email tồn tại trong hệ thống');

    expect(calls.filter((c) => c.path === '/auth/forgot-password')).toHaveLength(1);
    expect(calls.find((c) => c.path === '/auth/forgot-password')?.body).toEqual({ email: 'patient@mediassist.local' });
    const text = await dialog.innerText();
    expect(text).not.toContain('882 941');
    expect(text).not.toContain('password123');
  });

  test('register validates the password criteria that are displayed', async ({ page }) => {
    const calls: Array<{ method: string; path: string; body: unknown }> = [];
    await installMockApi(page, { calls });
    await page.goto('/login');
    await page.getByPlaceholder('Nguyễn Văn A').fill('Nguyễn Văn Test');
    await page.locator('input[type="date"]').first().fill('1990-01-01');
    await page.getByPlaceholder('0912 345 678').fill('0912345678');
    await page.getByPlaceholder('nguyena@gmail.com').fill('test@example.com');
    await page.getByPlaceholder('Tối thiểu 8 ký tự').fill('password1');
    await page.getByPlaceholder('Nhập lại mật khẩu').fill('password1');

    const submit = page.getByRole('button', { name: /Tạo Tài Khoản/ });
    await expect(submit).toBeDisabled(); // terms not accepted by default
    await page.locator('#terms').check();
    await submit.click();
    await expect(page.getByText('Mật khẩu cần ít nhất 1 chữ hoa')).toBeVisible();
    expect(calls.some((c) => c.path === '/auth/register')).toBe(false);

    // Date of birth cannot be in the future
    const max = await page.locator('input[type="date"]').first().getAttribute('max');
    expect(max).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
