import { test, expect, Page } from '@playwright/test';
import path from 'node:path';

const API = 'http://127.0.0.1:8001';
const sample = (name: string) => path.resolve('../decision-supporter/contracts/examples', name);
const ready = (page: Page) => expect(page.getByRole('status')).toHaveText('서버 상태 조회 완료');
const entity = (page: Page, label: string) => page.getByRole('complementary', { name: '데이터 종류' }).getByRole('button', { name: new RegExp(`^${label}`) });

test('PostgreSQL registration approval and reload', async ({ page, request }) => {
  const jsErrors: string[] = [];
  page.on('pageerror', (error) => jsErrors.push(error.message));
  await page.goto('/');
  await ready(page);
  await entity(page, 'BOM').click();
  await expect(page.getByLabel('등록 파일 (CSV/XLSX)', { exact: true })).toBeDisabled();
  await entity(page, '제품').click();
  await page.getByLabel('데이터 출처', { exact: true }).selectOption('SYNTHETIC');
  await page.getByLabel('출처 설명', { exact: true }).fill('실제 PostgreSQL 브라우저 E2E 합성 입력');
  await page.getByLabel('등록 파일 (CSV/XLSX)', { exact: true }).setInputFiles({
    name: 'invalid_product.csv', mimeType: 'text/csv', buffer: Buffer.from('제품코드,제품명,단위\nBAD01,오류 예시,NO_UNIT\n'),
  });
  await ready(page);
  await expect(page.getByRole('button', { name: '검증 결과 승인', exact: true })).toBeDisabled();
  expect((await (await request.get(`${API}/products`)).json()).total).toBe(0);
  await page.getByLabel('반려 사유', { exact: true }).fill('잘못된 단위: 원본 수정 후 재등록');
  await page.getByRole('button', { name: '반려', exact: true }).click();
  await ready(page);
  await expect(page.getByRole('region', { name: '제품 배치' })).toContainText('반려됨');

  const cases = [
    ['제품', path.resolve('.e2e/products.xlsx'), 'product', '/products'],
    ['자재', sample('sample_materials.csv'), 'material', '/materials'],
    ['BOM', sample('sample_bom.csv'), 'bom', '/boms'],
    ['재고', sample('sample_inventory.csv'), 'inventory', '/inventory'],
    ['월별 수요', sample('sample_demand_hold.csv'), 'monthly_demand', '/demand/monthly'],
  ];
  for (const [label, file, kind, listPath] of cases) {
    await entity(page, label).click();
    await page.getByLabel('데이터 출처', { exact: true }).selectOption('SYNTHETIC');
    await page.getByLabel('출처 설명', { exact: true }).fill('실제 PostgreSQL 브라우저 E2E 합성 입력');
    const created = page.waitForResponse((r) => r.url() === `${API}/batches` && r.request().method() === 'POST');
    await page.getByLabel('등록 파일 (CSV/XLSX)', { exact: true }).setInputFiles(file);
    const uploaded = await created;
    expect(uploaded.status()).toBe(201);
    let batch = await uploaded.json();
    await ready(page);
    expect((await (await request.get(`${API}${listPath}`)).json()).total).toBe(0);
    if (kind === 'monthly_demand') {
      expect(batch.status).toBe('MAPPING_HOLD');
      await page.getByLabel('demand_qty 매핑 열', { exact: true }).fill('주문수량');
      // 다른 사용자가 먼저 변경한 실제 version 충돌.
      const external = await request.post(`${API}/batches/${batch.batch_id}/revalidate`, {
        data: { expected_version: batch.version, column_overrides: { demand_qty: '주문수량' } },
      });
      expect(external.status()).toBe(200);
      await page.getByRole('button', { name: '서버 재검증', exact: true }).click();
      await ready(page);
      await expect(page.getByRole('alert')).toContainText('VERSION_CONFLICT');
      await page.getByRole('button', { name: '서버 재검증', exact: true }).click();
      await ready(page);
      batch = await (await request.get(`${API}/batches/${batch.batch_id}`)).json();
      // UI가 본 digest 이후 다른 사용자가 설정을 변경한 실제 결과 충돌.
      const changed = await request.post(`${API}/batches/${batch.batch_id}/revalidate`, {
        data: { expected_version: batch.version, column_overrides: batch.settings.column_overrides, default_unit: 'EA' },
      });
      expect(changed.status()).toBe(200);
      expect((await changed.json()).result_digest).not.toBe(batch.result_digest);
      await page.getByRole('button', { name: '검증 결과 승인', exact: true }).click();
      await ready(page);
      await expect(page.getByRole('alert')).toContainText('RESULT_CHANGED');
      expect((await (await request.get(`${API}/batches/${batch.batch_id}`)).json()).status).toBe('READY_FOR_APPROVAL');
    }
    const current = await (await request.get(`${API}/batches/${batch.batch_id}`)).json();
    const approving = page.waitForRequest((r) => r.url() === `${API}/batches/${batch.batch_id}/approve`);
    await page.getByRole('button', { name: '검증 결과 승인', exact: true }).click();
    expect((await approving).postDataJSON().expected_result_digest).toBe(current.result_digest);
    await ready(page);
    await expect(page.getByRole('region', { name: `${label} 배치` })).toContainText('승인 완료');
    expect((await (await request.get(`${API}${listPath}`)).json()).total).toBeGreaterThan(0);
    await page.reload();
    await ready(page);
    await entity(page, label).click();
    await expect(page.getByRole('region', { name: `${label} 배치` })).toContainText('승인 완료');
  }
  await expect(page.getByRole('button', { name: '승인 수요 예측', exact: true })).toBeEnabled();
  expect(jsErrors).toEqual([]);
});

test('approved demand forecast stores partial insufficient invalid and reloads', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/'); await ready(page);
  for (const [label, file] of [['제품', 'forecast-products.csv'], ['월별 수요', 'forecast-demand.csv']]) {
    await entity(page, label).click();
    await page.getByLabel('데이터 출처', { exact: true }).selectOption('SYNTHETIC');
    await page.getByLabel('출처 설명', { exact: true }).fill('forecast browser integration synthetic');
    const creating = page.waitForResponse((r) => r.url() === `${API}/batches` && r.request().method() === 'POST');
    await page.getByLabel('등록 파일 (CSV/XLSX)', { exact: true }).setInputFiles(path.resolve('.e2e', file));
    expect((await creating).status()).toBe(201);
    await ready(page);
    await page.getByRole('button', { name: '검증 결과 승인', exact: true }).click();
    await ready(page);
    await expect(page.getByRole('region', { name: `${label} 배치` })).toContainText('승인 완료');
  }
  await page.getByRole('button', { name: '승인 수요 예측', exact: true }).click();
  await expect(page.getByRole('heading', { name: '승인 수요 예측', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '예측 실행', exact: true })).toBeEnabled();
  await page.getByLabel('학습 기준일 (월말)', { exact: true }).fill('2016-12-31');
  async function execute() {
    const pending = page.waitForResponse((r) => r.url() === `${API}/forecasts` && r.request().method() === 'POST');
    await page.getByRole('button', { name: '예측 실행', exact: true }).click();
    const response = await pending;
    const body = await response.json();
    await expect(page.getByLabel('저장된 실행', { exact: true })).toHaveValue(body.execution.execution_id);
    await expect(page.getByRole('button', { name: '예측 실행', exact: true })).toBeEnabled();
    return { response, body };
  }
  const first = await execute();
  expect(first.response.status()).toBe(201);
  expect(first.body.execution.status).toBe('PARTIAL');
  expect(first.body.execution.input_digest).toBe(first.body.execution.result.run.input_digest);
  await expect(page.getByRole('region', { name: '저장된 예측 결과' })).toContainText('INSUFFICIENT_HISTORY');
  await expect(page.getByRole('table').getByRole('row')).toHaveCount(10);
  const duplicate = await execute();
  expect(duplicate.response.status()).toBe(200);
  expect(duplicate.body.reused).toBe(true);
  expect(duplicate.body.execution.execution_id).toBe(first.body.execution.execution_id);
  await expect(page.getByText('동일 입력의 저장된 실행 결과를 재사용했습니다.')).toBeVisible();
  await page.getByLabel('예측 기간 (개월)', { exact: true }).selectOption('6');
  const longer = await execute();
  expect(longer.body.execution.status).toBe('PARTIAL');
  await expect(page.getByRole('region', { name: '저장된 예측 결과' })).toContainText('HORIZON_BEYOND_VALIDATED');
  await page.getByLabel('최소 이력 (개월)', { exact: true }).fill('120');
  const insufficient = await execute();
  expect(insufficient.body.execution.status).toBe('DATA_INSUFFICIENT');
  await expect(page.getByRole('table')).toHaveCount(0);
  await expect(page.getByRole('region', { name: '저장된 예측 결과' })).toContainText('생성된 예측으로 간주할 수 없습니다');
  await page.getByLabel('학습 기준일 (월말)', { exact: true }).fill('2016-12-15');
  const invalid = await execute();
  expect(invalid.response.status()).toBe(422);
  expect(invalid.body.execution.result.run).toBeNull();
  await expect(page.getByRole('region', { name: '저장된 예측 결과' })).toContainText('TRAINED_UNTIL_NOT_MONTH_END');
  await page.getByLabel('저장된 실행', { exact: true }).selectOption(first.body.execution.execution_id);
  await expect(page.getByRole('table').getByRole('row')).toHaveCount(10);
  await page.reload();
  await expect(page.getByLabel('저장된 실행', { exact: true })).toHaveValue(first.body.execution.execution_id);
  await expect(page.getByRole('table').getByRole('row')).toHaveCount(10);
  await page.screenshot({ path: '.e2e/approved-demand-forecast.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('forecast network failure never shows fixture output', async ({ page }) => {
  await page.route(/\/forecasts(?:\?|$)/, (route) => route.abort('connectionfailed'));
  await page.goto('/#forecast');
  await expect(page.getByRole('alert')).toContainText('NETWORK_ERROR');
  await expect(page.getByRole('region', { name: '저장된 예측 결과' })).toHaveCount(0);
  await expect(page.getByRole('table')).toHaveCount(0);
});

for (const [status, code] of [[501, 'PERSISTENCE_DISABLED'], [503, 'DB_UNAVAILABLE']] as const) {
  test(`server ${status} never falls back to fixtures`, async ({ page }) => {
    await page.route(/\/batches\?/, (route) => route.fulfill({ status, json: { detail: { code, message: '검증용 서버 오류' } } }));
    await page.goto('/');
    await expect(page.getByRole('alert')).toContainText(code);
    await expect(page.getByLabel('등록 파일 (CSV/XLSX)', { exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: '승인 수요 예측', exact: true })).toBeDisabled();
    await expect(page.getByText('승인 완료')).toHaveCount(0);
  });
}

test('network error never falls back to fixtures', async ({ page }) => {
  await page.route(/\/batches\?/, (route) => route.abort('connectionfailed'));
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('NETWORK_ERROR');
  await expect(page.getByLabel('등록 파일 (CSV/XLSX)', { exact: true })).toBeDisabled();
});

test('422 upload keeps previous server state', async ({ page }) => {
  await page.goto('/'); await ready(page);
  const id = await page.getByLabel('배치 이력', { exact: true }).inputValue();
  await page.route(`${API}/batches`, (route) => route.fulfill({ status: 422, json: { detail: { code: 'REQUEST_INVALID', message: '검증용 입력 오류' } } }));
  await page.getByLabel('등록 파일 (CSV/XLSX)', { exact: true }).setInputFiles(sample('sample_products.csv'));
  await ready(page);
  await expect(page.getByRole('alert')).toContainText('REQUEST_INVALID');
  await expect(page.getByLabel('배치 이력', { exact: true })).toHaveValue(id);
});

test('restores after API process restart', async ({ page, request }) => {
  await page.goto('/'); await ready(page);
  for (const label of ['제품', '자재', 'BOM', '재고', '월별 수요']) {
    await entity(page, label).click();
    await expect(page.getByRole('region', { name: `${label} 배치` })).toContainText('승인 완료');
  }
  await expect(page.getByRole('button', { name: '승인 수요 예측', exact: true })).toBeEnabled();
  await page.screenshot({ path: '.e2e/registration-approval.png', fullPage: true });
  const executions = (await (await request.get(`${API}/forecasts`)).json()).items;
  const stored = executions.find((item: { status: string; parameters: { horizon_months: number } }) => item.status === 'PARTIAL' && item.parameters.horizon_months === 3);
  expect(stored).toBeTruthy();
  await page.goto('/#forecast');
  await expect(page.getByLabel('저장된 실행', { exact: true })).toBeEnabled();
  await page.getByLabel('저장된 실행', { exact: true }).selectOption(stored.execution_id);
  await expect(page.getByRole('table').getByRole('row')).toHaveCount(10);
});
