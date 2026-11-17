import { test, expect, openApp } from './fixtures';

/*
 * Live mirror: camera on/off, mirroring, grid overlay and error fallbacks.
 * Chromium's fake device (see playwright.config.ts) stands in for a real webcam.
 */

test('turns the mirror on and off and releases the camera', async ({ page }) => {
  await openApp(page);
  const video = page.locator('#cam-video');
  await expect(page.locator('#cam-placeholder')).toBeVisible();
  await expect(page.locator('#cam-ph-title')).toHaveText('Gương soi đang tắt');

  await page.click('#btn-cam');
  await expect(video).toBeVisible();
  await expect(page.locator('#btn-cam-label')).toHaveText('Tắt camera');
  await expect(video).toHaveClass(/mirror/);
  expect(await video.evaluate(v => getComputedStyle(v).transform)).toBe('matrix(-1, 0, 0, 1, 0, 0)');
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.videoWidth)).toBeGreaterThan(0);

  // Keep a handle on the track to prove it really stops.
  await page.evaluate('window.__track = Camera.stream.getVideoTracks()[0]');
  await page.click('#btn-cam');
  await expect(video).toBeHidden();
  await expect(page.locator('#cam-placeholder')).toBeVisible();
  expect(await page.evaluate('window.__track.readyState')).toBe('ended');
  expect(await page.evaluate('Camera.stream')).toBeNull();
  expect(await video.evaluate((v: HTMLVideoElement) => v.srcObject)).toBeNull();
});

test('placeholder button also starts the camera', async ({ page }) => {
  await openApp(page);
  await page.click('#cam-ph-btn');
  await expect(page.locator('#cam-video')).toBeVisible();
});

test('shows a permission message when access is denied', async ({ page }) => {
  await openApp(page, { camera: 'denied' });
  await page.click('#btn-cam');
  await expect(page.locator('#cam-ph-title')).toHaveText('Chưa được cấp quyền camera');
  await expect(page.locator('#cam-ph-btn')).toHaveText('Thử lại');
  await expect(page.locator('#cam-video')).toBeHidden();
  // The workout still works without a camera.
  await page.click('#btn-play');
  await expect(page.locator('#ring-phase')).toHaveText('Chuẩn bị');
});

test('shows a no-camera message when no device exists', async ({ page }) => {
  await openApp(page, { camera: 'missing' });
  await page.click('#btn-cam');
  await expect(page.locator('#cam-ph-title')).toHaveText('Không tìm thấy camera');
});

test('grid overlay toggles and is remembered after reload', async ({ page }) => {
  await openApp(page);
  const grid = page.locator('#grid-overlay');
  await expect(grid).toBeHidden();
  await page.click('#btn-grid');
  await expect(grid).toBeVisible();
  await expect(page.locator('#btn-grid')).toHaveAttribute('aria-pressed', 'true');

  await page.reload();
  await expect(grid).toBeVisible();
  await page.click('#btn-grid');
  await expect(grid).toBeHidden();
});
