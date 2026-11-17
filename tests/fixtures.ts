import { test as base, expect, Page } from '@playwright/test';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const APP_URL = pathToFileURL(path.resolve(__dirname, '..', 'face-yoga.html')).href;

type CameraMode = 'fake' | 'denied' | 'missing';

/**
 * Replaces window.speechSynthesis with a recorder so tests can assert what the
 * voice guide says (headless browsers have no voices, and real speech is slow).
 */
function stubSpeech() {
  const spoken: { text: string; lang: string }[] = [];
  (window as any).__spoken = spoken;
  const fake = {
    speaking: false,
    pending: false,
    getVoices: () => [],
    addEventListener: () => {},
    cancel: () => {},
    speak: (u: SpeechSynthesisUtterance) => { spoken.push({ text: u.text, lang: u.lang }); },
  };
  Object.defineProperty(window, 'speechSynthesis', { value: fake, configurable: true });
}

/** Makes getUserMedia fail the way a browser does when permission is denied or no camera exists. */
function stubCameraFailure(errorName: string) {
  navigator.mediaDevices.getUserMedia = () =>
    Promise.reject(new DOMException('stubbed camera failure', errorName));
}

export async function openApp(page: Page, opts: { camera?: CameraMode; fakeClock?: boolean } = {}) {
  const { camera = 'fake', fakeClock = true } = opts;
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));

  // Fonts are cosmetic; skip them so tests don't depend on Google Fonts being reachable.
  await page.route('**/fonts.googleapis.com/**', r => r.fulfill({ contentType: 'text/css', body: '' }));
  await page.route('**/fonts.gstatic.com/**', r => r.abort());

  await page.addInitScript(stubSpeech);
  if (camera === 'denied') await page.addInitScript(stubCameraFailure, 'NotAllowedError');
  if (camera === 'missing') await page.addInitScript(stubCameraFailure, 'NotFoundError');

  // A fake clock lets tests move the workout timer forward instantly and deterministically.
  if (fakeClock) await page.clock.install();

  await page.goto(APP_URL);
  await expect(page.locator('#ex-name')).not.toBeEmpty();
  return { errors };
}

export const spoken = (page: Page) =>
  page.evaluate(() => ((window as any).__spoken as { text: string }[]).map(s => s.text));

export const test = base;
export { expect };
