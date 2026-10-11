import { test, expect } from '@playwright/test';
import { installMockApi } from './fixtures/mockApi';

const FABRICATED = [
  'Trần Văn Hùng',
  '0909 123 888',
  'BN-2026',
  'DN4791234567890',
  'Phòng Khám Nội 102',
  'Bệnh viện Đa khoa Trung ương',
  'Số 128 Nguyễn Tri Phương',
  'Beta-lactam',
  '350.000',
  'Rh Dương',
];

test.describe('Patient dashboard shows only real data', () => {
  test('no fabricated identity, contact, clinic or fee values', async ({ page }) => {
    await installMockApi(page, { role: 'PATIENT' });
    await page.goto('/patient');
    await expect(page.getByText('APT-0001')).toBeVisible();
    const body = await page.locator('main').innerText();
    for (const fake of FABRICATED) {
      expect(body, `should not render "${fake}"`).not.toContain(fake);
    }
    await expect(page.getByText('Chưa cập nhật người liên hệ khẩn cấp.')).toBeVisible();
    await expect(page.getByText('Chưa xếp phòng — sẽ thông báo khi check-in').first()).toBeVisible();
    await expect(page.getByText('Chưa có phí')).toBeVisible();
    // The disclaimer banner stays on every patient page
    await expect(page.getByText('Khuyến Cáo Lâm Sàng')).toBeVisible();
  });

  test('completed EMR shows "Chưa đo" and no invented diagnosis', async ({ page }) => {
    await installMockApi(page, { role: 'PATIENT' });
    await page.goto('/patient');
    await page.getByRole('button', { name: /Xem Chi Tiết Bệnh Án EMR/ }).click();
    await expect(page.getByRole('heading', { name: /PHIẾU KHÁM BỆNH/ })).toBeVisible();
    await expect(page.getByText('135/85mmHg')).toBeVisible();
    await expect(page.getByText('Chưa đo').first()).toBeVisible();
    await expect(page.getByText('I20.9')).toHaveCount(0);
    await expect(page.getByText('120/80')).toHaveCount(0);
  });

  test('reschedule uses real slots and needs a slot before confirming', async ({ page }) => {
    const calls: Array<{ method: string; path: string; body: unknown }> = [];
    await installMockApi(page, { role: 'PATIENT', calls });
    await page.goto('/patient');
    await page.getByRole('button', { name: /Dời Lịch Hẹn/ }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Dời lịch hẹn khám' });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('input[type="time"]')).toHaveCount(0);

    const confirm = dialog.getByRole('button', { name: 'Xác nhận dời lịch' });
    await expect(confirm).toBeDisabled();

    // Pick a future date so slots are not filtered out as past
    const d = new Date();
    d.setDate(d.getDate() + 5);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    await dialog.locator('#slot-date').fill(iso);
    await dialog.getByRole('radio', { name: '14:00' }).click();
    await expect(confirm).toBeEnabled();
    await confirm.click();
    await expect(page.getByTestId('toast-success')).toContainText('Đã dời lịch');
    const call = calls.find((c) => c.method === 'PATCH' && c.path.endsWith('/reschedule'));
    expect((call?.body as { newScheduledStart: string }).newScheduledStart).toBe(`${iso}T14:00:00`);
  });

  test('payment without checkoutUrl shows an error instead of silently doing nothing', async ({ page }) => {
    await installMockApi(page, {
      role: 'PATIENT',
      overrides: { 'POST /payments/checkout': { body: { success: true, data: { transactionCode: 'TX1' } } } },
    });
    await page.goto('/patient');
    await page.getByRole('button', { name: /Thanh Toán Online/ }).first().click();
    await expect(page.getByTestId('toast-error')).toContainText('không trả về đường dẫn thanh toán');
  });

  test('admission ticket shows "pending" instead of fake STT / room / address', async ({ page }) => {
    await installMockApi(page, { role: 'PATIENT' });
    await page.goto('/patient');
    await page.getByRole('button', { name: /Xem Phiếu Khám/ }).first().click();
    const ticket = page.locator('#e-admission-ticket');
    await expect(ticket).toBeVisible();
    await expect(page.getByTestId('stt-pending')).toBeVisible();
    await expect(page.getByTestId('room-pending')).toBeVisible();
    const text = await ticket.innerText();
    for (const fake of ['STT-01', 'Phòng 205', 'Tầng 2', 'Tòa A', 'Lô E2a-7']) expect(text).not.toContain(fake);
    await expect(page.getByRole('link', { name: /Chỉ đường/ })).toHaveCount(0);
    await expect(ticket.getByText('1900 6868')).toBeVisible();
  });
});
