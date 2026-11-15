import { expect, test, type Locator, type Page } from '@playwright/test';

// Exercise the packaged full-screen entry, rather than the separate phone-frame preview.
// NATIVE_TEST_BROWSER=webkit runs this same suite with WebKit on the macOS builder.
const browserName = process.env.NATIVE_TEST_BROWSER === 'webkit' ? 'webkit' : 'chromium';
test.setTimeout(45_000);
test.use({
  browserName,
  ...(browserName === 'chromium' && process.env.NATIVE_TEST_CHANNEL ? { channel: process.env.NATIVE_TEST_CHANNEL } : {}),
  viewport: { width: 430, height: 932 },
  hasTouch: true,
  isMobile: true,
});

const topInset = 59;
const bottomInset = 34;

test.beforeEach(async ({ page }) => {
  // Each test has a fresh browser context and intentionally uses disposable local data.
  await page.addInitScript(() => localStorage.setItem('demo-logged', 'true'));
  await page.goto('/native.html');
  await expect(page.locator('.native-app')).toBeVisible();
  await page.locator('.native-app').evaluate((element, insets) => {
    (element as HTMLElement).style.setProperty('--native-safe-top', `${insets.top}px`);
    (element as HTMLElement).style.setProperty('--native-safe-bottom', `${insets.bottom}px`);
  }, { top: topInset, bottom: bottomInset });
});

async function expectUnobscured(locator: Locator) {
  await expect(locator).toBeVisible();
  expect(await locator.evaluate(element => {
    const box = element.getBoundingClientRect();
    const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
    return hit !== null && (element.contains(hit) || hit.contains(element));
  })).toBe(true);
}

async function expectNavigation(page: Page) {
  const nav = page.getByRole('navigation', { name: '主导航' });
  for (const label of ['首页', '金服', '贷款', '生活', '我的']) {
    const button = nav.getByRole('button', { name: label, exact: true });
    const caption = button.locator('span');
    await expect(caption).toHaveText(label);
    const box = await caption.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThan(10);
    expect(box!.y).toBeGreaterThan(topInset);
    expect(box!.y + box!.height).toBeLessThanOrEqual(932 - bottomInset + 1);
    await expectUnobscured(caption);
  }
  const scroll = await page.locator('.native-scroll').boundingBox();
  const tabs = await nav.boundingBox();
  expect(scroll).not.toBeNull();
  expect(tabs).not.toBeNull();
  expect(scroll!.y).toBeGreaterThanOrEqual(topInset);
  expect(scroll!.y + scroll!.height).toBeLessThanOrEqual(tabs!.y + 1);
}

type Contact = { id: number; x: number; y: number };

async function center(locator: Locator): Promise<Contact> {
  const box = await locator.boundingBox();
  if (!box) throw new Error('Touch target is missing');
  return { id: 1, x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

// Synthetic touch events cover the application's hold/cancel state machine on both
// engines. They do not simulate the operating system's native pan recognizer.
async function touch(locator: Locator, type: string, contacts: Contact[], changed = contacts) {
  await locator.evaluate((element, input) => {
    const points = (items: Contact[]) => items.map(item => ({
      identifier: item.id, clientX: item.x, clientY: item.y, pageX: item.x,
      pageY: item.y, screenX: item.x, screenY: item.y, target: element,
    }));
    const event = new Event(input.type, { bubbles: true, cancelable: true });
    Object.defineProperties(event, {
      touches: { value: points(input.contacts) },
      targetTouches: { value: points(input.contacts) },
      changedTouches: { value: points(input.changed) },
    });
    element.dispatchEvent(event);
  }, { type, contacts, changed });
}

async function loanSummary(page: Page) {
  await page.getByRole('navigation', { name: '主导航' }).getByRole('button', { name: '贷款', exact: true }).click();
  return page.locator('.loan-summary .available');
}

test('home, loans and profile scroll both ways while all five tab captions remain visible', async ({ page }) => {
  for (const label of ['首页', '贷款', '我的']) {
    await page.getByRole('navigation', { name: '主导航' }).getByRole('button', { name: label, exact: true }).click();
    await expectNavigation(page);
    const scroll = page.locator('.native-scroll');
    expect(await scroll.evaluate(element => element.scrollHeight - element.clientHeight)).toBeGreaterThan(0);
    await page.mouse.move(210, 450);
    await page.mouse.wheel(0, 10000);
    await expect.poll(() => scroll.evaluate(element => element.scrollTop + element.clientHeight - element.scrollHeight)).toBeGreaterThanOrEqual(-2);
    await expectNavigation(page);
    if (label === '我的') await expectUnobscured(page.getByRole('button', { name: '退出登录', exact: true }));
    await page.mouse.wheel(0, -10000);
    await expect.poll(() => scroll.evaluate(element => element.scrollTop)).toBeLessThanOrEqual(1);
  }
});

test('a native touch swipe starting on an editable image scrolls without opening the editor', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Trusted native touch injection is only available through Chromium CDP; WebKit uses wheel scrolling above.');
  await page.setViewportSize({ width: 430, height: 800 });
  const image = page.locator('.home-hero');
  const start = await center(image);
  const client = await page.context().newCDPSession(page);
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: start.x, y: start.y, id: 1 }] });
  for (let step = 1; step <= 8; step++) {
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: start.x, y: start.y - step * 24, id: 1 }] });
    await page.waitForTimeout(20);
  }
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(() => page.locator('.native-scroll').evaluate(element => element.scrollTop)).toBeGreaterThan(40);
  await page.waitForTimeout(700);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.native-app')).toHaveClass(/page-home/);
});

test('a held touch tolerates small jitter and can save edited data across reload', async ({ page }) => {
  const target = await loanSummary(page);
  const contact = await center(target);
  await touch(target, 'touchstart', [contact]);
  await page.waitForTimeout(250);
  await touch(target, 'touchmove', [{ ...contact, x: contact.x + 7, y: contact.y + 5 }]);
  const dialog = page.getByRole('dialog', { name: '编辑贷款汇总' });
  await expect(dialog).toBeVisible({ timeout: 1600 });
  await touch(target, 'touchend', [], [contact]);
  await dialog.getByLabel('可借额度（元）', { exact: true }).fill('1234.56');
  await dialog.getByRole('button', { name: '保存修改', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('.available')).toContainText('1,234.56');
  await page.reload();
  await page.getByRole('navigation', { name: '主导航' }).getByRole('button', { name: '贷款', exact: true }).click();
  await expect(page.locator('.available')).toContainText('1,234.56');
});

for (const reason of ['movement', 'cancellation', 'scroll', 'second-finger'] as const) {
  test(`a touch interrupted by ${reason} does not turn into an edit`, async ({ page }) => {
    const target = await loanSummary(page);
    const contact = await center(target);
    await touch(target, 'touchstart', [contact]);
    await page.waitForTimeout(150);
    if (reason === 'movement') await touch(target, 'touchmove', [{ ...contact, y: contact.y - 40 }]);
    if (reason === 'cancellation') await touch(target, 'touchcancel', [], [contact]);
    if (reason === 'scroll') await page.locator('.native-scroll').evaluate(element => { element.scrollTop = 80; });
    if (reason === 'second-finger') await touch(target, 'touchstart', [contact, { ...contact, id: 2, x: contact.x + 30 }]);
    await page.waitForTimeout(750);
    await touch(target, 'touchend', [], [contact]);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('.native-app')).toHaveClass(/page-loan/);
  });
}

test('holding a nested account image opens only its image editor and suppresses the release click', async ({ page }) => {
  await page.getByRole('button', { name: '我的账户', exact: true }).click();
  const target = page.locator('.account-card').first().locator('.bank-card-image img');
  const contact = await center(target);
  await touch(target, 'touchstart', [contact]);
  await expect(page.getByRole('dialog', { name: '编辑图片' })).toBeVisible({ timeout: 1600 });
  await touch(target, 'touchend', [], [contact]);
  await target.dispatchEvent('click');
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await expect(page.getByRole('dialog', { name: '编辑图片' })).toBeVisible();
  await page.getByRole('button', { name: '关闭编辑器', exact: true }).click();
  await expect(page.locator('.native-app')).toHaveClass(/page-accounts/);
});

test('holding an image with a tap destination does not navigate on release', async ({ page }) => {
  const target = page.locator('.home-hero img');
  const contact = await center(target);
  await touch(target, 'touchstart', [contact]);
  await expect(page.getByRole('dialog', { name: '编辑图片' })).toBeVisible({ timeout: 1600 });
  await touch(target, 'touchend', [], [contact]);
  await target.dispatchEvent('click');
  await expect(page.locator('.native-app')).toHaveClass(/page-home/);
  await expect(page.getByRole('dialog', { name: '编辑图片' })).toBeVisible();
});
