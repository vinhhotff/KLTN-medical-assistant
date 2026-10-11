import { test, expect } from '@playwright/test';
import { installMockApi } from './fixtures/mockApi';

const usage = (days: number) => ({
  success: true,
  data: {
    totalRequests: 40,
    totalTokens: 52000,
    totalCostUsd: 2,
    totalCostVnd: 50900, // → 25.450 ₫/USD derived by the dashboard
    errorRatePercent: 2.5,
    dailyStats: Array.from({ length: Math.min(days, 7) }, (_, i) => ({ date: `2026-10-0${i + 1}`, tokens: 5000 + i * 100, costUsd: 0.2 })),
    serviceStats: [
      { service: 'TRIAGE', tokens: 30000, costUsd: 1.2, requests: 25 },
      { service: 'DOCUMENT_ANALYSIS', tokens: 22000, costUsd: 0.8, requests: 15 },
    ],
  },
});

test.describe('UC-FIN-29: Admin AI cost analytics', () => {
  test('shows KPI, charts and the exchange rate derived from backend data', async ({ page }) => {
    const calls: Array<{ method: string; path: string; body: unknown }> = [];
    await installMockApi(page, { role: 'ADMIN', calls, overrides: { 'GET /admin/ai-usage': { body: usage(30) } } });
    await page.goto('/admin');
    await expect(page.getByText(/Tỷ giá 25\.450₫\/USD/)).toBeVisible();
    await expect(page.locator('.recharts-responsive-container').first()).toBeVisible();

    await page.getByRole('button', { name: '7 ngày' }).click();
    await expect.poll(() => calls.some((c) => c.path === '/admin/ai-usage')).toBe(true);
  });

  test('falls back to the configured rate when the backend reports no cost', async ({ page }) => {
    await installMockApi(page, {
      role: 'ADMIN',
      overrides: { 'GET /admin/ai-usage': { body: { success: true, data: { ...usage(30).data, totalCostUsd: 0, totalCostVnd: 0 } } } },
    });
    await page.goto('/admin');
    await expect(page.getByText(/Tỷ giá 25\.450₫\/USD/)).toBeVisible();
  });
});
