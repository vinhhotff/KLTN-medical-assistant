import { test, expect } from '@playwright/test';
import { installMockApi } from './fixtures/mockApi';

test.describe('Admin actions require a reason / valid input', () => {
  test('admin cancel needs a reason of ≥ 10 characters and sends it verbatim', async ({ page }) => {
    const calls: Array<{ method: string; path: string; body: unknown }> = [];
    await installMockApi(page, { role: 'ADMIN', calls });
    await page.goto('/admin/appointments');
    await page.getByRole('button', { name: /^Hủy lịch hẹn / }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Can thiệp hủy cuộc hẹn' });
    const confirm = dialog.getByRole('button', { name: 'Xác nhận hủy lịch' });
    await expect(confirm).toBeDisabled();
    await dialog.locator('#confirm-reason').fill('quá ngắn');
    await expect(confirm).toBeDisabled();
    await dialog.locator('#confirm-reason').fill('Bác sĩ nghỉ đột xuất, đã báo bệnh nhân');
    await confirm.click();
    await expect(dialog).toBeHidden();
    const call = calls.find((c) => c.method === 'PATCH' && c.path.endsWith('/cancel'));
    expect(call?.body).toEqual({ reason: 'Bác sĩ nghỉ đột xuất, đã báo bệnh nhân' });
  });

  test('suspending a user requires a reason', async ({ page }) => {
    await installMockApi(page, { role: 'ADMIN' });
    await page.goto('/admin/users');
    await page.getByRole('button', { name: /Tạm khóa/ }).first().click();
    const confirm = page.getByRole('button', { name: 'Xác nhận thay đổi' });
    await expect(confirm).toBeDisabled();
    await page.locator('#status-reason').fill('Vi phạm quy chế sử dụng nhiều lần');
    await expect(confirm).toBeEnabled();
  });

  test('create doctor form starts empty and requires a specialty and a fee', async ({ page }) => {
    const calls: Array<{ method: string; path: string; body: unknown }> = [];
    await installMockApi(page, { role: 'ADMIN', calls });
    await page.goto('/admin/doctors');
    await page.getByRole('button', { name: /Thêm/ }).first().click();

    const form = page.locator('form').filter({ has: page.getByTestId('create-doctor-submit') });
    await expect(form.getByPlaceholder('Tên bệnh viện đang công tác').or(form.getByPlaceholder('BV Đại học Y Dược, BV Chợ Rẫy...'))).toHaveValue('');
    await expect(form.getByPlaceholder('VD: 250000')).toHaveValue('');

    await form.getByPlaceholder('ten.bacsi@benhvien.vn').fill('bs.moi@benhvien.vn');
    await form.getByPlaceholder('Tối thiểu 8 ký tự, có chữ và số').fill('Matkhau123');
    await form.getByPlaceholder('Họ và tên đầy đủ').fill('BS. Người Mới');
    await form.getByPlaceholder('001234/BYT-CCHN').fill('009999/BYT-CCHN');
    await page.getByTestId('create-doctor-submit').click();
    await expect(form.getByText('Chọn ít nhất 1 chuyên khoa.')).toBeVisible();
    await expect(form.getByText('Phí khám phải lớn hơn 0.')).toBeVisible();
    expect(calls.some((c) => c.method === 'POST' && c.path === '/admin/doctors')).toBe(false);

    await form.getByRole('button', { name: 'Tim mạch' }).click();
    await form.getByPlaceholder('VD: 250000').fill('300000');
    await page.getByTestId('create-doctor-submit').click();
    await expect.poll(() => calls.some((c) => c.method === 'POST' && c.path === '/admin/doctors')).toBe(true);
    const body = calls.find((c) => c.method === 'POST' && c.path === '/admin/doctors')?.body as Record<string, unknown>;
    expect(body).toMatchObject({ specialtySlugs: ['tim-mach'], consultationFee: 300000 });
    expect(body.hospitalAffiliation).toBeUndefined();
  });
});

test.describe('Doctor profile', () => {
  test('load failure shows an error instead of a pre-filled fake profile', async ({ page }) => {
    await installMockApi(page, { role: 'DOCTOR', overrides: { 'GET /doctors/22222222-2222-2222-2222-222222222222': { status: 500 } } });
    await page.goto('/doctor/profile');
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByRole('button', { name: /Lưu thay đổi/ })).toHaveCount(0);
    await expect(page.getByText('008921/BYT-CCHN')).toHaveCount(0);
  });

  test('loaded profile keeps every specialty when saving', async ({ page }) => {
    const calls: Array<{ method: string; path: string; body: unknown }> = [];
    await installMockApi(page, {
      role: 'DOCTOR',
      calls,
      overrides: {
        'GET /doctors/22222222-2222-2222-2222-222222222222': {
          body: { success: true, data: { id: 'x', licenseNumber: 'CCHN-1', consultationFee: 200000, yearsOfExperience: 4, specialties: ['Tim mạch', 'Tiêu hóa'] } },
        },
      },
    });
    await page.goto('/doctor/profile');
    await expect(page.locator('#dp-fee')).toHaveValue('200000');
    await page.getByRole('button', { name: /Lưu thay đổi/ }).click();
    await expect.poll(() => calls.some((c) => c.method === 'PUT' && c.path === '/doctors/me/profile')).toBe(true);
    const body = calls.find((c) => c.method === 'PUT')?.body as { specialtySlugs: string[] };
    expect(body.specialtySlugs.sort()).toEqual(['tieu-hoa', 'tim-mach']);
  });
});
