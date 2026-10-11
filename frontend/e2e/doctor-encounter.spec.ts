import { test, expect } from '@playwright/test';
import { installMockApi } from './fixtures/mockApi';

test.describe('UC-CLIN: Doctor clinical encounter sign-off', () => {
  test('never fabricates vitals and only enables signing when the record is valid', async ({ page }) => {
    const calls: Array<{ method: string; path: string; body: unknown }> = [];
    await installMockApi(page, { role: 'DOCTOR', calls });
    await page.goto('/doctor');

    // APT-0002 is CHECKED_IN and has no recorded vitals
    const card = page.locator('div.rounded-2xl', { hasText: 'APT-0002' }).filter({ has: page.getByRole('button', { name: /Bắt Đầu Khám/ }) }).last();
    await card.getByRole('button', { name: /Bắt Đầu Khám/ }).click();

    // Vitals start empty — no "120/80", "75", "36.8"…
    for (const id of ['vs-bp-sys', 'vs-bp-dia', 'vs-hr', 'vs-temp', 'vs-spo2', 'vs-height', 'vs-weight', 'vs-rr']) {
      await expect(page.locator(`#${id}`)).toHaveValue('');
    }
    await expect(page.locator('#emr-room')).toHaveValue('');

    const signButton = page.getByRole('button', { name: /Ký Duyệt & Hoàn Tất/ });
    await expect(signButton).toBeDisabled();
    const blockers = page.getByTestId('sign-blockers');
    await expect(blockers).toContainText('Chưa nhập lý do vào khám');
    await expect(blockers).toContainText('Chưa có chẩn đoán');

    await page.locator('#emr-chief').fill('Đau thượng vị sau ăn');
    await page.getByPlaceholder('I10').fill('K21.0');

    // Out-of-range vital blocks signing and shows an inline error
    await page.locator('#vs-hr').fill('500');
    await expect(page.locator('#vs-hr-error')).toContainText('30–220');
    await expect(signButton).toBeDisabled();
    await page.locator('#vs-hr').fill('88');

    // Only one half of the blood pressure is not allowed
    await page.locator('#vs-bp-sys').fill('130');
    await expect(signButton).toBeDisabled();
    await page.locator('#vs-bp-dia').fill('85');

    // An empty prescription row blocks signing until removed or completed
    await page.getByRole('button', { name: /Thêm Thuốc/ }).click();
    await expect(signButton).toBeDisabled();
    await page.getByRole('button', { name: 'Xóa dòng thuốc 1' }).click();

    // Follow-up date cannot be in the past
    const min = await page.locator('#emr-followup-date').getAttribute('min');
    expect(min).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    await expect(signButton).toBeEnabled();
    await signButton.click();

    const submit = calls.find((c) => c.path === '/appointments/ap-2/complete-clinical');
    expect(submit).toBeTruthy();
    const body = submit!.body as Record<string, unknown>;
    expect(JSON.parse(body.vitalSignsJson as string)).toEqual({ bloodPressure: '130/85', heartRate: 88 });
    expect(body.clinicRoom).toBeNull();
    expect(body.prescriptionJson).toBeNull();
    expect(body.chiefComplaint).toBe('Đau thượng vị sau ăn');
  });

  test('cancel requires a reason of at least 10 characters (no window.prompt)', async ({ page }) => {
    const calls: Array<{ method: string; path: string; body: unknown }> = [];
    await installMockApi(page, { role: 'DOCTOR', calls });
    await page.goto('/doctor');

    await page.getByRole('button', { name: /Hủy Ca/ }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Hủy ca khám' });
    await expect(dialog).toBeVisible();
    const confirm = dialog.getByRole('button', { name: 'Hủy ca khám' });
    await expect(confirm).toBeDisabled();
    await dialog.locator('#confirm-reason').fill('ngắn');
    await expect(confirm).toBeDisabled();
    await dialog.locator('#confirm-reason').fill('Bác sĩ có ca cấp cứu đột xuất');
    await confirm.click();
    await expect(dialog).toBeHidden();
    expect(calls.some((c) => c.method === 'PATCH' && /\/status$/.test(c.path) && (c.body as { status: string }).status === 'CANCELLED')).toBe(true);
  });

  test('completed record shows "Chưa đo" instead of fake vitals', async ({ page }) => {
    await installMockApi(page, { role: 'DOCTOR' });
    await page.goto('/doctor');
    await page.getByRole('button', { name: 'Tất Cả Ngày' }).click();
    await page.getByRole('button', { name: /Xem chi tiết hồ sơ bệnh án/ }).first().click();
    await expect(page.getByText('135/85')).toBeVisible();
    await expect(page.getByText('Chưa đo').first()).toBeVisible();
    await expect(page.getByText('120/80')).toHaveCount(0);
    await expect(page.getByText(/^72/)).toHaveCount(0);
  });
});
