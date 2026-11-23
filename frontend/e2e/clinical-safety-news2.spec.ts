import { test, expect } from '@playwright/test';
import { installMockApi } from './fixtures/mockApi';

test.describe('Clinical Safety: Real-time NEWS-2 & DDI / Allergy Safety Engine', () => {
  test('calculates NEWS-2 score in real-time and transitions through risk levels', async ({ page }) => {
    await installMockApi(page, { role: 'DOCTOR' });
    await page.goto('/doctor');

    // Open encounter for APT-0002
    const card = page.locator('div.rounded-2xl', { hasText: 'APT-0002' }).filter({ has: page.getByRole('button', { name: /Bắt Đầu Khám/ }) }).last();
    await card.getByRole('button', { name: /Bắt Đầu Khám/ }).click();

    // Verify NEWS-2 initial state (Respiratory rate default 16 -> 0 points, other blank -> 0 points = Low Risk)
    const news2Badge = page.getByTestId('news2-badge');
    await expect(news2Badge).toBeVisible();
    await expect(news2Badge).toContainText('Nguy cơ thấp - Ổn định lâm sàng');

    // Test single score 3 trigger (e.g. SpO2 <= 91%) -> triggers Medium Risk with "Điểm đơn lẻ đạt 3"
    await page.locator('#vs-spo2').fill('90');
    await expect(news2Badge).toContainText('Nguy cơ trung bình - Cần theo dõi sát');
    await expect(page.getByText('Điểm đơn lẻ đạt 3')).toBeVisible();

    // Reset SpO2 to normal
    await page.locator('#vs-spo2').fill('98');
    await expect(news2Badge).toContainText('Nguy cơ thấp - Ổn định lâm sàng');

    // Test High Risk (>= 7 points)
    // SBP = 85 (3 points)
    // Heart Rate = 135 (3 points)
    // SpO2 = 93 (2 points)
    // Total = 8 points -> High Risk (Red)
    await page.locator('#vs-bp-sys').fill('85');
    await page.locator('#vs-bp-dia').fill('55');
    await page.locator('#vs-hr').fill('135');
    await page.locator('#vs-spo2').fill('93');

    await expect(news2Badge).toContainText('Nguy cơ cao - Cảnh báo suy sụp lâm sàng cấp tính');
    await expect(page.getByText('/ 20 điểm')).toBeVisible();

    // Test Respiratory rate custom input and range validation (8 - 40)
    await page.locator('#vs-rr').fill('50');
    await expect(page.locator('#vs-rr-error')).toContainText('8–40');
    await page.locator('#vs-rr').fill('18');
    await expect(page.locator('#vs-rr-error')).toBeHidden();
  });

  test('detects drug-drug interactions (DDI) and warns doctor with clinical explanation', async ({ page }) => {
    await installMockApi(page, { role: 'DOCTOR' });
    await page.goto('/doctor');

    const card = page.locator('div.rounded-2xl', { hasText: 'APT-0002' }).filter({ has: page.getByRole('button', { name: /Bắt Đầu Khám/ }) }).last();
    await card.getByRole('button', { name: /Bắt Đầu Khám/ }).click();

    // Add first drug: Warfarin
    await page.getByRole('button', { name: /Thêm Thuốc/ }).click();
    const drugInputs = page.locator('input[placeholder="Lipitor 20mg"]');
    await drugInputs.nth(0).fill('Warfarin 5mg');

    // Add second drug: Aspirin
    await page.getByRole('button', { name: /Thêm Thuốc/ }).click();
    await drugInputs.nth(1).fill('Aspirin 81mg');

    // Verify DDI alert banner appears
    const ddiBanner = page.getByTestId('ddi-alert-banner');
    await expect(ddiBanner).toBeVisible();
    await expect(ddiBanner).toContainText('CẢNH BÁO TƯƠNG TÁC THUỐC LÂM SÀNG (DRUG-DRUG INTERACTION - DDI)');
    await expect(ddiBanner).toContainText('Thuốc chống đông + Aspirin / NSAID');
    await expect(ddiBanner).toContainText('CRITICAL / NGUY CƠ CAO');
    await expect(ddiBanner).toContainText('xuất huyết tiêu hóa');
  });

  test('detects allergy conflict with Penicillin group when prescribing Augmentin', async ({ page }) => {
    await installMockApi(page, { role: 'DOCTOR' });
    await page.goto('/doctor');

    const card = page.locator('div.rounded-2xl', { hasText: 'APT-0002' }).filter({ has: page.getByRole('button', { name: /Bắt Đầu Khám/ }) }).last();
    await card.getByRole('button', { name: /Bắt Đầu Khám/ }).click();

    // Prescribe Augmentin (patient is allergic to Penicillin)
    await page.getByRole('button', { name: /Thêm Thuốc/ }).click();
    const drugInputs = page.locator('input[placeholder="Lipitor 20mg"]');
    await drugInputs.nth(0).fill('Augmentin 1g');

    // Verify allergy conflict banner appears
    const allergyBanner = page.getByTestId('allergy-alert-banner');
    await expect(allergyBanner).toBeVisible();
    await expect(allergyBanner).toContainText('CẢNH BÁO XUNG ĐỘT DỊ ỨNG THUỐC');
    await expect(allergyBanner).toContainText('Penicillin');
    await expect(allergyBanner).toContainText('Augmentin');
  });
});
