import { test, expect } from '@playwright/test';
import { installMockApi } from './fixtures/mockApi';

test.describe('UC-DOC-02: Cal.com-style Doctor Schedule Management', () => {
  test('dirty state gating, buffer time toggle, and tab switching work cleanly', async ({ page }) => {
    await installMockApi(page, { role: 'DOCTOR' });
    await page.goto('/doctor/schedule');

    const saveBtn = page.getByRole('button', { name: 'Lưu thay đổi' });
    const discardBtn = page.getByRole('button', { name: 'Hủy thay đổi' });
    await expect(saveBtn).toBeDisabled();
    await expect(discardBtn).toBeDisabled();

    // Select 10-minute buffer time -> becomes dirty
    await page.getByRole('radiogroup', { name: 'Thời gian nghỉ giữa ca' }).getByRole('radio', { name: '10′' }).click();
    await expect(saveBtn).toBeEnabled();
    await expect(discardBtn).toBeEnabled();
    await expect(page.getByText('Có thay đổi chưa lưu')).toBeVisible();

    // Discard restores clean state
    await discardBtn.click();
    await expect(saveBtn).toBeDisabled();
    await expect(page.getByText('Có thay đổi chưa lưu')).toHaveCount(0);

    // Switch to Date Exceptions tab & back
    await page.getByRole('tab', { name: /Ngày nghỉ & Ngoại lệ/ }).click();
    await expect(page.getByRole('heading', { name: /Danh sách ngày nghỉ & ngoại lệ sắp tới/ })).toBeVisible();
    await page.getByRole('tab', { name: /Lịch hàng tuần/ }).click();
    await expect(page.getByRole('heading', { name: 'Lịch hằng tuần' })).toBeVisible();
  });

  test('detects overlapping shifts in same day and blocks saving', async ({ page }) => {
    await installMockApi(page, { role: 'DOCTOR' });
    await page.goto('/doctor/schedule');

    const mondayRow = page.getByTestId('schedule-day-MONDAY');
    await mondayRow.getByRole('button', { name: 'Thêm khung giờ Thứ Hai' }).click();
    // Second shift defaults to 13:30 - 17:00; change its start to 10:00 so it overlaps 08:00 - 12:00
    await mondayRow.getByLabel('Thứ Hai ca 2 bắt đầu').selectOption('10:00');

    await expect(mondayRow.getByRole('alert')).toContainText('chồng chéo');
    await expect(page.getByRole('button', { name: 'Lưu thay đổi' })).toBeDisabled();
  });

  test('CopyToDaysPopover copies shifts across multiple weekdays and saves bundle', async ({ page }) => {
    const calls: Array<{ method: string; path: string; body: unknown }> = [];
    await installMockApi(page, { role: 'DOCTOR', calls });
    await page.goto('/doctor/schedule');

    const mondayRow = page.getByTestId('schedule-day-MONDAY');
    await mondayRow.getByRole('button', { name: 'Áp dụng lịch Thứ Hai cho nhiều ngày' }).click();

    const popover = page.getByRole('dialog', { name: 'Sao chép lịch từ Thứ Hai' });
    await expect(popover).toBeVisible();
    await popover.getByRole('button', { name: 'T2–T6' }).click();
    await popover.getByRole('button', { name: /Áp dụng/ }).click();

    await expect(page.getByTestId('schedule-day-FRIDAY')).toContainText('08:00');
    await page.getByRole('button', { name: 'Lưu thay đổi' }).click();

    await expect.poll(() => calls.some((c) => c.method === 'PUT' && c.path === '/doctors/me/schedule-config')).toBe(true);
    const putCall = calls.find((c) => c.method === 'PUT' && c.path === '/doctors/me/schedule-config');
    const body = putCall!.body as { slots: Array<{ dayOfWeek: string }>; slotDurationMinutes: number };
    expect(body.slots.some((s) => s.dayOfWeek === 'FRIDAY')).toBe(true);
    expect(body.slotDurationMinutes).toBe(30);
  });

  test('shows conflict warning modal on 409 and forces save when confirmed', async ({ page }) => {
    const calls: Array<{ method: string; path: string; body: unknown }> = [];
    let attempt = 0;

    await installMockApi(page, {
      role: 'DOCTOR',
      calls,
      overrides: {
        'PUT /doctors/me/schedule-config': {
          // Will be intercepted below via manual route to differentiate force=false vs force=true
          body: {},
        },
      },
    });

    await page.route('**/api/v1/doctors/me/schedule-config', async (route) => {
      if (route.request().method() !== 'PUT') return route.fallback();
      attempt += 1;
      const payload = route.request().postDataJSON() as { force?: boolean; slots?: unknown[] };
      calls.push({ method: 'PUT', path: '/doctors/me/schedule-config', body: payload });
      if (!payload.force) {
        return route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: {
              code: 'SCHEDULE_CONFLICT_WARNING',
              message: 'Thay đổi làm ảnh hưởng đến 1 lịch hẹn.',
              details: {
                conflictCount: 1,
                conflicts: [
                  {
                    appointmentId: 'ap-conflict-1',
                    appointmentCode: 'AP-20261130-001',
                    patientName: 'Nguyễn Thị Lan',
                    scheduledStart: '2026-11-30T09:00:00',
                    status: 'SCHEDULED',
                    reason: 'Ngày Thứ Hai được chuyển sang Nghỉ',
                  },
                ],
              },
            },
          }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { slotDurationMinutes: 30, bufferTimeMinutes: 5, weeklySlots: payload.slots || [], exceptions: [], warnings: [] },
        }),
      });
    });

    await page.goto('/doctor/schedule');
    await page.getByRole('radiogroup', { name: 'Thời gian nghỉ giữa ca' }).getByRole('radio', { name: '5′', exact: true }).click();
    await page.getByRole('button', { name: 'Lưu thay đổi' }).click();

    const modal = page.getByTestId('schedule-conflict-modal');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('Nguyễn Thị Lan');
    await expect(modal).toContainText('AP-20261130-001');

    await page.getByRole('button', { name: 'Vẫn lưu thay đổi' }).click();
    await expect(modal).toBeHidden();
    expect(attempt).toBe(2);
    const forceCall = calls.filter((c) => c.method === 'PUT' && c.path === '/doctors/me/schedule-config').at(-1);
    expect((forceCall!.body as { force?: boolean }).force).toBe(true);
  });

  test('can create a day-off exception and delete it in the Date Exceptions tab', async ({ page }) => {
    const calls: Array<{ method: string; path: string; body: unknown }> = [];
    await installMockApi(page, { role: 'DOCTOR', calls });
    await page.goto('/doctor/schedule');

    await page.getByRole('tab', { name: /Ngày nghỉ & Ngoại lệ/ }).click();
    await page.getByLabel('Ghi chú / Lý do (không bắt buộc)').fill('Nghỉ hội nghị y khoa');
    await page.getByRole('button', { name: 'Lưu ngày ngoại lệ' }).click();

    await expect(page.getByText('Nghỉ hội nghị y khoa')).toBeVisible();
    await expect(page.getByRole('button', { name: /^Xóa ngoại lệ ngày / })).toBeVisible();

    await page.getByRole('button', { name: /^Xóa ngoại lệ ngày / }).click();
    await expect.poll(() => calls.some((c) => c.method === 'DELETE' && c.path.startsWith('/doctors/me/schedules/exceptions/'))).toBe(true);
    await expect(page.getByText('Nghỉ hội nghị y khoa')).toHaveCount(0);
  });
});
