import { test, expect } from '@playwright/test';
import { installMockApi, APPOINTMENTS } from './fixtures/mockApi';

test.describe('UC-CLIN-27: E-admission ticket', () => {
  test('renders real room / STT / address and the directions link when the backend provides them', async ({ page }) => {
    const ticket = {
      ...APPOINTMENTS[0],
      sttNumber: 'A-012',
      clinicRoom: 'Phòng 305',
      clinicFloor: 'Tầng 3',
      clinicBuilding: 'Khu B',
      clinicAddress: '1 Đường Thử Nghiệm, TP.HCM',
      preVisitInstructions: ['Nhịn ăn 8 tiếng trước khi xét nghiệm máu'],
    };
    await installMockApi(page, {
      role: 'PATIENT',
      overrides: { 'GET /appointments/ap-1/ticket': { body: { success: true, data: ticket } } },
    });
    await page.goto('/patient');
    await page.getByRole('button', { name: /Xem Phiếu Khám/ }).first().click();

    const card = page.locator('#e-admission-ticket');
    await expect(card.getByText('A-012')).toBeVisible();
    await expect(card.getByText('Phòng 305 — Tầng 3')).toBeVisible();
    await expect(card.getByText('Nhịn ăn 8 tiếng trước khi xét nghiệm máu')).toBeVisible();
    await expect(card.locator('svg').first()).toBeVisible(); // QR code
    await expect(page.getByRole('link', { name: /Chỉ đường/ })).toHaveAttribute('href', /maps\.google\.com/);
    await expect(page.getByRole('button', { name: /In phiếu khám/ })).toBeVisible();

    const calendar = await page.getByRole('link', { name: /Google Calendar/ }).getAttribute('href');
    expect(decodeURIComponent(calendar || '')).toContain('Phòng 305');
  });

  test('Esc closes the ticket', async ({ page }) => {
    await installMockApi(page, { role: 'PATIENT' });
    await page.goto('/patient');
    await page.getByRole('button', { name: /Xem Phiếu Khám/ }).first().click();
    await expect(page.locator('#e-admission-ticket')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#e-admission-ticket')).toBeHidden();
  });
});
