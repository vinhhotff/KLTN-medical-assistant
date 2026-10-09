import { test, expect } from '@playwright/test';

test.describe('UC-CLIN-02: Multi-turn Chatbot Symptom Triage & Red-Flag Guard', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate directly to symptom triage page
    await page.goto('/triage');
  });

  test('should render conversational chatbot interface with initial welcome greeting', async ({ page }) => {
    // Verify chatbot header and medical disclaimer
    await expect(page.locator('text=Trợ Lý Phân Luồng Y Tế AI')).toBeVisible();
    await expect(page.locator('text=Bác sĩ AI MediAssist')).toBeVisible();

    // Verify initial greeting message exists
    await expect(page.locator('text=Xin chào! Tôi là Trợ lý phân luồng y tế')).toBeVisible();
  });

  test('should display interactive clinical suggestion chips for quick input', async ({ page }) => {
    // Check that clinical chips are rendered
    const chipsContainer = page.locator('button:has-text("Đau đầu"), button:has-text("Sốt"), button:has-text("Đau dạ dày")');
    await expect(chipsContainer.first()).toBeVisible();

    // Clicking a chip should populate or trigger conversation
    const firstChip = chipsContainer.first();
    const chipText = await firstChip.innerText();
    await firstChip.click();

    // The chip text should appear as a user message in the chat
    await expect(page.locator(`.bg-blue-600:has-text("${chipText}")`)).toBeVisible();
  });

  test('should trigger emergency Red-Flag Lockout and hotline 115 on critical symptoms', async ({ page }) => {
    const chatInput = page.locator('input[placeholder*="Mô tả triệu chứng"]');
    await chatInput.fill('Tôi bị đau thắt ngực dữ dội, khó thở vã mồ hôi và choáng váng');
    await page.keyboard.press('Enter');

    // System must display emergency alert card and disable further standard chat
    await expect(page.locator('text=CẢNH BÁO NGUY CẤP').or(page.locator('text=CẤP CỨU KHẨN CẤP'))).toBeVisible({ timeout: 10000 });
    await expect(page.locator('a[href*="tel:115"]').or(page.locator('text=115'))).toBeVisible();
  });
});
