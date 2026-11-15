import { expect, test, type Page } from '@playwright/test';
import { createDefaultData, type AppData } from '../src/model';

const browserName = process.env.NATIVE_TEST_BROWSER === 'webkit' ? 'webkit' : 'chromium';
test.setTimeout(45_000);
test.use({
  browserName,
  ...(browserName === 'chromium' && process.env.NATIVE_TEST_CHANNEL ? { channel: process.env.NATIVE_TEST_CHANNEL } : {}),
  viewport: { width: 430, height: 932 },
  hasTouch: true,
  isMobile: true,
});

async function openTransactions(page: Page, data: AppData) {
  await page.addInitScript(seed => {
    localStorage.setItem('demo-logged', 'true');
    localStorage.setItem('harvest-finance-demo:v1', JSON.stringify(seed));
  }, data);
  await page.goto('/native.html');
  await page.getByRole('navigation', { name: '主导航' }).getByRole('button', { name: '我的', exact: true }).click();
  await page.getByRole('button', { name: '交易查询', exact: true }).click();
  await expect(page.locator('.native-app.page-transactions')).toBeVisible();
}

async function addManagedTransaction(page: Page) {
  await page.getByRole('button', { name: '更多查询 ›', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: '新增交易', exact: true }).click();
  return page.getByRole('dialog');
}

test('an already saved November transaction in legacy JSON opens in its month', async ({ page }) => {
  const data = createDefaultData();
  for (const transaction of data.transactions) delete transaction.accountId;
  data.transactions.push({ ...data.transactions[0], id: 'legacy-november', title: '转出', date: '2026-11-21 09:25:00', amount: -125 });
  await openTransactions(page, data);
  await expect(page.getByLabel('选择时间')).toHaveValue('2026-11');
  await expect(page.locator('.transaction-row')).toHaveCount(1);
  await expect(page.locator('.transaction-row').first()).toContainText('2026-11-21 09:25:00');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('harvest-finance-demo:v1')!).transactions.length)).toBe(3);
});

test('management additions inherit the selected account and reveal their saved month', async ({ page }) => {
  const data = createDefaultData();
  await openTransactions(page, data);
  await page.getByLabel('选择账户').selectOption('account-2');
  await page.getByLabel('选择时间').selectOption('2026-10');
  const editor = await addManagedTransaction(page);
  await expect(editor.getByLabel('所属账户')).toHaveValue('account-2');
  await editor.getByLabel('摘要类型').fill('新增转出回归');
  await editor.getByLabel('交易金额（收入为正，支出为负）').fill('-125');
  await editor.getByLabel('交易后余额（元）').fill('500');
  await editor.getByLabel('交易时间（YYYY-MM-DD HH:mm:ss）').fill('2026-11-21 09:25:00');
  await editor.getByRole('button', { name: '保存修改', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByLabel('选择账户')).toHaveValue('account-2');
  await expect(page.getByLabel('选择时间')).toHaveValue('2026-11');
  await expect(page.locator('.transaction-row').first()).toContainText('新增转出回归');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('harvest-finance-demo:v1')!).transactions.find((transaction: { title: string }) => transaction.title === '新增转出回归'));
  expect(saved.accountId).toBe('account-2');
  expect(saved.amount).toBe(-125);
  expect(saved.account).toBe('62848****1877');
  await page.getByLabel('选择账户').selectOption('account-1');
  await expect(page.locator('.transaction-row').filter({ hasText: '新增转出回归' })).toHaveCount(0);
  await page.getByLabel('选择账户').selectOption('account-2');
  await expect(page.locator('.transaction-row').first()).toContainText('新增转出回归');
});

test('editing a transaction can change its owner and month without changing its identity', async ({ page }) => {
  const data = createDefaultData();
  data.transactions = [{ ...data.transactions[0], id: 'move-me', title: '转出归属回归', date: '2026-11-21 12:00:00' }];
  await openTransactions(page, data);
  const row = page.locator('.transaction-row').first();
  await row.focus();
  await row.press('F2');
  const editor = page.getByRole('dialog');
  await editor.getByLabel('所属账户').selectOption('account-2');
  await editor.getByLabel('交易时间（YYYY-MM-DD HH:mm:ss）').fill('2026-12-03 13:20:00');
  await editor.getByRole('button', { name: '保存修改', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByLabel('选择账户')).toHaveValue('account-2');
  await expect(page.getByLabel('选择时间')).toHaveValue('2026-12');
  await expect(page.locator('.transaction-row')).toHaveCount(1);
  await expect(page.locator('.transaction-row')).toContainText('2026-12-03 13:20:00');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('harvest-finance-demo:v1')!).transactions);
  expect(saved).toHaveLength(1);
  expect(saved[0].id).toBe('move-me');
  expect(saved[0].accountId).toBe('account-2');
});

test('orphan transactions can be found and reassigned to an existing account', async ({ page }) => {
  const data = createDefaultData();
  data.transactions = [{ ...data.transactions[0], id: 'orphan-row', title: '原账户已删除的记录', accountId: 'deleted-account', date: '2026-11-21 12:00:00' }];
  await openTransactions(page, data);
  await page.getByLabel('选择账户').selectOption('');
  await expect(page.locator('.transaction-row')).toContainText('原账户已删除的记录');
  await page.locator('.transaction-row').focus();
  await page.locator('.transaction-row').press('F2');
  const editor = page.getByRole('dialog');
  await expect(editor.getByLabel('所属账户')).toHaveValue('deleted-account');
  await editor.getByLabel('所属账户').selectOption('account-2');
  await editor.getByRole('button', { name: '保存修改', exact: true }).click();
  await expect(page.getByLabel('选择账户')).toHaveValue('account-2');
  await expect(page.getByLabel('选择时间')).toHaveValue('2026-11');
  await expect(page.locator('.transaction-row')).toContainText('原账户已删除的记录');
});

test('adding transactions without accounts explains the prerequisite and preserves stored rows', async ({ page }) => {
  const data = createDefaultData();
  data.accounts = [];
  await openTransactions(page, data);
  const editor = await addManagedTransaction(page);
  await expect(editor.getByLabel('所属账户')).toBeDisabled();
  await expect(editor.getByText('请先在数据管理中新增账户，再添加交易。', { exact: true })).toBeVisible();
  await expect(editor.getByRole('button', { name: '保存修改', exact: true })).toBeDisabled();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('harvest-finance-demo:v1')!).transactions.length)).toBe(data.transactions.length);
});
