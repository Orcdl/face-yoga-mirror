import { test, expect, openApp } from './fixtures';

/* Exercise library, zone filters, search, routines and the custom playlist. */

test.beforeEach(async ({ page }) => {
  await openApp(page);
});

test('exercise data is complete', async ({ page }) => {
  const problems = await page.evaluate(`EXERCISES.filter(e =>
    !e.nameVi || !e.zoneVi || !(e.holdSeconds >= 0) || !(e.reps > 0) ||
    !e.steps.length || !e.cautions.length).map(e => e.id)`);
  expect(problems).toEqual([]);
  expect(await page.evaluate('EXERCISES.length')).toBe(45);
});

test('zone filters narrow the library', async ({ page }) => {
  await page.click('[data-tab="library"]');
  const count = page.locator('#lib-count');
  await expect(count).toHaveText('45 bài tập');

  const expected: [string, number][] = [
    ['forehead', 5], ['eyes', 6], ['cheeks', 12], ['jaw', 6], ['neck', 7], ['relax', 9], ['all', 45],
  ];
  for (const [zone, n] of expected) {
    await page.click(`[data-zone="${zone}"]`);
    await expect(page.locator(`[data-zone="${zone}"]`)).toHaveAttribute('aria-pressed', 'true');
    await expect(count).toHaveText(`${n} bài tập`);
    await expect(page.locator('#library article')).toHaveCount(n);
  }
});

test('search matches names and benefits', async ({ page }) => {
  await page.click('[data-tab="library"]');
  await page.fill('#search', 'hôn trần nhà');
  await expect(page.locator('#library article')).toHaveCount(1);
  await expect(page.locator('#library article')).toContainText('Hôn trần nhà');

  await page.fill('#search', 'zzz không có');
  await expect(page.locator('#library')).toContainText('Không tìm thấy bài phù hợp.');
});

test('playing a single exercise from the library', async ({ page }) => {
  await page.click('[data-tab="library"]');
  await page.click('[data-zone="forehead"]');
  await page.locator('[data-action="play-one"]').first().click();
  await expect(page.locator('#queue-label')).toHaveText('Bài lẻ: Là phẳng trán');
  await expect(page.locator('#btn-play')).toHaveAttribute('aria-label', 'Tạm dừng');
});

test('builds, reorders, persists and plays a custom playlist', async ({ page }) => {
  await page.click('[data-tab="library"]');
  await page.click('[data-zone="cheeks"]');
  const picks = page.locator('[data-action="toggle-pick"]');
  await picks.nth(0).click();                   // Mặt cá
  await picks.nth(1).click();                   // Phồng má chuyển hơi
  await expect(picks.nth(0)).toHaveText('✓ Trong playlist');
  await expect(page.locator('#pl-count')).toHaveText('2');

  await page.click('[data-tab="playlist"]');
  const rows = page.locator('#panel-playlist li');
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText('Mặt cá');

  await page.click('[data-action="pl-down"][data-i="0"]');
  await expect(rows.nth(0)).toContainText('Phồng má chuyển hơi');

  await page.reload();
  await page.click('[data-tab="playlist"]');
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText('Phồng má chuyển hơi');

  await page.click('[data-action="pl-play"]');
  await expect(page.locator('#queue-label')).toHaveText('Playlist của tôi');
  await expect(page.locator('#ex-name')).toHaveText('Phồng má chuyển hơi');
  await expect(page.locator('#queue-pos')).toHaveText(/Bài 1\/2/);

  await page.click('[data-tab="playlist"]');
  await page.click('[data-action="pl-remove"][data-i="0"]');
  await page.click('[data-action="pl-clear"]');
  await expect(page.locator('#panel-playlist')).toContainText('Playlist của bạn đang trống');
});

test('copying a routine into the playlist', async ({ page }) => {
  await page.click('[data-action="routine-copy"][data-key="lift"]');
  await expect(page.locator('#pl-count')).toHaveText('6');
});
