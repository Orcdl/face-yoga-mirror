# Gương Yoga Mặt — Face Yoga Mirror

Web app luyện Face Yoga cá nhân trong **một file duy nhất**: `face-yoga.html`.
Mở file bằng Chrome, Edge, Safari hoặc Firefox là dùng được, không cần cài đặt.

- Gương soi trực tiếp từ camera trước (lật ngang như gương) + lưới căn chỉnh khuôn mặt
- Bộ đếm Chuẩn bị → Giữ → Nghỉ với vòng tiến trình, chuông (Web Audio API) và giọng đọc VI/EN
- 45 bài tập, 3 lộ trình mục tiêu, bộ lọc theo vùng, playlist tuỳ chỉnh
- 40 bài có video YouTube người thật làm mẫu, phát ngay trong app (bấm ảnh để tải trình phát); bài còn lại có nút tìm video
- Video tiếng Việt theo vùng: Má & Rãnh cười (12 bài, 18 video) và Mắt & lông mày (6 bài, 11 video). Mỗi bài phát sẵn video có bài đó từ đúng giây, có nút nhảy theo chapter và danh sách video khác của nhóm

> Camera chỉ hoạt động qua HTTPS, `localhost` hoặc khi mở file trực tiếp trên máy.
> Video YouTube nhúng chạy tốt nhất khi mở qua HTTPS (ví dụ GitHub Pages); nếu trình phát báo lỗi khi mở file trực tiếp, dùng nút "Mở trên YouTube".

Video là của các kênh YouTube bên thứ ba, được chọn theo tên bài và đã kiểm tra là còn tồn tại và cho phép nhúng (11/2026). Danh sách nằm trong trường `video` của từng bài trong `EXERCISES`; video tiếng Việt theo nhóm nằm trong `VI_VIDEO_GROUPS` (kiểm tra ngày 18/11/2026), mỗi video ghi bài nào có trong video và từ giây nào trong trường `exercises`.

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
| `tests/layout.spec.ts` | Trang không bị tràn ngang trên mọi màn hình (cần Tailwind tải được từ CDN) |

Test dùng đồng hồ giả (`page.clock`) để tua bộ đếm tức thì, và thay `speechSynthesis` bằng bản ghi lại câu đọc.
Khi máy không truy cập được CDN Tailwind, có thể trỏ biến `TAILWIND_SHIM` tới một file JS tự build để test bố cục vẫn chạy.
GitHub Actions (`.github/workflows/playwright.yml`) tự chạy test mỗi lần push hoặc mở pull request.
