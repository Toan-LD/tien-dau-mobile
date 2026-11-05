# Tiền Đâu — App ghi thu chi cá nhân, bản v1

*Ngày: 2026-11-05 · Trạng thái: đã duyệt. Chủ project đồng ý giữ nguyên các mục [Claude].*

Ký hiệu: **[người dùng]** = chủ project đã quyết. **[Claude]** = Claude tự quyết khi brainstorm, chủ project có thể đổi. Không ghi chú = mô tả chung.

## 1. Mục đích & lý do

Chủ project hiện **không ghi chi tiêu ở đâu cả**. Họ muốn một app để cuối tháng mở ra biết được *tháng qua tiền đã đi đâu*, cả chi lẫn thu. **[người dùng]**

Trước mắt app cho chính họ dùng, nhưng có thể sau này cho người khác dùng. Vì vậy dữ liệu phải tách theo từng người ngay từ đầu. **[người dùng]**

Điều quan trọng nhất là **dùng đơn giản, ghi nhanh**. Chủ project không muốn kiểu "mở form → nhập tiền → chọn mục" rườm rà. Hướng lâu dài là gõ hoặc nói kiểu "cafe 35k" để AI tự hiểu. Phần đó **không làm ở v1**, nhưng thiết kế không được chặn đường cho nó. **[người dùng]**

## 2. Mục tiêu / Không làm / Thất bại

**Mục tiêu v1**
- Đăng nhập bằng Google.
- Ghi một khoản chi hoặc thu trong vài thao tác: gõ số tiền → chọn mục → Lưu.
- Tạo mục mới ngay trên màn ghi.
- Xem, sửa, xoá các khoản theo ngày.
- Báo cáo tháng: tổng thu, chi, còn lại, cùng chi theo mục và thu theo mục.
- Đăng xuất.

**Không làm ở v1** (để sau)
- Nhập bằng ngôn ngữ tự nhiên hoặc giọng nói qua AI.
- Nhiều ví, chọn ví, chuyển tiền giữa các ví. Bảng `wallets` có sẵn nhưng UI không đụng tới.
- Ngân sách (`budgets`), giao dịch định kỳ (`recurring_transactions`), ảnh hoá đơn (`receipt_url`).
- Mục con (`categories.parent_id`).
- Quản lý mục: đổi tên, đổi icon, xoá, sắp xếp. **[người dùng]**: "để tôi xem nó như nào đã rồi làm thêm".
- Đăng nhập bằng email/mật khẩu, đăng nhập ẩn danh, Google Sign-In native.
- Biểu đồ chi theo ngày. Đã cân nhắc và bỏ. **[người dùng]**
- Chạy trên web. Template có cấu hình web, nhưng v1 chỉ nhắm iOS/Android. **[Claude]**
- Build app cài đặt (EAS build, APK, TestFlight), đặt tên và icon cho app, phát hành lên store. Khi nào app ổn định thì chủ project mới làm. **[người dùng]**

**Thất bại dù vẫn "chạy được"** (anti-goals)
- Ghi một khoản mà phải bấm nhiều bước, hoặc phải mở form dài.
- Giao diện sặc sỡ, "nhìn như AI tạo ra": gradient, màu tím neon, emoji tràn lan, hiệu ứng kính. **[người dùng]**
- Người dùng này thấy được dữ liệu của người dùng khác.
- Tổng tiền trong báo cáo bị lệch, ví dụ mất khoản khi xoá mục.

## 3. Ràng buộc

- **Expo SDK 58**, Expo Router (routes trong `src/app/`), React 19.3, RN 0.88, TypeScript. Project hiện vẫn là template mặc định, chưa có màn hình nào của app. Template đang dùng `NativeTabs` từ `expo-router/native-tabs`.
- Làm theo `AGENTS.md`: tra docs Expo bản v58 trước khi dùng bất kỳ API Expo/RN nào. Dùng `npx expo install` để thêm package. Chạy `npx expo lint` và `npx tsc --noEmit` trước khi báo xong.
- **Phải chạy được trong Expo Go.** Chủ project mới làm quen React Native và Supabase, nên không dùng thư viện cần development build. **[Claude]**
- Đã có trong `package.json` (chưa commit): `@supabase/supabase-js`, `@react-native-async-storage/async-storage`, `react-native-url-polyfill`, `react-native-gesture-handler`, `react-native-reanimated`.
- **Supabase** là backend duy nhất, app gọi thẳng bằng supabase-js. Schema đã tồn tại trên project Supabase của chủ project (xem §6).
- Tiền tệ: **VND, số nguyên**, không có phần lẻ. Hiển thị theo kiểu `30.000 đ`. Ngôn ngữ giao diện: **tiếng Việt**. **[Claude]**
- Chủ project là người mới. Mọi bước cài đặt họ phải tự làm (Google Cloud, Supabase Dashboard, Supabase CLI) cần có **hướng dẫn từng bước bằng tiếng Việt**, đặt trong `docs/setup.md`. **[Claude]**
- **Tình trạng Supabase:** chủ project cho biết chưa có user và chưa có dữ liệu **[người dùng]**. Schema thực tế đã lấy về `supabase/migrations/20261105103009_initial_schema.sql` (2026-11-05). Trên server đã có sẵn những thứ sau:
  - **RLS đã bật trên cả 6 bảng nhưng chưa có policy nào.** Tức là app chưa đọc hay ghi được gì cho tới khi thêm policy (§5.4).
  - Trigger `on_auth_user_created` → `handle_new_user()`, **hiện chỉ tạo `profiles`**. Cần sửa hàm này bằng `CREATE OR REPLACE`, không tạo trigger mới (§5.3).
  - Trigger `set_updated_at` trên các bảng, và event trigger `rls_auto_enable` (tự bật RLS cho bảng mới trong `public`).
  - Enum `transaction_type` có các giá trị `income`, `expense`, `transfer`. `transactions.category_id` đã là `ON DELETE SET NULL`. `transactions.wallet_id` là `ON DELETE RESTRICT`.
  - Không có trigger cập nhật `wallets.balance`.

  Không cần migration bổ sung dữ liệu cho user cũ hay chuyển đổi icon emoji. Đây là project duy nhất, nhưng hiện trống nên migration chạy thẳng lên đó được.
- **Ai chạy Supabase CLI [Claude]:** chủ project tự chạy `supabase login` và `supabase link` một lần (có hướng dẫn trong `docs/setup.md`). Sau đó builder chạy `db pull` và `db push` trên máy này.
- **Cách dùng ở v1 [người dùng]:** "làm cho tôi xài trước, ổn định thì release". v1 chỉ cần **chạy qua Expo Go** trên điện thoại của chủ project. **Máy chính là Android [người dùng]**, nên mọi thứ phải được kiểm tra trên Android trước. iOS tính sau ("nào có tiền thì chuyển sang iOS"). Code vẫn viết theo kiểu chạy được trên cả hai nền tảng, không dùng API chỉ có trên Android. Redirect OAuth phải chạy được với URL `exp://…` của Expo Go, mà địa chỉ này đổi theo IP mạng LAN, nên cấu hình redirect trên Supabase dùng wildcard. **[Claude]**

## 4. Giao diện & trải nghiệm

### 4.1 Phong cách chung **[người dùng]** (chi tiết: **[Claude]**)
- Màu trung tính: nền trắng ngà (khoảng `#fafaf9`), chữ gần đen (khoảng `#1c1917`), viền xám nhạt, nút chính màu đen. Không gradient. Màu nhấn duy nhất là đỏ trầm cho nút Xoá.
- **Icon nét (line icon), một màu xám đậm** cho mọi mục. Không dùng emoji. **[người dùng]**
- **Chỉ có giao diện sáng ở v1.** **[Claude]**: giữ đơn giản. Template đang tự đổi theo chế độ tối của máy, cần khoá về sáng.

### 4.2 Điều hướng
- Màn **Đăng nhập** khi chưa đăng nhập. Đã đăng nhập thì vào thẳng app. Phiên đăng nhập được lưu lại, mở app lần sau không phải đăng nhập lại.
- Có 3 tab dưới cùng: **Ghi · Hôm nay · Báo cáo**. Mở app thì vào tab **Ghi**. **[người dùng]** (tên tab: **[Claude]**)
- Nút bánh răng ở góc trên trang Báo cáo mở trang **Cài đặt**. **[Claude]**

### 4.3 Màn Đăng nhập
- Tên app và một nút **"Đăng nhập bằng Google"**. Không có gì khác. **[người dùng]**: chỉ Google.
- Luồng: mở trang đăng nhập Google trong trình duyệt nhỏ, xong thì quay về app (Supabase OAuth, xem §5.2).

### 4.4 Tab Ghi: màn ghi một khoản (màn quan trọng nhất) **[người dùng]**
Từ trên xuống:
1. Nút chuyển **Chi / Thu**, mặc định là Chi. Danh sách mục bên dưới chỉ hiện mục cùng loại.
2. **Số tiền**, chữ to, căn phải, có hậu tố `đ`. Khi chưa nhập thì hiện mờ.
3. Dòng nhỏ: **"Hôm nay"**, bấm vào để chọn ngày khác, và **"Thêm mô tả"**, bấm vào để nhập mô tả tuỳ ý (lưu vào `transactions.note`).
4. **Lưới mục** 4 cột (chủ project đổi từ 3 cột ngày 2026-11-05 vì ô quá to): icon và tên, mục đang chọn có viền đậm. Ô cuối cùng là **"+ Mục mới"** viền nét đứt.
5. **Dòng gợi ý số tiền**, nằm ngay trên bàn phím (xem quy tắc bên dưới).
6. **Nút "Lưu"** (chữ chỉ là "Lưu"), **chỉ hiện khi đã có số tiền > 0 và đã chọn mục**. Thứ tự chọn không quan trọng.
7. **Bàn phím số tự làm**, không dùng bàn phím hệ thống: `1–9`, `000`, `0`, `⌫`. **Mặc định ẩn**: chỉ hiện khi người dùng chạm vào ô số tiền; chọn mục hoặc bấm nút thu gọn thì ẩn đi (chủ project đổi ngày 2026-11-05).

**Phím ⌫ [người dùng]:** bấm một lần xoá một chữ số. **Giữ 2 giây thì xoá hết** số tiền.

**Gợi ý số tiền [người dùng]:** gõ `3` thì hiện `3.000 | 30.000 | 300.000`. Quy tắc là số đã gõ nhân 1.000, 10.000 và 100.000. Gõ `35` thì ra `35.000 | 350.000 | 3.500.000`.
- Bấm một gợi ý: số tiền được thay bằng giá trị đó, **dòng gợi ý ẩn đi**. **[người dùng]**
- Khi nào gợi ý hiện lại **[Claude]**: chỉ hiện khi số đang gõ **nhỏ hơn 1.000** (vì nhỏ hơn 1.000 đồng thì gần như chắc chắn người dùng đang gõ tắt) **và** người dùng chưa chọn gợi ý. Xoá về 0 rồi gõ lại thì gợi ý hiện lại.
- Giới hạn trên **[Claude]**: không cho nhập quá 999.999.999.999. Gợi ý nào vượt giới hạn thì không hiện.

**Sau khi bấm Lưu [Claude]:**
- Màn hình trống lại, giữ nguyên chế độ Chi/Thu và ngày đang chọn.
- Một dòng báo nhỏ "Đã lưu" hiện khoảng một giây.
- Nếu lưu lỗi, ví dụ mất mạng: giữ nguyên dữ liệu đã nhập, báo lỗi ngắn gọn để người dùng bấm Lưu lại. v1 **không** có hàng đợi offline.

**Tạo mục mới [người dùng duyệt mockup]:** bấm "+ Mục mới" thì một **bottom sheet** trượt lên, vẫn ở màn Ghi và số tiền đang gõ không mất.
- Bên trong có: ô **tên mục** và **lưới icon** khoảng 30–40 icon nét cùng kiểu. Không chọn icon thì dùng icon "…" mặc định. Nút **"Tạo mục"** chỉ bấm được khi tên không trống.
- Loại mục (chi/thu) lấy theo nút Chi/Thu đang bật.
- Tạo xong thì sheet đóng lại, **mục mới được chọn sẵn**, và được thêm vào cuối lưới.
- Tên trùng với mục đang có cùng loại: báo "Mục đã có" và không tạo. **[Claude]**

**Thứ tự mục trong lưới [Claude]:** theo `sort_order`, cố định, **không** tự xếp theo tần suất dùng, để vị trí không nhảy lung tung. Lưới dài quá thì cuộn được.

### 4.5 Tab Hôm nay **[người dùng]**
- Đầu trang: **"Hôm nay, 05/11"** với ‹ › để chuyển ngày. Không cho chuyển tới ngày tương lai. **[Claude]**
- Hai ô **Đã chi** và **Đã thu** của ngày đang xem. **[Claude]**
- Danh sách các khoản có `transaction_date` bằng ngày đang xem, **khoản mới tạo nằm trên cùng** (sắp theo `created_at` giảm dần). **[người dùng]**
- Mỗi dòng: icon, tên mục, mô tả (dòng hai, cắt bớt nếu dài), số tiền (chi có dấu `−`, thu có dấu `+`), giờ tạo.
- **Bấm vào một dòng** thì mở **màn Sửa**: chính là màn Ghi được điền sẵn số tiền, loại, mục, ngày và mô tả. Có nút **"Lưu"** và thêm nút **"Xoá khoản này"** ở cuối. **[Claude, người dùng đồng ý]**
- **Vuốt dòng sang trái** thì hiện 2 nút **Sửa** và **Xoá**. **[người dùng]**
- **Gợi ý vuốt:** lần đầu tiên mở tab này mà có ít nhất một dòng, dòng trên cùng tự trượt sang trái khoảng một giây cho lộ hai nút rồi trượt về. Chỉ chạy **một lần mỗi máy** (ghi nhớ bằng AsyncStorage). **[Claude, người dùng đồng ý]**
- **Xoá:** xoá ngay, kèm thông báo "Đã xoá … · **Hoàn tác**" trong khoảng 5 giây, không hỏi xác nhận. **[Claude]** Cách làm hoàn tác để builder quyết.
- Ngày không có khoản nào: hiện một dòng chữ nhẹ, ví dụ "Chưa có khoản nào".
- Sửa một khoản sang ngày khác thì khoản đó biến khỏi danh sách đang xem.

### 4.6 Tab Báo cáo **[người dùng chọn các phần 1, 2, 4 trên mockup]**
- Chọn tháng bằng ‹ ›, mặc định tháng hiện tại. Không cho chuyển tới tháng tương lai. **[Claude]**
- **Tổng tháng:** ô lớn **Còn lại (thu − chi)**, bên dưới là hai ô **Thu** và **Chi**. Chỉ là số, không có biểu đồ.
- **Chi theo mục:** thanh ngang, **một màu xám đậm**, xếp từ lớn đến nhỏ. Mỗi dòng có icon, tên mục, thanh dài theo tỉ lệ với mục lớn nhất, và số tiền dạng rút gọn (`2,5tr`, `450k`). **[Claude]**: dùng thanh xếp hạng thay vì biểu đồ tròn vì dễ so sánh hơn và hợp phong cách một màu.
- **Thu theo mục:** cách hiển thị giống hệt.
- Các khoản không có mục (`category_id` null) gom vào dòng **"Không phân loại"**. **[Claude]**
- Bấm một mục: mở danh sách các khoản của mục đó trong tháng, dùng cùng kiểu dòng như tab Hôm nay. **[Claude, tuỳ chọn]**: nếu tốn công thì để sau.
- Tháng không có dữ liệu: các số hiện 0, các phần biểu đồ hiện một dòng chữ nhẹ.
- Biểu đồ đơn giản, vẽ bằng `View` là đủ, **không cần thư viện chart**. **[Claude]**

### 4.7 Trang Cài đặt **[người dùng]**
- Hiện tên hoặc email Google đang đăng nhập **[Claude]**, cùng nút **Đăng xuất**.
- Không có gì khác ở v1.

## 5. Kỹ thuật

### 5.1 Nơi đặt schema **[Claude, người dùng không phản đối]**
- Thư mục `supabase/` nằm trong repo này, quản lý bằng **Supabase CLI**: `supabase/migrations/` và `supabase/seed.sql` nếu cần.
- **Migration đầu tiên phải lấy đúng schema đang có trên server** (ví dụ dùng `supabase db pull`), không viết tay lại từ đoạn SQL người dùng dán, vì đoạn đó ghi rõ "for context only" và thiếu định nghĩa enum cùng index.
- Kiểm tra hành vi `ON DELETE` của khoá ngoại `transactions.category_id`. Nếu chưa phải `SET NULL` thì đổi thành `SET NULL`, để sau này xoá mục không làm mất giao dịch. **[Claude]**
- Các thay đổi của v1 (RLS, trigger, seed) là những migration nối tiếp sau đó.

### 5.2 Đăng nhập **[người dùng: chỉ Google; Claude: luồng trình duyệt]**
- Dùng Supabase OAuth provider Google, mở bằng trình duyệt trong app (expo-web-browser hoặc API tương đương của SDK 58, **tra docs**). Bắt redirect bằng deep link scheme `tiendaumobile` (đã có trong `app.json`) và cả URL kiểu `exp://` khi chạy trong Expo Go.
- Phiên đăng nhập lưu bằng AsyncStorage qua supabase-js, tự làm mới token.
- `docs/setup.md` phải hướng dẫn: tạo OAuth Client ID (loại Web) trên Google Cloud Console; bật provider Google trong Supabase rồi dán Client ID và Secret; thêm redirect URL của app vào Supabase (Auth → URL Configuration).
- Cấu hình Supabase URL và **publishable key** (`sb_publishable_…`; anon key là kiểu cũ, Supabase sẽ bỏ dần) qua `EXPO_PUBLIC_SUPABASE_URL` và `EXPO_PUBLIC_SUPABASE_KEY` trong file `.env.local`. File này đã nằm trong `.gitignore`. Có thêm `.env.example` để mẫu. Tuyệt đối không dùng secret/service_role key trong app.
- Supabase CLI được cài làm devDependency và chạy bằng `npx supabase …`. Lệnh `db pull` cần Docker. Hướng dẫn cài đặt nằm ở `docs/setup.md`.

### 5.3 Khởi tạo dữ liệu cho người dùng mới **[Claude]**
Khi có user mới trong `auth.users`, một trigger trong database tự tạo:
- Một dòng `profiles`: `full_name` và `avatar_url` lấy từ metadata Google.
- Một **ví mặc định** trong `wallets` (ví dụ tên "Ví chính", loại tiền mặt). UI v1 không bao giờ hiện ví. Mọi giao dịch đều gắn vào ví này, vì `transactions.wallet_id` là NOT NULL.
- **Bộ mục mặc định** trong `categories`, có `icon` là key của icon (xem §5.5):
  - Chi: Ăn uống, Cà phê, Đi lại, Mua sắm, Hoá đơn, Nhà cửa, Giải trí, Sức khoẻ, Gia đình, Học tập, Khác.
  - Thu: Lương, Thưởng, Được cho/tặng, Khác.

Làm trong database chứ không làm ở app, để sau này có client khác (web, AI) thì dữ liệu vẫn nhất quán. Trigger cần idempotent, không tạo trùng nếu đã có.

### 5.4 Bảo mật dữ liệu **[người dùng: mỗi người chỉ thấy dữ liệu của mình]**
- Bật **RLS** trên mọi bảng public, policy là `user_id = auth.uid()` (bảng `profiles` dùng `id = auth.uid()`) cho select, insert, update và delete.
- Kiểm tra cả khoá ngoại: không để user gắn giao dịch vào ví hoặc mục của user khác.

### 5.5 Mục & icon
- `categories.icon` lưu **key icon dạng chữ** (ví dụ `"coffee"`, `"car"`), không lưu emoji. Giá trị mặc định `'📁'` trong schema nên đổi thành key mặc định qua migration. **[Claude]**
- App giữ một bảng ánh xạ cố định từ key sang icon. Key lạ thì dùng icon "…".
- `categories.color` không dùng ở v1.
- Chọn thư viện icon là việc của builder. Yêu cầu: kiểu nét (outline), một màu, đủ khoảng 30–40 icon cho chủ đề chi tiêu, **chạy được trong Expo Go**, và ưu tiên thứ Expo khuyến nghị.
- Xoá mục chưa có ở v1. Khi làm sau, giao dịch cũ sẽ để `category_id` null và hiện là "Không phân loại".

### 5.6 Giao dịch
- `type` lấy từ enum đang có: chi hoặc thu. Giá trị enum chính xác lấy từ schema đã pull. v1 không tạo loại chuyển khoản.
- `amount` > 0, luôn lưu số dương. Dấu chỉ để hiển thị.
- `transaction_date` là ngày người dùng chọn (mặc định hôm nay theo giờ máy). `created_at` dùng để sắp thứ tự và hiện giờ.
- **Cột `wallets.balance`:** v1 không hiện số dư. Nếu trên server đã có trigger tự cập nhật balance thì giữ nguyên. Nếu chưa có thì **không** cần làm ở v1. **[Claude]**

### 5.7 Để sẵn đường cho AI sau này **[Claude]**
- Logic "tạo một giao dịch" (kiểm tra, ví mặc định, mục) gói trong một hàm hoặc module riêng, không viết lẫn trong màn hình, để sau này phần AI gọi lại được.
- Code AI sau này dự kiến nằm ở `supabase/functions/` (Edge Functions).

## 6. Schema hiện có (tham khảo)

Các bảng có sẵn trên server: `profiles`, `wallets`, `categories`, `transactions`, `budgets`, `recurring_transactions`. Mọi bảng gắn với `auth.users` qua `user_id` (riêng `profiles` dùng `id`). v1 chỉ dùng `profiles`, `wallets` (một ví ẩn), `categories` và `transactions`. Định nghĩa đầy đủ thì lấy từ server bằng Supabase CLI (§5.1).

## 7. Để builder tự quyết
- Cấu trúc thư mục ngoài `src/app/`: components, hooks, lib.
- Cách quản lý state và fetch dữ liệu, có dùng thư viện cache hay không.
- Thư viện icon (trong ràng buộc §5.5), cách làm bottom sheet, cách làm swipe (gesture-handler đã có sẵn), cách làm toast và hoàn tác.
- Chi tiết khoảng cách, cỡ chữ, miễn sao giữ đúng phong cách §4.1. Các mockup đã duyệt nằm ở `docs/mockups/`. Chúng chỉ để tham khảo, khi khác với tài liệu này thì làm theo tài liệu (danh sách chỗ khác nằm trong `docs/mockups/README.md`).
- Dọn các file mẫu của template (`explore.tsx`, các component demo).
- Phạm vi test: logic gợi ý số tiền, định dạng VND và tổng hợp báo cáo là những phần đáng viết unit test.
