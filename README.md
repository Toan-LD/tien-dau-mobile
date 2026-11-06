# Tiền Đâu

App ghi thu chi cá nhân trên điện thoại. Mục tiêu: ghi một khoản thật nhanh (gõ số tiền → chọn mục → Lưu), cuối tháng mở ra biết tiền đã đi đâu.

Bản hiện tại là v1, chạy qua **Expo Go**, ưu tiên Android (code vẫn chạy được trên iOS). Giao diện tiếng Việt, chỉ có chế độ sáng.

## Tính năng

- **Đăng nhập bằng Google** (Supabase OAuth trong trình duyệt nhỏ của app). Phiên được lưu, lần sau mở app không phải đăng nhập lại.
- **Ghi**: chọn Chi/Thu, gõ số tiền bằng bàn phím số riêng của app (có gợi ý `3` → `3.000 | 30.000 | 300.000`), chọn mục, ngày, mô tả. Tạo mục mới ngay trên màn này.
- **Danh sách**: xem theo Ngày / Tuần / Tháng (tuần bắt đầu thứ Hai), lọc theo mục, tổng Đã chi / Đã thu. Bấm vào ô tổng để xem biểu đồ donut theo mục. Vuốt một dòng sang trái để Sửa / Xoá (xoá có Hoàn tác). Bấm vào dòng để mở màn Chi tiết.
- **Báo cáo**: tổng tháng (Còn lại, Thu, Chi), chi và thu theo mục kèm phần trăm. Bấm một mục để xem biểu đồ cột theo tháng với đường trung bình 3 tháng.
- **Hỏi**: hỏi bằng tiếng Việt về chính dữ liệu của bạn ("tháng này tôi chi bao nhiêu cho ăn uống?"). Câu trả lời do một model AI viết, dựa trên số liệu thật đọc từ database. Lịch sử chat chỉ giữ trong bộ nhớ, đóng app là mất. Mỗi ngày có giới hạn số câu hỏi. Cách cài đặt xem [docs/setup.md](docs/setup.md), Phần 7.
- **Cài đặt**: tài khoản đang đăng nhập, Quản lý danh mục (thêm, sửa tên/icon, xoá, kéo để sắp xếp), Đăng xuất. Khi chạy ở chế độ dev có thêm mục "Dữ liệu mẫu".

Những thứ chưa làm ở v1 (nhập bằng AI/giọng nói, nhiều ví, ngân sách, giao dịch định kỳ, bản web, phát hành lên store) được liệt kê trong bản thiết kế.

## Công nghệ

| Phần             | Dùng gì                                                                |
| ---------------- | ---------------------------------------------------------------------- |
| App              | Expo SDK 58, React Native 0.88, React 19.3, TypeScript (strict)        |
| Điều hướng       | Expo Router (route nằm trong `src/app/`), typed routes, React Compiler |
| Dữ liệu          | Supabase (Postgres + Auth + RLS), gọi qua `@supabase/supabase-js`      |
| Chatbot          | Supabase Edge Function `chat` (Deno), model AI qua API kiểu OpenAI     |
| Cache            | TanStack Query                                                         |
| Hiệu ứng, cử chỉ | Reanimated, Gesture Handler                                            |
| Biểu đồ          | `react-native-svg` (donut), `View` thường (cột)                        |
| Kiểm thử         | Jest (`jest-expo`), pgTAP cho database, `deno test` cho Edge Function  |
| Định dạng code   | Prettier + ESLint (`eslint-config-expo`)                               |

Mọi thư viện đều phải chạy được trong Expo Go, nên không dùng thư viện cần development build.

## Bắt đầu

Cần có Node.js, ứng dụng **Expo Go** trên điện thoại, và một project Supabase đã bật đăng nhập Google. Các bước tạo Supabase, Google OAuth client và redirect URL được hướng dẫn chi tiết bằng tiếng Việt trong [docs/setup.md](docs/setup.md).

1. Cài thư viện:

    ```bash
    npm install
    ```

2. Tạo file `.env.local` từ mẫu `.env.example` rồi điền URL và **publishable key** của project Supabase (không bao giờ dùng `service_role` key):

    ```dotenv
    EXPO_PUBLIC_SUPABASE_URL=https://<PROJECT_REF>.supabase.co
    EXPO_PUBLIC_SUPABASE_KEY=<PUBLISHABLE_KEY>
    ```

3. Chạy dev server rồi quét mã QR bằng Expo Go:

    ```bash
    npm run start:phone
    ```

    Lệnh này dùng tên miền dạng `<ip>.sslip.io` thay cho địa chỉ IP, vì Supabase không chấp nhận redirect URL là IP. Nếu chạy `npx expo start` thường thì app vẫn mở được nhưng đăng nhập Google sẽ lỗi.

## Lệnh thường dùng

```bash
npm run start:phone     # dev server cho Expo Go trên điện thoại
npx expo lint           # kiểm tra lint (lỗi định dạng Prettier cũng tính là lỗi)
npm run format          # định dạng lại toàn bộ code (format:check để chỉ kiểm tra)
npx tsc --noEmit        # kiểm tra kiểu TypeScript
npm test                # unit test
npm run test:fn         # test của Edge Function (Deno)
npm run check:fn        # kiểm tra kiểu của Edge Function
npx expo install <pkg>  # thêm thư viện (chọn đúng phiên bản hợp với SDK 58)
```

Database cục bộ (cần Docker):

```bash
npx supabase start && npx supabase db reset   # dựng database từ các migration
npx supabase test db                          # chạy test pgTAP trong supabase/tests/database
```

Sau khi đổi schema, sinh lại kiểu TypeScript cho database:

```bash
npx supabase gen types typescript --remote --schema public > src/lib/database.types.ts
```

## Cấu trúc thư mục

```text
src/
  app/            Các màn hình (mỗi file là một route)
    (tabs)/       Ghi (index) · Danh sách (today) · Báo cáo (report) · Hỏi (ask) · Cài đặt (settings)
    transaction/  Chi tiết và Sửa một khoản
    categories.tsx, login.tsx
  components/     Component theo từng màn, và ui/ cho các khối dùng chung
  constants/      Màu sắc, khoảng cách (theme.ts), hiệu ứng (motion.ts)
  hooks/
  lib/            Toàn bộ truy cập Supabase, query, xử lý tiền và ngày
supabase/
  functions/      Edge Function (Deno): chat/ và _shared/ (module thuần có test)
  migrations/     Schema database (không sửa migration đã chạy, chỉ thêm file mới)
  tests/          Test pgTAP
docs/
  setup.md        Hướng dẫn cài đặt từng bước
  mockups/        Mockup giao diện đã duyệt
  superpowers/    Bản thiết kế (spec) và kế hoạch
```

## Quy ước chính

- Màn hình và component **không gọi `supabase` trực tiếp**; mọi truy cập đều qua `src/lib/`, và màn hình đọc dữ liệu qua TanStack Query (`src/lib/queries.ts`).
- **Tiền** là số nguyên dương VND, hiển thị dạng `30.000 đ`. Dấu `+`/`−` chỉ để hiển thị, lấy từ loại khoản (thu/chi).
- **Ngày** là chuỗi `YYYY-MM-DD` theo giờ máy (hàm trong `src/lib/dates.ts`). Không dùng `toISOString()` vì nó lùi ngày trước 7 giờ sáng ở UTC+7.
- **Không viết style inline**: style đặt trong `StyleSheet.create` ở cuối file.
- **Giao diện**: màu trung tính, icon nét một màu xám đậm. Không gradient, không emoji, không hiệu ứng kính.
- Mỗi bảng có RLS theo `user_id = auth.uid()`, nên mỗi người chỉ thấy dữ liệu của mình. Dữ liệu ban đầu cho người dùng mới (ví mặc định, các mục mặc định) do trigger `handle_new_user` trong database tạo.

Chi tiết hơn về kiến trúc nằm trong [CLAUDE.md](CLAUDE.md).

## Tài liệu

- [docs/setup.md](docs/setup.md): cài Docker, Supabase CLI, Google OAuth, chạy app trên điện thoại.
- [Bản thiết kế chatbot giai đoạn 1](docs/superpowers/specs/2026-11-06-chatbot-phase1-design.md) và [kế hoạch](docs/superpowers/plans/2026-11-06-chatbot-phase1.md).
- [Bản thiết kế v1](docs/superpowers/specs/2026-11-05-expense-app-v1-design.md): mục tiêu, giao diện từng màn, các quyết định kỹ thuật.
- [docs/mockups/](docs/mockups/): mockup HTML đã duyệt. Khi mockup và bản thiết kế khác nhau thì theo bản thiết kế.
