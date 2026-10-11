import { test, expect } from '@playwright/test';
import { installMockApi } from './fixtures/mockApi';

test.describe('Doctor search', () => {
  test('patients cannot see the system-wide AI mode switch', async ({ page }) => {
    const calls: Array<{ method: string; path: string; body: unknown }> = [];
    await installMockApi(page, { role: 'PATIENT', calls });
    await page.goto('/patient/doctors');
    await expect(page.getByText('BS. Nguyễn Văn Tâm')).toBeVisible();
    await expect(page.getByRole('button', { name: /ngoại tuyến|Test Offline/i })).toHaveCount(0);
    expect(calls.some((c) => c.path.startsWith('/system/ai-mode'))).toBe(false);
  });

  test('admins see the AI mode switch behind a "technical details" section', async ({ page }) => {
    await installMockApi(page, { role: 'ADMIN' });
    await page.goto('/patient/doctors');
    await expect(page.getByRole('button', { name: /Chuyển AI sang ngoại tuyến|Bật lại AI/ })).toBeVisible();
  });

  test('missing fee and reviews are shown honestly', async ({ page }) => {
    await installMockApi(page, { role: 'PATIENT' });
    await page.goto('/patient/doctors');
    const card = page.locator('div.rounded-3xl', { hasText: 'BS. Phạm Thu Hà' });
    await expect(card.getByText('Liên hệ')).toBeVisible();
    await expect(card.getByText('Chưa có đánh giá')).toBeVisible();
    await expect(card.getByText(/300\.000|350\.000|1\.250/)).toHaveCount(0);
  });

  test('?specialty= from the triage assistant pre-selects the filter', async ({ page }) => {
    await installMockApi(page, { role: 'PATIENT' });
    await page.goto('/patient/doctors?specialty=tieu-hoa');
    await expect(page.getByLabel('Lọc theo chuyên khoa')).toHaveValue('Tiêu hóa');
    await expect(page.getByText('BS. Phạm Thu Hà')).toBeVisible();
    await expect(page.getByText('BS. Nguyễn Văn Tâm')).toHaveCount(0);
  });
});
