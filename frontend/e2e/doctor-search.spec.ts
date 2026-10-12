import { test, expect } from '@playwright/test';
import { installMockApi, DOCTORS, type MockOverride } from './fixtures/mockApi';

/**
 * Faithful copy of ClinicalQueryDefenseEngine output (clause-level NegEx, red-flag and OOD strings)
 * stamped onto every DoctorMatchDto by DoctorSemanticSearchService.
 */
const DEFENSE_BY_QUERY: Record<string, Record<string, unknown>> = {
  'ho sốt nhưng không khó thở': {
    affirmedSymptoms: ['ho sốt'], negatedSymptoms: ['không khó thở'], normalizedClinicalQuery: 'ho sốt',
  },
  'đau ngực dữ dội': {
    affirmedSymptoms: ['đau ngực dữ dội'], negatedSymptoms: [], normalizedClinicalQuery: 'đau ngực dữ dội',
    emergencyRedFlag: true,
    emergencyWarning: "Phát hiện triệu chứng cấp cứu nguy kịch: 'đau ngực dữ dội'. Vui lòng gọi ngay Cấp Cứu 115 hoặc di chuyển tới Bệnh viện gần nhất lập tức! Không nên chờ lịch khám phòng khám thông thường.",
  },
  'khám hết bao nhiêu tiền': {
    affirmedSymptoms: [], negatedSymptoms: ['khám hết bao nhiêu tiền'], normalizedClinicalQuery: 'khám hết bao nhiêu tiền',
    outOfDomain: true,
    outOfDomainGuidance: 'Câu hỏi liên quan đến chi phí / viện phí / BHYT. Vui lòng tham khảo bảng giá dịch vụ hoặc liên hệ Bộ phận Thu ngân.',
  },
};

const semanticSearch: MockOverride = {
  respond: (query) => {
    const meta = DEFENSE_BY_QUERY[query.get('query') || ''] ?? {};
    // DoctorMatchDto: doctorId instead of id; both doctors returned so the specialty filter can hide one
    return DOCTORS.map(({ id, ...d }, i) => ({ ...d, doctorId: id, similarityScore: 0.8 - i * 0.1, ...meta }));
  },
};

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

test.describe('Smart Defense Bar (clinical query defense)', () => {
  test.beforeEach(async ({ page }) => {
    await installMockApi(page, { role: 'PATIENT', overrides: { 'GET /triage/search/semantic': semanticSearch } });
    await page.goto('/patient/doctors');
  });

  test('NegEx: affirmed clause is a green badge, negated clause is struck through', async ({ page }) => {
    await page.getByRole('searchbox').fill('ho sốt nhưng không khó thở');
    const bar = page.getByTestId('clinical-defense-bar');
    await expect(bar.getByText('AI đã hiểu triệu chứng của bạn:')).toBeVisible();
    await expect(bar.getByText('ho sốt', { exact: true }).first()).toBeVisible(); // .first(): also in the collapsed <details>
    const negated = bar.getByText('không khó thở', { exact: true });
    await expect(negated).toBeVisible();
    await expect(negated).toHaveCSS('text-decoration-line', 'line-through');
    await expect(bar.getByLabel('Đã loại trừ: không khó thở')).toHaveAttribute('title', /NegEx/);
    await expect(page.getByRole('alert')).toHaveCount(0);
  });

  test('red-flag query shows an emergency alert with the emergency number, doctors still listed', async ({ page }) => {
    await page.getByRole('searchbox').fill('đau ngực dữ dội');
    const alert = page.getByRole('alert');
    await expect(alert).toContainText('cấp cứu');
    await expect(alert.getByRole('link', { name: /115/ })).toHaveAttribute('href', 'tel:115');
    await expect(page.getByText('BS. Nguyễn Văn Tâm')).toBeVisible();
  });

  test('out-of-domain query shows the backend guidance and no symptom badges', async ({ page }) => {
    await page.getByRole('searchbox').fill('khám hết bao nhiêu tiền');
    await expect(page.getByTestId('out-of-domain-banner')).toContainText('Bộ phận Thu ngân');
    await expect(page.getByText('AI đã hiểu triệu chứng của bạn:')).toHaveCount(0);
  });

  test('changing the specialty filter keeps the bar; short query removes it', async ({ page }) => {
    await page.getByRole('searchbox').fill('ho sốt nhưng không khó thở');
    const bar = page.getByTestId('clinical-defense-bar');
    await expect(bar).toBeVisible();
    await page.getByLabel('Lọc theo chuyên khoa').selectOption('Tiêu hóa');
    await expect(page.getByText('BS. Nguyễn Văn Tâm')).toHaveCount(0);
    await expect(bar.getByText('không khó thở', { exact: true })).toBeVisible();
    await page.getByRole('searchbox').fill('ho');
    await expect(bar).toHaveCount(0);
  });
});
