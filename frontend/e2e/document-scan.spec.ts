import { test, expect, type Page } from '@playwright/test';
import { installMockApi } from './fixtures/mockApi';

const QUOTA_OK = { success: true, data: { scanQuota: 3, subscriptionTier: 'BASIC', vipValidUntil: null, vip: false, hasQuota: true } };
const QUOTA_EMPTY = { success: true, data: { scanQuota: 0, subscriptionTier: 'FREE', vipValidUntil: null, vip: false, hasQuota: false } };

const pdf = (name: string, size = 2048) => ({
  name,
  mimeType: 'application/pdf',
  buffer: Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(size, 0x20)]),
});

async function pick(page: Page, files: Array<{ name: string; mimeType: string; buffer: Buffer }>) {
  await page.locator('#multi-file-upload-input').setInputFiles(files);
}

test.describe('Document scanner', () => {
  test('quota loading shows a placeholder instead of a fake "1"', async ({ page }) => {
    await installMockApi(page, { role: 'PATIENT', overrides: { 'GET /documents/quota': { delay: 1500, body: QUOTA_OK } } });
    await page.goto('/patient/documents');
    await expect(page.getByTestId('quota-badge')).not.toContainText('1');
    await expect(page.getByTestId('quota-badge')).toContainText('3', { timeout: 5000 });
  });

  test('no quota: analyse button replaced by "Hết lượt quét" + pricing, presets disabled', async ({ page }) => {
    await installMockApi(page, { role: 'PATIENT', overrides: { 'GET /documents/quota': { body: QUOTA_EMPTY } } });
    await page.goto('/patient/documents');
    await pick(page, [pdf('ket-qua.pdf')]);
    await expect(page.getByTestId('quota-exhausted')).toBeVisible();
    await expect(page.getByRole('button', { name: /Phân Tích 1 Tệp/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Phiếu Xét Nghiệm Máu/ })).toBeDisabled();

    await page.getByRole('button', { name: 'Xem bảng giá' }).click();
    // Package copy must match PaymentService: BASIC_5 = +5 scans, VIP_MONTHLY = 30 days, VIP_ENTERPRISE = 90 days
    await expect(page.getByTestId('package-BASIC_5')).toContainText('+5 lượt quét');
    await expect(page.getByTestId('package-VIP_MONTHLY')).toContainText('30 ngày');
    await expect(page.getByTestId('package-VIP_ENTERPRISE')).toContainText('90 ngày');
  });

  test('rejects wrong MIME type and empty files before upload', async ({ page }) => {
    await installMockApi(page, { role: 'PATIENT', overrides: { 'GET /documents/quota': { body: QUOTA_OK } } });
    await page.goto('/patient/documents');

    await pick(page, [{ name: 'fake.pdf', mimeType: 'application/x-msdownload', buffer: Buffer.alloc(4096, 1) }]);
    await expect(page.getByTestId('scan-error')).toContainText('không đúng định dạng');
    await expect(page.getByTestId('scan-error').getByRole('button')).toHaveCount(0);

    await pick(page, [{ name: 'empty.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(10) }]);
    await expect(page.getByTestId('scan-error')).toContainText('rỗng hoặc bị hỏng');
  });

  test('queue and presets are frozen while analysing; double click sends one request', async ({ page }) => {
    const calls: Array<{ method: string; path: string; body: unknown }> = [];
    await installMockApi(page, {
      role: 'PATIENT',
      calls,
      overrides: {
        'GET /documents/quota': { body: QUOTA_OK },
        'POST /documents/analyze': { delay: 2500, status: 500 },
      },
    });
    await page.goto('/patient/documents');
    await pick(page, [pdf('ket-qua.pdf')]);
    const analyse = page.getByRole('button', { name: /Phân Tích 1 Tệp/ });
    await analyse.dblclick();
    await expect(page.getByRole('button', { name: /Đang phân tích/ })).toBeDisabled();
    await expect(page.locator('#multi-file-upload-input')).toBeDisabled();
    await expect(page.getByRole('button', { name: /Phiếu Xét Nghiệm Máu/ })).toBeDisabled();
    await expect(page.getByRole('button', { name: /Xóa tệp ket-qua.pdf/ })).toBeDisabled();

    // 5xx → retry offered, no "buy package" upsell
    const err = page.getByTestId('scan-error');
    await expect(err).toHaveAttribute('data-kind', 'retryable', { timeout: 6000 });
    await expect(err.getByRole('button', { name: /Thử lại/ })).toBeVisible();
    await expect(err.getByRole('button', { name: /Gói quét/ })).toHaveCount(0);
    expect(calls.filter((c) => c.path === '/documents/analyze')).toHaveLength(1);
  });

  test('402 quota error offers packages but not retry', async ({ page }) => {
    await installMockApi(page, {
      role: 'PATIENT',
      overrides: {
        'GET /documents/quota': { body: QUOTA_OK },
        'POST /documents/analyze': { status: 402, body: { success: false, error: { code: 'QUOTA_EXCEEDED', message: 'Bạn đã hết lượt quét.' } } },
      },
    });
    await page.goto('/patient/documents');
    await pick(page, [pdf('ket-qua.pdf')]);
    await page.getByRole('button', { name: /Phân Tích 1 Tệp/ }).click();
    const err = page.getByTestId('scan-error');
    await expect(err).toHaveAttribute('data-kind', 'quota');
    await expect(err.getByRole('button', { name: /Thử lại/ })).toHaveCount(0);
  });

  test('payment verification failure is shown instead of silently closing', async ({ page }) => {
    await installMockApi(page, {
      role: 'PATIENT',
      overrides: {
        'GET /documents/quota': { body: QUOTA_EMPTY },
        'POST /payments/checkout': { body: { success: true, data: { transactionCode: 'TX-1', gatewayReference: 'g-1' } } },
        'POST /payments/verify': { body: { success: false, data: null, message: 'Giao dịch chưa được xác nhận.' } },
      },
    });
    await page.goto('/patient/documents');
    await page.getByRole('button', { name: '+ Mua thêm' }).click();
    await page.getByTestId('package-BASIC_5').getByRole('button').click();
    await page.getByRole('button', { name: /VietQR/ }).click();
    await expect(page.getByTestId('sandbox-warning')).toBeVisible();
    await page.getByRole('button', { name: /Mô phỏng thanh toán thành công/ }).click();
    await expect(page.getByText('Giao dịch chưa được xác nhận.')).toBeVisible();
  });
});

test.describe('Package prices come from the backend (review P0-4)', () => {
  test('prices from GET /payments/packages replace the fallback table', async ({ page }) => {
    await installMockApi(page, { role: 'PATIENT', overrides: { 'GET /documents/quota': { body: QUOTA_EMPTY } } });
    await page.goto('/patient/documents');
    await page.getByRole('button', { name: '+ Mua thêm' }).click();
    // API: VIP_MONTHLY 149.000 / VIP_ENTERPRISE 399.000 (fallback has 99.000 / 149.000)
    await expect(page.getByTestId('package-VIP_MONTHLY')).toContainText('149.000₫');
    await expect(page.getByTestId('package-VIP_ENTERPRISE')).toContainText('399.000₫');
    await expect(page.getByTestId('package-VIP_MONTHLY')).not.toContainText('99.000₫');
    await expect(page.getByTestId('price-fallback-note')).toHaveCount(0);
  });

  test('API error → fallback prices with a "reference price" note', async ({ page }) => {
    await installMockApi(page, {
      role: 'PATIENT',
      overrides: { 'GET /documents/quota': { body: QUOTA_EMPTY }, 'GET /payments/packages': { status: 500 } },
    });
    await page.goto('/patient/documents');
    await page.getByRole('button', { name: '+ Mua thêm' }).click();
    await expect(page.getByTestId('price-fallback-note')).toContainText('Giá tham khảo');
    await expect(page.getByTestId('package-VIP_MONTHLY')).toContainText('99.000₫');
    await expect(page.getByTestId('package-BASIC_5')).toContainText('29.000₫');
  });

  test('checkout amount differs → total updated and user must confirm before verify', async ({ page }) => {
    const calls: Array<{ method: string; path: string; body: unknown }> = [];
    await installMockApi(page, {
      role: 'PATIENT',
      calls,
      overrides: {
        'GET /documents/quota': { body: QUOTA_EMPTY },
        // Real backend today: list says 149.000 but PaymentService charges 99.000 for VIP_MONTHLY
        'POST /payments/checkout': {
          body: { success: true, data: { transactionCode: 'TX-2', gatewayReference: 'g-2', amount: 99000.0, currency: 'VND', status: 'PENDING' } },
        },
        'POST /payments/verify': { body: { success: true, data: { transactionCode: 'TX-2', status: 'SUCCESS' } } },
      },
    });
    await page.goto('/patient/documents');
    await page.getByRole('button', { name: '+ Mua thêm' }).click();
    await page.getByTestId('package-VIP_MONTHLY').getByRole('button').click();
    await expect(page.getByTestId('checkout-total')).toHaveText('149.000₫');
    await page.getByRole('button', { name: /VietQR/ }).click();
    await page.getByRole('button', { name: /Mô phỏng thanh toán thành công/ }).click();

    await expect(page.getByTestId('amount-changed')).toContainText('99.000₫');
    await expect(page.getByTestId('checkout-total')).toHaveText('99.000₫');
    expect(calls.filter((c) => c.path === '/payments/verify')).toHaveLength(0);

    await page.getByRole('button', { name: 'Xác nhận thanh toán 99.000₫' }).click();
    await expect(page.getByText(/Thanh toán thành công/)).toBeVisible();
    expect(calls.filter((c) => c.path === '/payments/checkout')).toHaveLength(1);
    expect(calls.filter((c) => c.path === '/payments/verify')).toHaveLength(1);
  });

  test('held transaction locks the payment method until "Hủy bỏ"', async ({ page }) => {
    const calls: Array<{ method: string; path: string; body: unknown }> = [];
    await installMockApi(page, {
      role: 'PATIENT',
      calls,
      overrides: {
        'GET /documents/quota': { body: QUOTA_EMPTY },
        'POST /payments/checkout': {
          body: { success: true, data: { transactionCode: 'TX-3', gatewayReference: 'g-3', amount: 99000.0, currency: 'VND', status: 'PENDING' } },
        },
      },
    });
    await page.goto('/patient/documents');
    await page.getByRole('button', { name: '+ Mua thêm' }).click();
    await page.getByTestId('package-VIP_MONTHLY').getByRole('button').click();
    await page.getByRole('button', { name: /VietQR/ }).click();
    await page.getByRole('button', { name: /Mô phỏng thanh toán thành công/ }).click();
    await expect(page.getByTestId('amount-changed')).toBeVisible();

    // The held TX-3 was created for VietQR: switching method must not silently reuse or drop it
    for (const name of [/Stripe Sandbox/, /VietQR/, /VNPAY QR/, /Ví MoMo/]) {
      await expect(page.getByRole('button', { name })).toBeDisabled();
    }
    await expect(page.getByTestId('method-locked-hint')).toHaveText('Bấm Hủy bỏ để đổi phương thức.');

    await page.getByRole('button', { name: 'Hủy bỏ' }).click();
    await expect(page.getByTestId('amount-changed')).toHaveCount(0);
    await page.getByTestId('package-VIP_MONTHLY').getByRole('button').click();
    await expect(page.getByTestId('method-locked-hint')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /VNPAY QR/ })).toBeEnabled();
    await page.getByRole('button', { name: /VNPAY QR/ }).click();
    await expect(page.getByRole('button', { name: /Mô phỏng thanh toán thành công/ })).toBeVisible();
    expect(calls.filter((c) => c.path === '/payments/verify')).toHaveLength(0);
  });
});
