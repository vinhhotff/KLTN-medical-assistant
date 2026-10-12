import { test, expect } from '@playwright/test';
import { installMockApi } from './fixtures/mockApi';

const SESSION_ID = '99999999-9999-9999-9999-999999999999';

const routineResponse = {
  success: true,
  data: {
    sessionId: SESSION_ID,
    emergency: false,
    emergencyAlert: null,
    medicalRelated: true,
    urgencyLevel: 'ROUTINE',
    primarySpecialtySlug: 'tieu-hoa',
    primarySpecialtyName: 'Tiêu hóa',
    sbarSummary: 'S: Đau thượng vị sau ăn. A: Nghi viêm dạ dày. R: Khám Tiêu hóa.',
    aiAdvice: 'Bạn nên khám chuyên khoa Tiêu hóa.',
    clarifyingQuestions: [],
    matchedDoctors: [
      {
        doctorId: '55555555-5555-5555-5555-555555555555', fullName: 'BS. Phạm Thu Hà', bio: null, licenseNumber: 'CCHN-002',
        yearsOfExperience: 0, consultationFee: null, similarityScore: 0.82, specialties: ['Tiêu hóa'], rating: 4.9, reviewCount: 0,
      },
    ],
  },
};

test.describe('UC-CLIN-02: Symptom triage assistant', () => {
  test('welcome message and disclaimer are shown on /patient/triage', async ({ page }) => {
    await installMockApi(page, { role: 'PATIENT' });
    await page.goto('/patient/triage');
    await expect(page.getByText('Xin chào! Tôi là Trợ lý Y tế AI của MediAssist')).toBeVisible();
    await expect(page.getByText('Khuyến Cáo Lâm Sàng')).toBeVisible();
  });

  test('booking from triage links the session instead of copying a truncated SBAR into notes', async ({ page }) => {
    const calls: Array<{ method: string; path: string; body: unknown }> = [];
    await installMockApi(page, {
      role: 'PATIENT',
      calls,
      overrides: { 'POST /triage/assess': { body: routineResponse } },
    });
    await page.goto('/patient/triage');
    await page.getByPlaceholder(/Nhập triệu chứng của bạn/).fill('Đau thượng vị sau ăn, ợ chua');
    await page.keyboard.press('Enter');

    // No fake "5.0" rating or 350.000đ fee for a doctor without reviews / fee
    await expect(page.getByText('Chưa có đánh giá')).toBeVisible();
    await expect(page.getByText('Phí: liên hệ')).toBeVisible();
    await expect(page.getByText('350.000')).toHaveCount(0);

    await page.getByRole('button', { name: 'Đặt Khám' }).click();
    const dialog = page.getByRole('dialog');
    const notes = dialog.locator('#booking-notes');
    await expect(notes).toHaveValue(/Triệu chứng: Đau thượng vị sau ăn, ợ chua/);
    await expect(notes).toHaveValue(/Chuyên khoa AI gợi ý: Tiêu hóa/);
    await expect(notes).not.toHaveValue(/Tóm tắt SBAR|S: Đau thượng vị sau ăn\. A:/);
    await expect(notes).not.toHaveValue(/Triage AI Session/);
    await expect(dialog.getByTestId('triage-link-info')).toContainText('Phiếu phân luồng AI (SBAR đầy đủ, mức độ khẩn) sẽ được đính kèm tự động');
    await expect(dialog.getByTestId('triage-link-missing')).toHaveCount(0);
    await notes.fill('Đau thượng vị 3 ngày, ợ chua sau ăn');

    const d = new Date();
    d.setDate(d.getDate() + 3);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    await dialog.locator('#slot-date').fill(iso);
    const confirm = dialog.getByRole('button', { name: 'Xác nhận đặt khám' });
    await expect(confirm).toBeDisabled();
    await dialog.getByRole('radio', { name: '08:00' }).click();
    await confirm.click();
    await expect(page.getByTestId('booking-success')).toBeVisible();

    const booking = calls.find((c) => c.method === 'POST' && c.path === '/appointments');
    expect((booking?.body as { triageSessionId?: string }).triageSessionId).toBe(SESSION_ID);
    expect(booking?.body).toMatchObject({
      doctorId: '55555555-5555-5555-5555-555555555555',
      triageSessionId: SESSION_ID,
      notes: 'Đau thượng vị 3 ngày, ợ chua sau ăn',
      scheduledStart: `${iso}T08:00:00`,
    });
  });

  test('long symptoms are not silently cut: the modal blocks > 1000 chars', async ({ page }) => {
    await installMockApi(page, { role: 'PATIENT', overrides: { 'POST /triage/assess': { body: routineResponse } } });
    await page.goto('/patient/triage');
    await page.getByPlaceholder(/Nhập triệu chứng của bạn/).fill('Đau thượng vị '.repeat(80).trim());
    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: 'Đặt Khám' }).click();
    const dialog = page.getByRole('dialog');
    const value = await dialog.locator('#booking-notes').inputValue();
    expect(value.length).toBeGreaterThan(1000);
    await expect(dialog.getByText('Tối đa 1000 ký tự.')).toBeVisible();
  });

  test('missing sessionId: booking still allowed but the patient is warned', async ({ page }) => {
    const calls: Array<{ method: string; path: string; body: unknown }> = [];
    await installMockApi(page, {
      role: 'PATIENT',
      calls,
      overrides: { 'POST /triage/assess': { body: { ...routineResponse, data: { ...routineResponse.data, sessionId: null } } } },
    });
    await page.goto('/patient/triage');
    await page.getByPlaceholder(/Nhập triệu chứng của bạn/).fill('Đau thượng vị sau ăn, ợ chua');
    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: 'Đặt Khám' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByTestId('triage-link-missing')).toContainText('Không liên kết được phiên phân luồng AI');
    await expect(dialog.getByTestId('triage-link-info')).toHaveCount(0);

    const d = new Date();
    d.setDate(d.getDate() + 3);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    await dialog.locator('#slot-date').fill(iso);
    await dialog.getByRole('radio', { name: '08:00' }).click();
    await dialog.getByRole('button', { name: 'Xác nhận đặt khám' }).click();
    await expect(page.getByTestId('booking-success')).toBeVisible();
    const booking = calls.find((c) => c.method === 'POST' && c.path === '/appointments');
    expect((booking?.body as { triageSessionId?: string }).triageSessionId).toBeUndefined();
  });

  test('emergency answer shows the 115 call-to-action and locks routine booking', async ({ page }) => {
    await installMockApi(page, {
      role: 'PATIENT',
      overrides: {
        'POST /triage/assess': {
          body: {
            success: true,
            data: { ...routineResponse.data, emergency: true, urgencyLevel: 'EMERGENCY', emergencyAlert: 'Nghi nhồi máu cơ tim cấp' },
          },
        },
      },
    });
    await page.goto('/patient/triage');
    await page.getByPlaceholder(/Nhập triệu chứng của bạn/).fill('Đau thắt ngực dữ dội, vã mồ hôi');
    await page.keyboard.press('Enter');
    await expect(page.getByText(/TÌNH TRẠNG KHẨN CẤP/)).toBeVisible();
    await expect(page.getByRole('link', { name: /Gọi 115/ }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Đặt Khám' })).toBeDisabled();
  });
});
