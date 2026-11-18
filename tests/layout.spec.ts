import { test, expect, openApp } from './fixtures';

/*
 * Layout guard: the page must never scroll sideways, in every view, including
 * when YouTube thumbnails are blocked and the video card falls back to a link
 * (as happens inside the Claude preview).
 * Layout depends on Tailwind: in CI it loads from the CDN; offline, point
 * TAILWIND_SHIM at a locally built bundle.
 */
const noSideScroll = async (page) => {
  const { sw, vw } = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    vw: document.documentElement.clientWidth,
  }));
  expect(sw, `page is ${sw}px wide in a ${vw}px viewport`).toBeLessThanOrEqual(vw);
};

for (const blockThumbnails of [false, true]) {
  test(`no horizontal scrolling (thumbnails ${blockThumbnails ? 'blocked' : 'shown'})`, async ({ page }) => {
    await openApp(page, { blockThumbnails });
    await noSideScroll(page);

    await page.click('[data-tab="library"]');
    await noSideScroll(page);

    await page.click('[data-tab="routines"]');
    await page.click('[data-action="routine-copy"][data-key="lift"]');
    await page.click('[data-tab="playlist"]');
    await noSideScroll(page);

    // Walk through every exercise of the longest routine.
    await page.click('[data-tab="routines"]');
    await page.click('[data-action="routine-load"][data-key="lift"]');
    for (let i = 0; i < 5; i++) {
      await page.click('#btn-next');
      await noSideScroll(page);
    }

    // And every eye exercise (several Vietnamese videos, long chapter rows).
    await page.evaluate(`loadQueue(EXERCISES.filter(e => e.zone === 'eyes').map(e => ({ id: e.id })), 'Mắt', { scroll: false })`);
    for (let i = 0; i < 6; i++) {
      await page.locator('#ex-video-more summary').click();
      await noSideScroll(page);
      if (i < 5) await page.click('#btn-next');
    }
  });
}
