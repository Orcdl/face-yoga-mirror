# Gương Yoga Mặt — Face Yoga Mirror

Web app luyện Face Yoga cá nhân trong **một file duy nhất**: `face-yoga.html`.
Mở file bằng Chrome, Edge, Safari hoặc Firefox là dùng được, không cần cài đặt.

- Gương soi trực tiếp từ camera trước (lật ngang như gương) + lưới căn chỉnh khuôn mặt
- Bộ đếm Chuẩn bị → Giữ → Nghỉ với vòng tiến trình, chuông (Web Audio API) và giọng đọc VI/EN
- 45 bài tập, 3 lộ trình mục tiêu, bộ lọc theo vùng, playlist tuỳ chỉnh

> Camera chỉ hoạt động qua HTTPS, `localhost` hoặc khi mở file trực tiếp trên máy.

## Chạy test

Bộ test end-to-end dùng [Playwright](https://playwright.dev), chạy trên Chromium ở 2 kích thước (desktop và mobile Pixel 7), với camera giả lập.

```bash
npm install
npx playwright install chromium   # chỉ cần lần đầu
npm test                          # chạy toàn bộ test
npm run test:headed               # chạy và xem trình duyệt
npx playwright test --project=desktop tests/player.spec.ts   # chạy một phần
```

| File | Nội dung kiểm tra |
| --- | --- |
| `tests/player.spec.ts` | Máy trạng thái bộ đếm, tạm dừng/tiếp tục, bài trước/sau, phím tắt, giọng đọc |
| `tests/camera.spec.ts` | Bật/tắt gương, giải phóng camera, lỗi bị chặn quyền / không có camera, lưới căn chỉnh |
| `tests/library.spec.ts` | Dữ liệu bài tập, bộ lọc vùng, tìm kiếm, lộ trình, playlist |

Test dùng đồng hồ giả (`page.clock`) để tua bộ đếm tức thì, và thay `speechSynthesis` bằng bản ghi lại câu đọc.
GitHub Actions (`.github/workflows/playwright.yml`) tự chạy test mỗi lần push hoặc mở pull request.
