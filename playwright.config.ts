import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests for face-yoga.html.
 * The app is a single static file, so tests open it directly via file:// — no server needed.
 * Chromium's fake media flags give the tests a virtual front camera.
 */
const fakeCamera = {
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
};

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    trace: 'off',
    permissions: ['camera'],
    launchOptions: fakeCamera,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
});
