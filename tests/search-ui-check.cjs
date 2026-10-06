// Run against npm run dev with Playwright available; browser checks use mocked account APIs.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await page.goto((process.env.NAV_TEST_URL || 'http://127.0.0.1:8790') + '/tests/bookmark-browser.html');
    await page.waitForFunction(() => /全部通过|FAIL/.test(document.querySelector('#results').textContent));
    assert.match(await page.locator('#results').innerText(), /全部通过/);
    const frame = page.frames().find(f => f.url() === 'about:srcdoc');
    const input = frame.locator('#q');
    await input.fill('https://whoer.com/zh/');
    await input.focus();
    const styles = await input.evaluate(el => ({
      type: el.type, role: el.getAttribute('role'),
      outline: getComputedStyle(el).outlineStyle,
      focusBorder: getComputedStyle(el.parentElement).borderColor
    }));
    if (process.env.NAV_SCREENSHOT) await page.screenshot({path:process.env.NAV_SCREENSHOT,fullPage:true});
    assert.equal(styles.type, 'text', 'use a plain input to avoid native search clear controls');
    assert.equal(styles.role, 'searchbox', 'preserve search semantics');
    assert.equal(styles.outline, 'none', 'use the rounded container focus indicator instead of an inner rectangle');
    assert.equal(styles.focusBorder, 'rgb(1, 77, 178)', 'preserve a visible container focus indicator');
    await frame.locator('#q-clear').click();
    assert.equal(await input.inputValue(), '');
    assert.equal(await input.evaluate(el => el === document.activeElement), true);
    assert.equal(await frame.locator('#q-clear').isVisible(), false);
    console.log('PASS: one clear button, rounded focus, clearing returns focus and hides button; existing browser checks pass');
  } finally { await browser.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
