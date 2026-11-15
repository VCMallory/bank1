import { expect, test, type Locator, type Page } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

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
    expect(box!.y + box!.height).toBeLessThanOrEqual(page.viewportSize()!.height - bottomInset + 1);
    await expectUnobscured(caption);
  }
  const scroll = await page.locator('.native-scroll').boundingBox();
  const tabs = await nav.boundingBox();
  expect(scroll).not.toBeNull();
  expect(tabs).not.toBeNull();
  expect(scroll!.y).toBe(0);
  if (await page.locator('.native-app').evaluate(element => element.classList.contains('page-home'))) {
    const chrome = page.locator('.home-chrome');
    expect((await chrome.boundingBox())!.y).toBe(0);
    expect((await chrome.locator('.home-topbar').boundingBox())!.y).toBeGreaterThanOrEqual(topInset);
  }
  expect(scroll!.y + scroll!.height).toBeLessThanOrEqual(tabs!.y + 1);
}

type NativeRoute = 'home' | 'finance' | 'loan' | 'life' | 'mine' | 'login' | 'accounts' | 'transactions' | 'detail' | 'myloans' | 'records' | 'transfer' | 'borrow' | 'repay' | 'all' | 'settings' | 'service';
const nativeTabs = { home: '首页', finance: '金服', loan: '贷款', life: '生活', mine: '我的' } as const;

async function openNativeRoute(page: Page, route: NativeRoute) {
  const tab = async (label: string) => page.getByRole('navigation', { name: '主导航' }).getByRole('button', { name: label, exact: true }).click();
  if (route in nativeTabs) {
    await tab(nativeTabs[route as keyof typeof nativeTabs]);
  } else if (['accounts', 'transactions', 'detail'].includes(route)) {
    await page.getByRole('button', { name: '我的账户', exact: true }).click();
    if (route !== 'accounts') await page.locator('.account-card').first().getByRole('button', { name: '账户明细', exact: true }).click();
    if (route === 'detail') {
      await page.getByRole('combobox', { name: '选择时间' }).selectOption('2026-10');
      await page.locator('.transaction-row').first().click();
    }
  } else if (['myloans', 'records', 'repay'].includes(route)) {
    await tab('贷款');
    await page.getByRole('button', { name: '我的贷款', exact: true }).click();
    if (route === 'records') await page.getByRole('button', { name: '历史明细', exact: true }).click();
    if (route === 'repay') await page.locator('.loan-card').first().getByRole('button', { name: '还款', exact: true }).click();
  } else if (route === 'borrow') {
    await tab('贷款');
    await page.getByRole('button', { name: '借一笔', exact: true }).click();
  } else if (route === 'settings') {
    await tab('我的');
    await page.getByRole('button', { name: '设置', exact: true }).click();
  } else if (route === 'login') {
    // Use the same cross-tab session-expiry path as the app, without changing
    // the disposable data or reaching into the component's route state.
    await page.evaluate(() => {
      localStorage.setItem('demo-logged', 'false');
      window.dispatchEvent(new StorageEvent('storage', { key: 'demo-logged' }));
    });
    await page.getByRole('button', { name: '我的账户', exact: true }).click();
  } else if (route === 'transfer') {
    await page.getByRole('button', { name: '转账', exact: true }).click();
  } else if (route === 'all') {
    await page.locator('.home-content-menu').getByRole('button', { name: '全部', exact: true }).click();
  } else {
    await page.locator('.home-content-quick').getByRole('button', { name: '扫一扫', exact: true }).click();
  }
  await expect(page.locator('.native-app')).toHaveClass(new RegExp(`(?:^|\\s)page-${route}(?:\\s|$)`));
}

function leadingHeader(page: Page, route: NativeRoute) {
  const headers: Partial<Record<NativeRoute, string>> = {
    home: '.home-chrome', finance: '.finance-top', mine: '.profile-top', loan: '.loan-top', life: '.life-title',
  };
  return page.locator(headers[route] ?? '.screen-header');
}

async function expectSafeHeaderControls(page: Page, route: NativeRoute) {
  const header = leadingHeader(page, route);
  if (!(route in nativeTabs)) {
    const targets = header.locator('h1, button');
    expect(await targets.count()).toBeGreaterThanOrEqual(2);
    for (const target of await targets.all()) {
      const box = await target.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.y).toBeGreaterThanOrEqual(topInset + 11);
      expect(box!.y + box!.height).toBeLessThanOrEqual(topInset + 51);
      await expectUnobscured(target);
    }
    return;
  }
  if (route === 'life') {
    const text = await header.evaluate(element => {
      const range = document.createRange();
      range.selectNodeContents(element);
      const box = range.getBoundingClientRect();
      const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
      return { top: box.top, height: box.height, unobscured: hit !== null && element.contains(hit) };
    });
    expect(text.height).toBeGreaterThan(10);
    expect(text.top).toBeGreaterThanOrEqual(topInset);
    expect(text.unobscured).toBe(true);
    return;
  }
  const selectors = {
    home: '.home-topbar button', finance: 'h1, .feature-grid button',
    mine: '.profile-tools button, .profile-display-name', loan: '.summary-main > span, .summary-bottom > .gold-button',
  };
  const targets = header.locator(selectors[route]);
  expect(await targets.count()).toBeGreaterThan(0);
  for (const target of await targets.all()) {
    const box = await target.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y).toBeGreaterThanOrEqual(topInset);
    await expectUnobscured(target);
  }
}

async function statusScreenshot(page: Page) {
  return page.screenshot({ clip: { x: 0, y: 0, width: page.viewportSize()!.width, height: topInset } });
}

async function expectSameStatusPixels(page: Page, actual: Buffer, expected: Buffer, label: string) {
  // Decode via the browser's public PNG/Canvas APIs. Comparing encoded buffers
  // overreacts to a few 1-channel rounding differences in background textures.
  const difference = await page.evaluate(async input => {
    const decode = async (base64: string) => {
      const image = new Image();
      image.src = `data:image/png;base64,${base64}`;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d')!;
      context.drawImage(image, 0, 0);
      return context.getImageData(0, 0, canvas.width, canvas.height);
    };
    const [left, right] = await Promise.all([decode(input.actual), decode(input.expected)]);
    if (left.width !== right.width || left.height !== right.height) return { sameSize: false, maximum: Infinity, mean: Infinity };
    let maximum = 0, total = 0;
    for (let index = 0; index < left.data.length; index++) {
      if (index % 4 === 3) continue;
      const delta = Math.abs(left.data[index] - right.data[index]);
      maximum = Math.max(maximum, delta);
      total += delta;
    }
    return { sameSize: true, maximum, mean: total / (left.width * left.height * 3) };
  }, { actual: actual.toString('base64'), expected: expected.toString('base64') });
  if (!difference.sameSize || difference.maximum > 2 || difference.mean > 0.05) {
    await writeFile(test.info().outputPath(`${label}-actual.png`), actual);
    await writeFile(test.info().outputPath(`${label}-expected.png`), expected);
    await test.info().attach(`${label}-actual`, { body: actual, contentType: 'image/png' });
    await test.info().attach(`${label}-expected`, { body: expected, contentType: 'image/png' });
  }
  expect(difference.sameSize, label).toBe(true);
  expect(difference.maximum, `${label}: maximum channel difference`).toBeLessThanOrEqual(2);
  expect(difference.mean, `${label}: mean channel difference`).toBeLessThanOrEqual(0.05);
}

async function expectStatusSurface(page: Page, route: NativeRoute) {
  const header = leadingHeader(page, route);
  const surface = page.locator('.native-status-surface');
  const paint = surface.locator('.native-status-paint');
  await expect(surface).toHaveCount(1);
  await expect(paint).toHaveCount(1);
  await expect(surface).toHaveAttribute('data-page', route);
  await expect(surface).toHaveAttribute('data-foreground', ['home', 'finance', 'mine'].includes(route) ? 'light' : 'dark');
  expect((await page.locator('.native-scroll').boundingBox())!.y).toBe(0);
  expect((await header.boundingBox())!.y).toBe(0);

  // Copying styles alone is insufficient: both boxes must actually cover the
  // full status region, and the clipped paint keeps the source header's scale.
  const expectFixed = async () => {
    const box = (await surface.boundingBox())!;
    const paintBox = (await paint.boundingBox())!;
    expect(box.x).toBe(0);
    expect(box.y).toBe(0);
    expect(box.width).toBe(page.viewportSize()!.width);
    expect(box.height).toBe(topInset);
    expect(paintBox.x).toBe(0);
    expect(paintBox.y).toBe(0);
    expect(paintBox.width).toBe(box.width);
    expect(paintBox.height).toBeGreaterThanOrEqual(topInset);
    expect(await surface.evaluate(element => {
      const hit = document.elementFromPoint(12, 12);
      return getComputedStyle(element).pointerEvents === 'none' && hit !== null && !element.contains(hit);
    })).toBe(true);
  };
  await expect.poll(async () => Math.abs((await paint.boundingBox())!.height - (await header.boundingBox())!.height)).toBeLessThanOrEqual(1);
  await expect.poll(() => header.evaluate(element => {
    const layer = document.querySelector('.native-status-paint');
    if (!layer) return false;
    const source = getComputedStyle(element), copy = getComputedStyle(layer);
    return ['backgroundColor', 'backgroundImage', 'backgroundSize', 'backgroundPosition', 'backgroundRepeat'].every(key => source[key as keyof CSSStyleDeclaration] === copy[key as keyof CSSStyleDeclaration]);
  })).toBe(true);
  await expectFixed();
  await expectSafeHeaderControls(page, route);
  await header.evaluate(async element => {
    const images = [...getComputedStyle(element).backgroundImage.matchAll(/url\(["']?([^"')]+)["']?\)/g)];
    await Promise.all(images.map(async match => {
      const image = new Image();
      image.src = match[1];
      await image.decode();
    }));
  });

  // Compare rendered pixels against the real leading header underneath. This
  // catches an uncovered/opaque status strip even when CSS values look right.
  const initial = await statusScreenshot(page);
  await surface.evaluate(element => { (element as HTMLElement).style.visibility = 'hidden'; });
  let underlying: Buffer;
  try { underlying = await statusScreenshot(page); }
  finally { await surface.evaluate(element => { (element as HTMLElement).style.removeProperty('visibility'); }); }
  await expectSameStatusPixels(page, initial, underlying!, `${route}-status-matches-leading-header`);
  return { initial, expectFixed };
}

async function scrollNative(page: Page, engine: string, bottom: boolean) {
  const scroll = page.locator('.native-scroll');
  if (engine === 'webkit') {
    // Mobile WebKit has no Playwright wheel input. This checks reachable scroll
    // positions/layout, not the operating system's native iOS pan recognizer.
    await scroll.evaluate((element, toBottom) => element.scrollTo(0, toBottom ? element.scrollHeight : 0), bottom);
  } else {
    await page.mouse.move(page.viewportSize()!.width / 2, page.viewportSize()!.height / 2);
    await page.mouse.wheel(0, bottom ? 10000 : -10000);
  }
  if (bottom) {
    await expect.poll(() => scroll.evaluate(element => element.scrollTop + element.clientHeight - element.scrollHeight)).toBeGreaterThanOrEqual(-2);
  } else {
    await expect.poll(() => scroll.evaluate(element => element.scrollTop)).toBeLessThanOrEqual(1);
  }
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

test('home, loans and profile scroll both ways while all five tab captions remain visible', async ({ page, browserName }) => {
  for (const label of ['首页', '贷款', '我的']) {
    await page.getByRole('navigation', { name: '主导航' }).getByRole('button', { name: label, exact: true }).click();
    await expectNavigation(page);
    const scroll = page.locator('.native-scroll');
    expect(await scroll.evaluate(element => element.scrollHeight - element.clientHeight)).toBeGreaterThan(0);
    if (browserName === 'webkit') {
      // Mobile WebKit does not expose wheel input in Playwright. Advancing the
      // scroll position verifies reachable content/layout, not a native iOS pan.
      await scroll.evaluate(element => element.scrollTo(0, element.scrollHeight));
    } else {
      await page.mouse.move(210, 450);
      await page.mouse.wheel(0, 10000);
    }
    await expect.poll(() => scroll.evaluate(element => element.scrollTop + element.clientHeight - element.scrollHeight)).toBeGreaterThanOrEqual(-2);
    await expectNavigation(page);
    if (label === '我的') await expectUnobscured(page.getByRole('button', { name: '退出登录', exact: true }));
    if (browserName === 'webkit') {
      await scroll.evaluate(element => element.scrollTo(0, 0));
    } else {
      await page.mouse.wheel(0, -10000);
    }
    await expect.poll(() => scroll.evaluate(element => element.scrollTop)).toBeLessThanOrEqual(1);
  }
});

test('a native touch swipe starting on an editable image scrolls without opening the editor', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Trusted native touch injection is only available through Chromium CDP; WebKit validates scroll positions/layout above, not a native iOS pan.');
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
    if (reason === 'scroll') await page.setViewportSize({ width: 430, height: 800 });
    const target = await loanSummary(page);
    const contact = await center(target);
    await touch(target, 'touchstart', [contact]);
    await page.waitForTimeout(150);
    if (reason === 'movement') await touch(target, 'touchmove', [{ ...contact, y: contact.y - 40 }]);
    if (reason === 'cancellation') await touch(target, 'touchcancel', [], [contact]);
    if (reason === 'scroll') {
      await page.locator('.native-scroll').evaluate(element => { element.scrollTop = 80; });
      await expect.poll(() => page.locator('.native-scroll').evaluate(element => element.scrollTop)).toBeGreaterThan(0);
    }
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


test('home covers the status area with fixed blue chrome and compacts its shortcuts on scroll', async ({ page }) => {
  const chrome = page.locator('.home-chrome');
  await expect(chrome).toHaveAttribute('data-compact', 'false');
  expect(await chrome.evaluate(element => {
    const rect = element.getBoundingClientRect();
    const hit = document.elementFromPoint(12, 12);
    return rect.y === 0 && rect.height >= 59 + 44 && hit !== null && element.contains(hit);
  })).toBe(true);
  await expectUnobscured(page.getByRole('button', { name: '搜索', exact: true }));
  await page.locator('.native-scroll').evaluate(element => element.scrollTo({ top: 250, behavior: 'instant' }));
  await expect(chrome).toHaveAttribute('data-compact', 'true');
  await expect(chrome.getByRole('button', { name: '扫一扫', exact: true })).toBeVisible();
  expect((await chrome.boundingBox())!.y).toBe(0);
  await expectNavigation(page);
  await page.locator('.native-scroll').evaluate(element => element.scrollTo({ top: 0, behavior: 'instant' }));
  await expect(chrome).toHaveAttribute('data-compact', 'false');
  await page.getByRole('navigation', { name: '主导航' }).getByRole('button', { name: '我的', exact: true }).click();
  await expect(chrome).toHaveCount(0);
  expect((await page.locator('.native-scroll').boundingBox())!.y).toBe(0);
});

test('vertical wheel and touch gestures over the promotion rail continue scrolling the page', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Trusted wheel/touch injection is not exposed for mobile WebKit; its scroll positions and layout are checked separately.');
  const rail = page.locator('.home-content-promotion-carousel');
  const scroll = page.locator('.native-scroll');
  const point = await center(rail);
  await page.mouse.move(point.x, point.y);
  await page.mouse.wheel(0, 180);
  await expect.poll(() => scroll.evaluate(element => element.scrollTop)).toBeGreaterThan(40);
  await page.waitForTimeout(150);
  await scroll.evaluate(element => element.scrollTo({ top: 0, behavior: 'instant' }));
  await expect.poll(() => scroll.evaluate(element => element.scrollTop)).toBe(0);
  const start = await center(rail);
  const client = await page.context().newCDPSession(page);
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: start.x, y: start.y, id: 1 }] });
  for (let step = 1; step <= 8; step++) {
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: start.x, y: start.y - step * 24, id: 1 }] });
    await page.waitForTimeout(20);
  }
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(() => scroll.evaluate(element => element.scrollTop)).toBeGreaterThan(40);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await page.evaluate(() => document.scrollingElement!.scrollTop)).toBe(0);
});

for (const route of ['home', 'finance', 'loan', 'life', 'mine', 'login', 'accounts', 'transactions', 'detail', 'myloans', 'records', 'transfer', 'borrow', 'repay', 'all', 'settings', 'service'] as const) {
  test(`${route} extends its own header through the status area and keeps controls below it`, async ({ page, browserName }) => {
    await openNativeRoute(page, route);
    const { initial, expectFixed } = await expectStatusSurface(page, route);
    const tabPage = route in nativeTabs;
    if (tabPage) await expectNavigation(page);
    else await expect(page.getByRole('navigation', { name: '主导航' })).toHaveCount(0);

    // Short routes may have no overflow. An attempted scroll must still leave
    // their status paint fixed; long routes must reach their actual last pixel.
    await scrollNative(page, browserName, true);
    await expectFixed();
    await expectSameStatusPixels(page, await statusScreenshot(page), initial, `${route}-status-after-scroll-down`);
    if (tabPage) await expectNavigation(page);

    await scrollNative(page, browserName, false);
    await expectFixed();
    await expectSameStatusPixels(page, await statusScreenshot(page), initial, `${route}-status-after-scroll-up`);
    await expectSafeHeaderControls(page, route);
    if (tabPage) await expectNavigation(page);
    else {
      // The transparent status layer must not intercept the actual return tap.
      await page.getByRole('button', { name: '返回', exact: true }).click();
      await expect(page.locator(`.native-app.page-${route}`)).toHaveCount(0);
    }
  });
}
