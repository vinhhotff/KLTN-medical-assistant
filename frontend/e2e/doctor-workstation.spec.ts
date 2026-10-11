import { test, expect } from '@playwright/test';
import { installMockApi } from './fixtures/mockApi';

test.describe('UC-CLIN-28: Doctor workstation', () => {
  test('weekly calendar view lists the day columns', async ({ page }) => {
    await installMockApi(page, { role: 'DOCTOR' });
    await page.goto('/doctor');
    await page.getByRole('button', { name: /Lịch Tuần/ }).click();
    await expect(page.getByRole('columnheader', { name: /Thứ Hai/ })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Chủ Nhật/ })).toBeVisible();
  });

  test('check-in moves a SCHEDULED patient to CHECKED_IN and blocks double clicks', async ({ page }) => {
    const calls: Array<{ method: string; path: string; body: unknown }> = [];
    await installMockApi(page, {
      role: 'DOCTOR',
      calls,
      overrides: { 'PATCH /appointments/ap-1/check-in': { delay: 600, body: { success: true, data: { id: 'ap-1' } } } },
    });
    await page.goto('/doctor');
    const checkIn = page.getByRole('button', { name: 'Check-in' }).first();
    await checkIn.dblclick();
    await expect(page.getByTestId('toast-success')).toContainText('check-in');
    expect(calls.filter((c) => c.path === '/appointments/ap-1/check-in')).toHaveLength(1);
  });

  test('a SCHEDULED appointment opened in the workstation cannot be signed before check-in', async ({ page }) => {
    await installMockApi(page, {
      role: 'DOCTOR',
      overrides: { 'PATCH /appointments/ap-1/status': { status: 400, body: { success: false, error: { code: 'INVALID_STATUS_TRANSITION', message: 'Không thể chuyển trạng thái.' } } } },
    });
    await page.goto('/doctor');
    await page.getByRole('button', { name: /Bắt Đầu Khám Bệnh/ }).first().click();
    await expect(page.getByTestId('toast-error')).toContainText('Không thể chuyển trạng thái');
    await expect(page.getByTestId('sign-blockers')).toContainText('chưa check-in');
    await expect(page.getByRole('button', { name: /Ký Duyệt & Hoàn Tất/ })).toBeDisabled();
  });
});
