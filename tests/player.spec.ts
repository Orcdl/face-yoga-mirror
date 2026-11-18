import { test, expect, openApp, spoken } from './fixtures';

/*
 * Workout player: the prep → hold → rest state machine, controls, sound/voice cues.
 * The page clock is faked, so `page.clock.runFor(ms)` advances the timer instantly.
 *
 * Reference routine used below — "Thả lỏng cơ hàm trước khi ngủ":
 *   FF06 Thả lỏng cơ cắn  hold 5s × 5 reps, rest 5s (auto)  → 5 + 25 + 20 = 50s
 *   FF05 Xoa thái dương   continuous 40s                    → 5 + 40      = 45s
 *   JW05 Vuốt đường hàm   hold 3s × 3 reps, rest 2s (auto)  → 5 + 9 + 4   = 18s
 *   FF08 Ủ ấm mắt         hold 30s × 2 reps, rest 5s        → 5 + 60 + 5  = 70s
 */
const NIGHT = '[data-action="routine-play"][data-key="night"]';
const phase = (page) => page.locator('#ring-phase');
const rep = (page) => page.locator('#ring-rep');

test('loads with the morning routine ready and no script errors', async ({ page }) => {
  const { errors } = await openApp(page);
  await expect(page.locator('#queue-label')).toHaveText('Giảm sưng buổi sáng');
  await expect(page.locator('#queue-pos')).toHaveText(/Bài 1\/5/);
  await expect(page.locator('#ex-name')).toHaveText('Bơm hõm xương đòn');
  await expect(phase(page)).toHaveText('Sẵn sàng');
  await expect(page.locator('#ex-steps li')).toHaveCount(5);
  await expect(page.locator('#ex-cautions li')).not.toHaveCount(0);
  expect(errors).toEqual([]);
});

test.describe('video guides', () => {
  test('shows the chosen video and plays it in place, pausing the workout', async ({ page }) => {
    await openApp(page);
    // First exercise of the morning routine (NK06) has a verified video.
    const facade = page.locator('#ex-video-player [data-action="video-play"]');
    await expect(facade).toHaveAttribute('data-vid', 'ZPXJb148l3w');
    await expect(facade).toContainText('Simple Lymphatic Massage for the Head, Face and Neck');
    await expect(page.locator('#ex-videos a[data-video="watch"]')).toHaveAttribute('href', 'https://www.youtube.com/watch?v=ZPXJb148l3w');

    await page.click('#btn-play');
    await facade.click();
    const iframe = page.locator('#ex-video-player iframe');
    await expect(iframe).toHaveAttribute('src', /youtube-nocookie\.com\/embed\/ZPXJb148l3w\?autoplay=1/);
    await expect(page.locator('#btn-play')).toHaveAttribute('aria-label', 'Bắt đầu');

    // Switching exercise removes the player, so the old video stops.
    await page.click('#btn-next');
    await expect(iframe).toHaveCount(0);
    await expect(facade).toHaveAttribute('data-vid', 'ZdLbFmznsH4');
  });

  test('falls back to a link when thumbnails are blocked', async ({ page }) => {
    await openApp(page, { blockThumbnails: true });
    const card = page.locator('#ex-video-player a[data-video="watch"]');
    await expect(card).toHaveAttribute('href', 'https://www.youtube.com/watch?v=ZPXJb148l3w');
    await expect(page.locator('#ex-video-player [data-action="video-play"]')).toHaveCount(0);
  });

  test('exercises without a chosen video offer YouTube searches', async ({ page }) => {
    await openApp(page);
    await page.click('[data-tab="library"]');
    await page.fill('#search', 'Mở to mắt');
    await page.locator('[data-action="preview"]').first().click();
    await expect(page.locator('#ex-name')).toHaveText('Mở to mắt nhưng giữ trán phẳng');
    await expect(page.locator('#ex-video-player')).toBeEmpty();
    await expect(page.locator('#ex-videos a[data-video="en"]')).toHaveAttribute('href',
      'https://www.youtube.com/results?search_query=' + encodeURIComponent('wide eyed stare face yoga'));
    await expect(page.locator('#ex-videos a[data-video="vi"]')).toHaveAttribute('href',
      'https://www.youtube.com/results?search_query=' + encodeURIComponent('face yoga Mở to mắt nhưng giữ trán phẳng'));
  });

  test('every embedded video has an id, title and channel', async ({ page }) => {
    await openApp(page);
    const bad = await page.evaluate(`EXERCISES.filter(e => e.video &&
      !(/^[\\w-]{11}$/.test(e.video.id) && e.video.title && e.video.author && ['exact', 'related'].includes(e.video.match))).map(e => e.id)`);
    expect(bad).toEqual([]);
    expect(await page.evaluate('EXERCISES.filter(e => e.video).length')).toBe(40);
  });
});

test('routine cards show computed durations', async ({ page }) => {
  await openApp(page);
  const badges = page.locator('#panel-routines h3 + span');
  await expect(badges).toHaveText(['~3 phút · 5 bài', '~5 phút · 6 bài', '~3 phút · 4 bài']);
});

test('runs prep → hold → rest → next rep with the right labels', async ({ page }) => {
  await openApp(page);
  await page.click(NIGHT);
  await expect(page.locator('#ex-name')).toHaveText('Thả lỏng cơ cắn');

  await page.clock.runFor(2_500);               // t = 2.5s
  await expect(phase(page)).toHaveText('Chuẩn bị');
  await expect(page.locator('#ring-time')).toHaveText('3');

  await page.clock.runFor(5_000);               // t = 7.5s
  await expect(phase(page)).toHaveText('Giữ nhịp');
  await expect(rep(page)).toHaveText('Lần 1/5');

  await page.clock.runFor(5_000);               // t = 12.5s
  await expect(phase(page)).toHaveText('Nghỉ');
  await expect(rep(page)).toHaveText('Lần 1/5');

  await page.clock.runFor(5_000);               // t = 17.5s
  await expect(phase(page)).toHaveText('Giữ nhịp');
  await expect(rep(page)).toHaveText('Lần 2/5');

  // The mirror HUD mirrors the player state.
  await expect(page.locator('#hud')).toBeVisible();
  await expect(page.locator('#hud-rep')).toHaveText('2/5');
});

test('continuous exercises run a single flow phase', async ({ page }) => {
  await openApp(page);
  await page.click(NIGHT);
  await page.click('#btn-next');                 // FF05, still playing
  await expect(page.locator('#ex-name')).toHaveText('Xoa thái dương');
  await page.clock.runFor(10_000);
  await expect(phase(page)).toHaveText('Thực hiện liên tục');
});

test('auto-advances through the whole routine and finishes cleanly', async ({ page }) => {
  await openApp(page);
  await page.click(NIGHT);
  await page.clock.runFor(50_000 + 2_000);
  await expect(page.locator('#ex-name')).toHaveText('Xoa thái dương');
  await expect(page.locator('#queue-pos')).toHaveText(/Bài 2\/4/);

  await page.clock.runFor(45_000 + 18_000 + 70_000);
  await expect(phase(page)).toHaveText('Hoàn thành');
  await expect(page.locator('#btn-play')).toHaveAttribute('aria-label', 'Bắt đầu');
  await expect(page.locator('#today-stats')).toHaveText(/Hôm nay: 4 bài/);
  // The single interval must be cleared once the session ends.
  expect(await page.evaluate('state.timer')).toBeNull();
  expect(await spoken(page)).toContain('Tuyệt vời! Bạn đã hoàn thành buổi tập.');
});

test('pause freezes the countdown and resume continues from the same point', async ({ page }) => {
  await openApp(page);
  await page.click(NIGHT);
  await page.clock.runFor(7_000);                // hold 1, 3s left
  await page.click('#btn-play');                 // pause
  await expect(page.locator('#btn-play')).toHaveAttribute('aria-label', 'Bắt đầu');
  const frozen = await page.locator('#ring-time').textContent();

  await page.clock.runFor(20_000);
  await expect(page.locator('#ring-time')).toHaveText(frozen!);
  await expect(phase(page)).toHaveText('Giữ nhịp');
  expect(await page.evaluate('state.timer')).toBeNull();

  await page.click('#btn-play');                 // resume
  await page.clock.runFor(4_000);
  await expect(phase(page)).toHaveText('Nghỉ');
});

test('previous / next / reset controls', async ({ page }) => {
  await openApp(page);
  await page.click('#btn-next');
  await expect(page.locator('#queue-pos')).toHaveText(/Bài 2\/5/);
  await page.click('#btn-prev');
  await expect(page.locator('#queue-pos')).toHaveText(/Bài 1\/5/);

  await page.click('#btn-play');
  await page.clock.runFor(8_000);
  await page.click('#btn-reset');
  await expect(phase(page)).toHaveText('Sẵn sàng');
  await expect(page.locator('#btn-play')).toHaveAttribute('aria-label', 'Bắt đầu');
  await expect(page.locator('#hud')).toBeHidden();
});

test('keyboard shortcuts: Space toggles play, arrows change exercise', async ({ page }) => {
  await openApp(page);
  await page.locator('body').press('Space');
  await expect(page.locator('#btn-play')).toHaveAttribute('aria-label', 'Tạm dừng');
  await page.locator('body').press('Space');
  await expect(page.locator('#btn-play')).toHaveAttribute('aria-label', 'Bắt đầu');
  await page.locator('body').press('ArrowRight');
  await expect(page.locator('#queue-pos')).toHaveText(/Bài 2\/5/);
  await page.locator('body').press('ArrowLeft');
  await expect(page.locator('#queue-pos')).toHaveText(/Bài 1\/5/);
});

test('rest mode setting changes the rest length', async ({ page }) => {
  await openApp(page);
  await page.selectOption('#rest-mode', '3');
  await page.click(NIGHT);
  await page.clock.runFor(10_500);               // prep 5 + hold 5 → rest starts
  await expect(phase(page)).toHaveText('Nghỉ');
  await expect(page.locator('#ring-time')).toHaveText('3');
});

test.describe('voice guide', () => {
  test('announces the exercise in Vietnamese', async ({ page }) => {
    await openApp(page);
    await page.click('#btn-play');
    expect(await spoken(page)).toContain('Bài 1. Bơm hõm xương đòn. Chuẩn bị.');
  });

  test('switches to English', async ({ page }) => {
    await openApp(page);
    await page.click('#btn-lang');
    await expect(page.locator('#btn-lang')).toHaveText('EN');
    await page.click('#btn-play');
    expect(await spoken(page)).toContain('Exercise 1. Collarbone Pumping. Get ready.');
  });

  test('stays silent when turned off', async ({ page }) => {
    await openApp(page);
    await page.click('#btn-voice');
    await expect(page.locator('#btn-voice')).toHaveAttribute('aria-pressed', 'false');
    await page.click('#btn-play');
    await page.clock.runFor(8_000);
    expect(await spoken(page)).toEqual([]);
  });
});

test.describe('Vietnamese video guides (Má & Rãnh cười)', () => {
  // Opens one exercise from the library by its Vietnamese name.
  const openExercise = async (page, name: string) => {
    await page.click('[data-tab="library"]');
    await page.fill('#search', name);
    await page.locator('[data-action="preview"]').first().click();
    await expect(page.locator('#ex-name')).toHaveText(name);
  };

  test('plays the suggested Vietnamese video from the matching chapter', async ({ page }) => {
    await openApp(page);
    await openExercise(page, 'Phồng má chuyển hơi');

    const facade = page.locator('#ex-video-player [data-action="video-play"]');
    await expect(facade).toHaveAttribute('data-vid', '9XQqQw9pNvE');
    await expect(facade).toContainText('Video tiếng Việt gợi ý cho bài này · phát từ 3:40');
    await expect(page.locator('#ex-videos a[data-video="watch"]'))
      .toHaveAttribute('href', 'https://www.youtube.com/watch?v=9XQqQw9pNvE&t=220s');

    const chapters = page.locator('#ex-video-chapters button');
    await expect(chapters).toHaveCount(8);
    await expect(chapters.filter({ hasText: 'Bài tập phồng má' })).toHaveAttribute('aria-pressed', 'true');

    await facade.click();
    const iframe = page.locator('#ex-video-player iframe');
    await expect(iframe).toHaveAttribute('src', /embed\/9XQqQw9pNvE\?autoplay=1.*&start=220$/);

    // Jump to another chapter.
    await chapters.filter({ hasText: 'Giãn cơ nâng môi' }).click();
    await expect(iframe).toHaveAttribute('src', /&start=85$/);
    await expect(chapters.filter({ hasText: 'Giãn cơ nâng môi' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('lists the rest of the group and the English video, and plays any of them', async ({ page }) => {
    await openApp(page);
    await openExercise(page, 'Mặt cá');
    await expect(page.locator('#ex-video-player [data-action="video-play"]')).toHaveAttribute('data-vid', 'mwcyaHcMMIk');

    const more = page.locator('#ex-video-more');
    await expect(more.locator('summary')).toHaveText('Video khác (18) · 17 tiếng Việt');
    await more.locator('summary').click();
    const items = page.locator('#ex-video-list [data-action="video-load"]');
    await expect(items).toHaveCount(18);
    // The English "Fish Face" video comes first among the alternatives.
    await expect(items.first()).toContainText('Fish Face');

    // A long full-face routine starts at the cheek segment (5:40), not at 0:00.
    await items.filter({ hasText: 'Nâng cơ mặt, trẻ hóa da 5 tuổi' }).click();
    await expect(page.locator('#ex-video-player iframe')).toHaveAttribute('src', /embed\/RzI1QLuZvug\?.*&start=340$/);
    await expect(more.locator('summary')).toHaveText('Video khác (18) · 17 tiếng Việt');
    await expect(items.filter({ hasText: 'Nâng cơ mặt, trẻ hóa da 5 tuổi' })).toHaveCount(0);
  });

  test('Vietnamese coverage: every cheek, mouth and eye exercise; no other zone', async ({ page }) => {
    await openApp(page);
    const res = await page.evaluate(`(() => {
      const covered = ['cheeks', 'mouth', 'eyes'];
      const has = e => VI_VIDEO_GROUPS[e.zone] && VI_VIDEO_GROUPS[e.zone].videos.some(v => v.exercises.some(x => x.ma === e.id));
      return {
        missing: EXERCISES.filter(e => covered.includes(e.zone) && !has(e)).map(e => e.id),
        extra: EXERCISES.filter(e => !covered.includes(e.zone) && (VI_VIDEO_GROUPS[e.zone] || e.viCount)).map(e => e.id),
        badRef: Object.values(VI_VIDEO_GROUPS).flatMap(g => g.videos.flatMap(v => v.exercises.filter(x => !EX_BY_ID[x.ma]).map(x => v.id + ':' + x.ma))),
        sizes: [VI_VIDEO_GROUPS.cheeks.videos.length, VI_VIDEO_GROUPS.eyes.videos.length],
        sameGroup: VI_VIDEO_GROUPS.cheeks === VI_VIDEO_GROUPS.mouth,
      };
    })()`);
    expect(res).toEqual({ missing: [], extra: [], badRef: [], sizes: [18, 11], sameGroup: true });

    // A neck exercise keeps its English video and has no Vietnamese list.
    await expect(page.locator('#ex-video-player [data-action="video-play"]')).toHaveAttribute('data-vid', 'ZPXJb148l3w');
    await expect(page.locator('#ex-video-more')).toBeHidden();
  });
});

test.describe('Vietnamese video guides (Mắt & lông mày)', () => {
  const openExercise = async (page, name: string) => {
    await page.click('[data-tab="library"]');
    await page.fill('#search', name);
    await page.locator('[data-action="preview"]').first().click();
    await expect(page.locator('#ex-name')).toHaveText(name);
  };

  test('starts the first video that has this exercise, at its timestamp', async ({ page }) => {
    await openApp(page);
    await openExercise(page, 'Nheo mí dưới');

    const facade = page.locator('#ex-video-player [data-action="video-play"]');
    await expect(facade).toHaveAttribute('data-vid', 'tUHiDb19JZc');
    await expect(facade).toContainText('Video tiếng Việt cho bài này · phát từ 0:22');

    // Chapters are the app exercises inside the video, in time order.
    const chapters = page.locator('#ex-video-chapters button');
    await expect(chapters).toHaveText([
      '0:16 Nâng lông mày', '0:22 Nheo mí dưới', '0:37 Gõ & xoa vòng hốc mắt',
      '1:15 Nhìn tập trung xa - gần & xoay mắt', '4:10 Chữ V (nâng mắt)',
    ]);
    await expect(chapters.filter({ hasText: 'Nheo mí dưới' })).toHaveAttribute('aria-pressed', 'true');

    await facade.click();
    await expect(page.locator('#ex-video-player iframe')).toHaveAttribute('src', /embed\/tUHiDb19JZc\?.*&start=22$/);
  });

  test('lists the other videos with this exercise first, each at its own timestamp', async ({ page }) => {
    await openApp(page);
    await openExercise(page, 'Nheo mí dưới');
    const more = page.locator('#ex-video-more');
    await expect(more.locator('summary')).toHaveText('Video khác (11) · 10 tiếng Việt');
    await more.locator('summary').click();

    const items = page.locator('#ex-video-list [data-action="video-load"]');
    const withThis = items.filter({ hasText: 'Có bài này' });
    await expect(withThis).toHaveCount(5);
    await expect(withThis.first()).toContainText('Có bài này · từ 4:22');   // 729CjQZUxuo, t = 262

    await items.filter({ hasText: '5 bài tập TỐT NHẤT cải thiện MẮT XỤP MÍ' }).click();
    await expect(page.locator('#ex-video-player iframe')).toHaveAttribute('src', /embed\/9PMab71eDtg\?.*&start=510$/);
  });

  test('Mắt cú now has a Vietnamese video; the library shows video counts', async ({ page }) => {
    await openApp(page);
    await openExercise(page, 'Mắt cú (ống nhòm)');
    await expect(page.locator('#ex-video-player [data-action="video-play"]')).toHaveAttribute('data-vid', 'iUVkzVRSYlw');
    await expect(page.locator('#ex-video-player [data-action="video-play"]')).toContainText('phát từ 6:00');

    await page.fill('#search', 'Nheo mí dưới');
    await expect(page.locator('#library article')).toContainText('▶ 6 video tiếng Việt');
  });
});
