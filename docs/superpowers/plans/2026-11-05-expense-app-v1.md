# Tiền Đâu v1 — Kế hoạch triển khai

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây bản v1 của app ghi thu chi theo bản thiết kế: đăng nhập Google, ghi khoản bằng bàn phím số và gợi ý số tiền, danh sách theo ngày (sửa, xoá, hoàn tác), báo cáo tháng, đăng xuất.

**Architecture:**
- App Expo Router gọi thẳng Supabase bằng supabase-js.
- Logic thuần nằm trong `src/lib/` và có unit test: số tiền, ngày, gợi ý, tổng hợp báo cáo.
- Truy cập dữ liệu gói trong module `src/lib/categories.ts` và `src/lib/transactions.ts`. Màn hình không gọi Supabase trực tiếp.
- Bảo mật và khởi tạo dữ liệu người mới làm trong database, gồm RLS và trigger `handle_new_user`.
- Mỗi màn tự tải lại dữ liệu khi được focus (`useFocusEffect`). Không dùng thư viện state hay cache.

**Tech Stack:**
- Expo SDK 58, Expo Router, React 19.3, RN 0.88, TypeScript strict.
- `@supabase/supabase-js` 2.x, AsyncStorage, `expo-web-browser`, `expo-linking`.
- `@expo/vector-icons` (Ionicons, chỉ dùng các biến thể `-outline`).
- `react-native-gesture-handler` (`ReanimatedSwipeable`), `@react-native-community/datetimepicker`.
- `jest-expo`, Supabase CLI v3 (pgTAP qua `supabase test db`).

**Spec:** `docs/superpowers/specs/2026-11-05-expense-app-v1-design.md`. Đọc cùng `docs/mockups/` và `docs/mockups/README.md`. Khi mockup khác spec thì làm theo spec.

## Global Constraints

- **Trước khi dùng bất kỳ API nào của Expo, Expo Router hay RN**, tra docs bản v58 tại `https://docs.expo.dev/versions/v58.0.0/` (theo `AGENTS.md`). Không viết theo trí nhớ.
- Thêm package bằng `npx expo install <pkg>`. Dev dependency thì dùng `npx expo install <pkg> -- --save-dev`. Dùng `npx`, không dùng `bunx`.
- **Chỉ dùng thư viện chạy được trong Expo Go.** Không thêm thứ gì cần development build.
- Kiểm tra trên **Android** trước. Không dùng API chỉ có trên Android. Web nằm ngoài phạm vi.
- **Chỉ có giao diện sáng.** Màu lấy từ `Colors` trong `src/constants/theme.ts` (Task 3). Không gradient, không emoji, không hiệu ứng kính. Icon là Ionicons `-outline` một màu `Colors.icon`.
- Mọi chữ trên giao diện viết bằng tiếng Việt, đúng như spec, ví dụ "Lưu", "Mục mới", "Hoàn tác", "Không phân loại".
- Tiền là **VND số nguyên dương**. Hiển thị dạng `30.000 đ`. Dấu `−` và `+` chỉ để hiển thị. Giới hạn nhập `999_999_999_999`.
- **Ngày luôn tính theo giờ máy**, dạng `YYYY-MM-DD`. **Cấm dùng `toISOString()` để lấy ngày**, vì Việt Nam là UTC+7 nên trước 7 giờ sáng ngày sẽ bị lùi một ngày.
- Lệnh Supabase CLI có kết nối tới database trên server (`db push`, `gen types --linked`, `migration list --remote`) phải chạy **ngoài sandbox** (`dangerouslyDisableSandbox: true`), vì sandbox chặn cổng 5432/6543. Thay đổi trên server cần cờ `--yes`.
- Trước khi báo xong mỗi task: chạy `npx tsc --noEmit`, `npx expo lint` và `npm test`.

## Review Focus

1. **Lệch ngày theo múi giờ.** Ghi lúc 06:30 sáng thì khoản đó phải thuộc *hôm nay*, không phải hôm qua. *(test trong Task 1: `toLocalDateString`)*
2. **Gõ số vượt giới hạn hoặc gõ `000` khi đang là 0.** Số tiền không được vượt `999.999.999.999`, và `0` gõ thêm `000` vẫn là `0`. *(test trong Task 2)*
3. **Hoàn tác sau khi xoá phải khôi phục đúng khoản cũ**, gồm cùng `id`, `created_at`, mục, mô tả, nên thứ tự danh sách không đổi. *(test trong Task 5: `restoreTransaction` gửi lại đủ các cột)*
4. **Người dùng gắn giao dịch vào ví hoặc mục của người khác** bằng cách tự gọi API với id lạ thì phải bị từ chối. *(pgTAP trong Task 4)*
5. **Tạo mục trùng tên nhưng khác hoa thường hoặc có khoảng trắng thừa** (`" ăn uống "` với `Ăn uống`) thì phải báo "Mục đã có". *(unique index + test trong Task 4 và Task 5)*

---

## Cấu trúc file

```
supabase/
  migrations/20261105103009_initial_schema.sql   (đã có, KHÔNG sửa)
  migrations/<ts>_v1_rls_and_signup.sql           Task 4
  tests/database/v1_rls_and_signup.test.sql       Task 4
src/
  app/
    _layout.tsx              root: providers + Stack.Protected (Task 3, 6)
    login.tsx                Task 6
    settings.tsx             Task 6
    transaction/[id].tsx     màn Sửa (Task 9)
    (tabs)/_layout.tsx       Tabs: Ghi · Hôm nay · Báo cáo (Task 3)
    (tabs)/index.tsx         Ghi (Task 8)
    (tabs)/today.tsx         Hôm nay (Task 9)
    (tabs)/report.tsx        Báo cáo (Task 10)
  lib/
    money.ts                 formatVND, formatCompactVND (Task 1)
    dates.ts                 ngày theo giờ máy (Task 1)
    amount-input.ts          reducer bàn phím + gợi ý (Task 2)
    category-icons.ts        key icon → tên Ionicons (Task 3)
    supabase.ts              client (Task 6)
    database.types.ts        sinh bằng CLI (Task 4)
    auth.tsx                 AuthProvider, useAuth (Task 6)
    categories.ts            Task 5
    transactions.ts          Task 5
    report.ts                tổng hợp thuần (Task 5)
    __tests__/*.test.ts
  components/
    category-icon.tsx        Task 3
    ui/bottom-sheet.tsx      Task 7
    ui/toast.tsx             Task 7
    entry/                   entry-form, keypad, category-grid, new-category-sheet, note-sheet (Task 8)
    today/transaction-row.tsx  Task 9
    report/category-bars.tsx   Task 10
  constants/theme.ts         thay palette (Task 3)
```

Xoá các file demo của template trong Task 3: `src/app/index.tsx` (chuyển thành tab Ghi), `src/app/explore.tsx`, `src/components/{animated-icon*,app-tabs*,hint-row,web-badge,external-link,themed-text,themed-view}.tsx`, `src/components/ui/collapsible.tsx`, `src/hooks/use-color-scheme*.ts`, `src/global.css` và các import của nó, `assets/images/tabIcons/`.

---

### Task 1: Test runner + định dạng tiền + tiện ích ngày

**Files:**
- Modify: `package.json` (thêm script `"test": "jest"` và `"jest": { "preset": "jest-expo" }`)
- Create: `src/lib/money.ts`, `src/lib/dates.ts`
- Test: `src/lib/__tests__/money.test.ts`, `src/lib/__tests__/dates.test.ts`

**Interfaces — Produces:**
```ts
// money.ts
export const MAX_AMOUNT = 999_999_999_999;
export function formatVND(amount: number): string;            // 30000 -> "30.000 đ"
export function formatAmountDigits(amount: number): string;   // 30000 -> "30.000" (không hậu tố)
export function formatCompactVND(amount: number): string;     // 2500000 -> "2,5tr"
// dates.ts
export type LocalDate = string; // 'YYYY-MM-DD'
export function toLocalDateString(d: Date): LocalDate;
export function todayLocal(now?: Date): LocalDate;
export function addDays(date: LocalDate, n: number): LocalDate;
export function monthRange(year: number, month: number): { start: LocalDate; end: LocalDate }; // month 1..12
export function formatDayTitle(date: LocalDate, today: LocalDate): string; // "Hôm nay, 05/11" | "Hôm qua, 04/11" | "03/11/2026"
export function formatMonthTitle(year: number, month: number): string;    // "Tháng 11/2026"
export function formatTime(iso: string): string;                          // "07:58" theo giờ máy
```

- [ ] **Step 1: Cài jest.** Chạy `npx expo install jest-expo jest @types/jest -- --save-dev`, rồi thêm script `test` và preset vào `package.json`.
- [ ] **Step 2: Viết test thất bại**

```ts
// money.test.ts
expect(formatVND(30000)).toBe('30.000 đ');
expect(formatVND(0)).toBe('0 đ');
expect(formatVND(1234567)).toBe('1.234.567 đ');
expect(formatAmountDigits(999999999999)).toBe('999.999.999.999');
expect(formatCompactVND(2500000)).toBe('2,5tr');
expect(formatCompactVND(3200000)).toBe('3,2tr');
expect(formatCompactVND(13000000)).toBe('13tr');
expect(formatCompactVND(450000)).toBe('450k');
expect(formatCompactVND(1500)).toBe('1,5k');
expect(formatCompactVND(1200000000)).toBe('1,2 tỷ');
expect(formatCompactVND(800)).toBe('800 đ');
// dates.test.ts
expect(toLocalDateString(new Date(2026, 10, 5, 6, 30))).toBe('2026-11-05'); // 06:30 giờ máy
expect(addDays('2026-11-01', -1)).toBe('2026-10-31');
expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
expect(monthRange(2026, 2)).toEqual({ start: '2026-02-01', end: '2026-02-28' });
expect(monthRange(2028, 2).end).toBe('2028-02-29');
expect(formatDayTitle('2026-11-05', '2026-11-05')).toBe('Hôm nay, 05/11');
expect(formatDayTitle('2026-11-04', '2026-11-05')).toBe('Hôm qua, 04/11');
expect(formatDayTitle('2026-10-03', '2026-11-05')).toBe('03/10/2026');
expect(formatMonthTitle(2026, 11)).toBe('Tháng 11/2026');
```

- [ ] **Step 3: Chạy `npm test`.** Kết quả mong đợi: FAIL vì chưa có module.
- [ ] **Step 4: Viết code** cho `money.ts` và `dates.ts`.
  - Định dạng nghìn bằng tay (thêm dấu `.` mỗi 3 chữ số), không dựa vào `Intl`, vì Hermes trên Android có thể thiếu locale `vi-VN`.
  - Compact: số `≥ 1e9` → `x tỷ`; `≥ 1e6` → `xtr`; `≥ 1e3` → `xk`. Giữ tối đa 1 chữ số thập phân, bỏ `,0`, dấu thập phân là `,`.
  - Ngày: dựng từ `getFullYear/getMonth/getDate`.
- [ ] **Step 5: Chạy `npm test`.** Kết quả mong đợi: PASS.
- [ ] **Step 6: Commit** `feat: add money and date helpers with jest setup`

---

### Task 2: Logic bàn phím số và gợi ý số tiền

**Files:**
- Create: `src/lib/amount-input.ts`
- Test: `src/lib/__tests__/amount-input.test.ts`

**Interfaces — Consumes:** `MAX_AMOUNT` (Task 1). **Produces:**
```ts
export type AmountState = { value: number; suggestionPicked: boolean };
export type AmountAction =
  | { type: 'digit'; digit: 0|1|2|3|4|5|6|7|8|9 }
  | { type: 'tripleZero' }
  | { type: 'backspace' }
  | { type: 'clear' }
  | { type: 'pick'; value: number }
  | { type: 'set'; value: number }; // nạp sẵn khi sửa, coi như đã chọn (suggestionPicked: true)
export const initialAmount: AmountState; // { value: 0, suggestionPicked: false }
export function amountReducer(s: AmountState, a: AmountAction): AmountState;
export function amountSuggestions(s: AmountState): number[];
```

Quy tắc (spec §4.4):
- `digit` và `tripleZero`: nếu kết quả vượt `MAX_AMOUNT` thì giữ nguyên.
- `backspace` bỏ chữ số cuối. `clear` đưa về 0.
- Khi `value` về 0 thì `suggestionPicked = false`.
- `amountSuggestions` trả `[]` nếu `suggestionPicked`, nếu `value === 0`, hoặc nếu `value >= 1000`. Ngược lại trả `[v*1e3, v*1e4, v*1e5]`, bỏ các số vượt `MAX_AMOUNT`.

- [ ] **Step 1: Viết test thất bại**

```ts
const typed = (...ds: number[]) => ds.reduce((s, d) => amountReducer(s, { type: 'digit', digit: d as any }), initialAmount);
expect(amountSuggestions(typed(3))).toEqual([3000, 30000, 300000]);
expect(amountSuggestions(typed(3, 5))).toEqual([35000, 350000, 3500000]);
const picked = amountReducer(typed(3), { type: 'pick', value: 30000 });
expect(picked).toEqual({ value: 30000, suggestionPicked: true });
expect(amountSuggestions(picked)).toEqual([]);
expect(amountSuggestions(typed(3, 5, 0, 0, 0))).toEqual([]);                  // >= 1000
expect(amountReducer(typed(1, 2), { type: 'backspace' }).value).toBe(1);
const cleared = amountReducer(picked, { type: 'clear' });
expect(cleared).toEqual(initialAmount);
expect(amountSuggestions(amountReducer(cleared, { type: 'digit', digit: 5 }))).toEqual([5000, 50000, 500000]);
expect(amountReducer(initialAmount, { type: 'tripleZero' }).value).toBe(0);
expect(amountReducer(initialAmount, { type: 'digit', digit: 0 }).value).toBe(0);
const max = amountReducer(initialAmount, { type: 'set', value: 999_999_999_999 });
expect(amountReducer(max, { type: 'digit', digit: 1 }).value).toBe(999_999_999_999);
expect(amountSuggestions(typed(9, 9, 9))).toEqual([999000, 9990000, 99900000]);
expect(amountReducer(initialAmount, { type: 'set', value: 45000 })).toEqual({ value: 45000, suggestionPicked: true });
```

- [ ] **Step 2: Chạy `npm test -- amount-input`.** Kết quả mong đợi: FAIL.
- [ ] **Step 3: Viết code** theo đúng quy tắc trên.
- [ ] **Step 4: Chạy `npm test`.** Kết quả mong đợi: PASS.
- [ ] **Step 5: Commit** `feat: add amount keypad reducer and suggestions`

---

### Task 3: Khung app — giao diện sáng, palette, 3 tab, icon, dọn template

**Files:**
- Modify: `app.json` (`userInterfaceStyle: "light"`), `src/constants/theme.ts`, `src/hooks/use-theme.ts`
- Create: `src/app/(tabs)/_layout.tsx`, `src/app/(tabs)/index.tsx`, `src/app/(tabs)/today.tsx`, `src/app/(tabs)/report.tsx` (tạm thời mỗi màn chỉ hiện tiêu đề), `src/lib/category-icons.ts`, `src/components/category-icon.tsx`
- Rewrite: `src/app/_layout.tsx`
- Delete: các file template liệt kê ở mục "Cấu trúc file"
- Test: `src/lib/__tests__/category-icons.test.ts`

**Interfaces — Produces:**
```ts
// theme.ts: chỉ một palette, KHÔNG còn light/dark
export const Colors: {
  background: '#fafaf9'; surface: '#ffffff'; text: '#1c1917'; textSecondary: '#78716c';
  textMuted: '#a8a29e'; border: '#e7e5e4'; borderStrong: '#1c1917'; icon: '#44403c';
  primary: '#1c1917'; onPrimary: '#ffffff'; danger: '#9f1239'; segment: '#e7e5e4';
};
export const Spacing; // giữ nguyên các giá trị của template
// use-theme.ts
export function useTheme(): typeof Colors;
// category-icons.ts
export const DEFAULT_ICON_KEY = 'ellipsis';
export const CATEGORY_ICON_KEYS: readonly string[]; // đúng thứ tự hiện trong lưới chọn icon
export function ioniconFor(key: string | null | undefined): IoniconName; // key lạ -> icon của DEFAULT_ICON_KEY
// category-icon.tsx
export function CategoryIcon(props: { iconKey: string | null | undefined; size?: number; color?: string }): JSX.Element;
```

Bảng key → Ionicons (38 key, đúng thứ tự này):
- `restaurant`, `cafe`, `pizza`, `beer`, `cart`, `basket`, `bag-handle`, `shirt`
- `car`, `bus`, `bicycle`, `airplane`
- `receipt`, `flash`, `water`, `wifi`, `phone-portrait`, `home`, `construct`
- `film`, `game-controller`, `musical-notes`, `tv`
- `medkit`, `fitness`, `heart`, `people`, `paw`
- `school`, `book`, `briefcase`, `wallet`, `cash`, `card`, `gift`, `trophy`, `trending-up`, `ellipsis`

Mỗi key ánh xạ sang `<key>-outline`, riêng `ellipsis` → `ellipsis-horizontal-outline`. Kiểu `IoniconName` lấy từ `keyof typeof Ionicons.glyphMap`, nhờ đó TypeScript sẽ báo lỗi nếu tên icon sai.

- [ ] **Step 1: Cài icon.** Chạy `npx expo install @expo/vector-icons`.
- [ ] **Step 2: Viết test thất bại**

```ts
expect(CATEGORY_ICON_KEYS).toHaveLength(38);
expect(new Set(CATEGORY_ICON_KEYS).size).toBe(38);
expect(ioniconFor('cafe')).toBe('cafe-outline');
expect(ioniconFor('ellipsis')).toBe('ellipsis-horizontal-outline');
expect(ioniconFor('📁')).toBe('ellipsis-horizontal-outline');
expect(ioniconFor(null)).toBe('ellipsis-horizontal-outline');
for (const k of CATEGORY_ICON_KEYS) expect(Ionicons.glyphMap).toHaveProperty(ioniconFor(k));
```

- [ ] **Step 3: Chạy `npm test -- category-icons`.** Kết quả mong đợi: FAIL.
- [ ] **Step 4: Viết `category-icons.ts` và `category-icon.tsx`.** Màu mặc định của icon là `Colors.icon`.
- [ ] **Step 5: Đổi sang giao diện sáng.**
  - `app.json` đặt `"userInterfaceStyle": "light"`.
  - `theme.ts` dùng một palette như trên. Bỏ import `@/global.css`. Bỏ `Fonts` nếu không còn ai dùng.
  - `use-theme.ts` trả về `Colors`.
- [ ] **Step 6: Dựng khung tab.**
  - Root `_layout.tsx` dùng `Stack` (`headerShown: false`) với `ThemeProvider value={DefaultTheme}`, đặt `background` theo `Colors.background`.
  - `(tabs)/_layout.tsx` dùng **`Tabs` từ `expo-router`** (JS tabs, không dùng `NativeTabs`), để icon tab dùng chung Ionicons outline. Thứ tự: `index` "Ghi" (`add-circle-outline`), `today` "Hôm nay" (`list-outline`), `report` "Báo cáo" (`bar-chart-outline`). `headerShown: false`. Màu active là `Colors.text`, màu inactive là `Colors.textMuted`.
- [ ] **Step 7: Xoá file template**, rồi chạy `npx tsc --noEmit` và `npx expo lint`. Kết quả mong đợi: không lỗi. Lần đầu chạy `expo lint` sẽ tự cài ESLint, hãy commit cả cấu hình đó.
- [ ] **Step 8: Kiểm tra bằng tay.** Chạy `npx expo start`, mở Expo Go trên Android. Mong đợi: thấy 3 tab có chữ tiếng Việt, nền trắng ngà. Bật chế độ tối của máy thì app vẫn sáng.
- [ ] **Step 9: Commit** `feat: light-only shell with three tabs and category icons`

---

### Task 4: Database — RLS, khởi tạo người dùng mới, chống trùng tên mục

**Files:**
- Create: `supabase/migrations/<timestamp>_v1_rls_and_signup.sql` (tạo bằng `npx supabase migration new v1_rls_and_signup`)
- Create: `supabase/tests/database/v1_rls_and_signup.test.sql`
- Create: `src/lib/database.types.ts` (sinh tự động)

**Interfaces — Produces:** policy và trigger trên server, cùng type `Database` trong `database.types.ts`. Các task sau dùng `Database['public']['Tables'][...]['Row']`.

Nội dung migration:
1. **Policy cho cả 6 bảng.**
   - `profiles`: `select` và `update` khi `id = auth.uid()`.
   - `wallets`, `categories`, `transactions`, `budgets`, `recurring_transactions`: đủ 4 policy `select`, `insert`, `update`, `delete` cho role `authenticated`, điều kiện `user_id = (select auth.uid())`.
2. **`transactions` insert/update thêm `with check`:** ví thuộc về chính user (`exists (select 1 from public.wallets w where w.id = wallet_id and w.user_id = (select auth.uid()))`), và `category_id is null` hoặc mục thuộc về user. `to_wallet_id` cũng phải null hoặc ví của user.
3. **`create or replace function public.handle_new_user()`.** Đây là hàm đã có, **không tạo trigger mới**.
   - Dùng `security definer` và `set search_path = ''`. Mọi tên bảng viết đầy đủ kèm schema.
   - Tạo profile với `on conflict (id) do nothing`. Tên lấy từ `raw_user_meta_data->>'full_name'`, nếu không có thì lấy `'name'`. Avatar lấy từ `'avatar_url'`, nếu không có thì lấy `'picture'`.
   - Tạo ví `'Ví chính'`, loại `cash`, nếu user chưa có ví nào.
   - Tạo bộ mục mặc định nếu user chưa có mục nào, `sort_order` tăng dần theo thứ tự dưới đây:
     - expense: Ăn uống `restaurant`, Cà phê `cafe`, Đi lại `car`, Mua sắm `bag-handle`, Hoá đơn `receipt`, Nhà cửa `home`, Giải trí `film`, Sức khoẻ `medkit`, Gia đình `people`, Học tập `school`, Khác `ellipsis`.
     - income: Lương `wallet`, Thưởng `trophy`, Được cho/tặng `gift`, Khác `ellipsis`.
4. `alter table public.categories alter column icon set default 'ellipsis';`
5. `create unique index categories_user_type_name_key on public.categories (user_id, type, lower(btrim(name)));`

- [ ] **Step 1: Viết test pgTAP thất bại**, gồm các assertion sau:
  - Tạo user giả bằng cách `insert into auth.users (id, email, raw_user_meta_data)` với `{"full_name":"A"}`. Sau đó có đúng 1 dòng `profiles` với `full_name = 'A'`, 1 ví tên `Ví chính`, 11 mục `expense` và 4 mục `income`.
  - Tạo user B. Giả làm A bằng `set local role authenticated` và `set local request.jwt.claims = '{"sub":"<A>"}'`:
    - `select count(*) from public.categories` bằng 15, tức là không thấy mục của B.
    - Insert transaction với `wallet_id` là ví của B thì `throws_ok`.
    - Insert transaction với `category_id` là mục của B thì `throws_ok`.
    - Insert transaction hợp lệ với ví và mục của A thì `lives_ok`.
    - Insert mục `' ăn uống '` loại `expense` thì `throws_ok` với mã `23505`.
- [ ] **Step 2: Chạy test trên stack local** (cần Docker): `npx supabase start`, rồi `npx supabase db reset`, rồi `npx supabase test db`. Tra `--help` nếu cờ của CLI v3 khác. Kết quả mong đợi: FAIL, vì chưa có migration.
- [ ] **Step 3: Viết migration** theo 5 mục trên.
- [ ] **Step 4: Chạy lại `npx supabase db reset` và `npx supabase test db`.** Kết quả mong đợi: tất cả PASS.
- [ ] **Step 5: Đẩy lên server** (chạy ngoài sandbox, tra `npx supabase db push --help` để biết cờ chọn project trên server của CLI v3): `npx supabase db push --remote --yes`, rồi `npx supabase migration list --remote`. Mong đợi: cả 2 migration đều đã áp dụng trên server.
- [ ] **Step 6: Sinh type** (ngoài sandbox): `npx supabase gen types typescript --linked > src/lib/database.types.ts`, rồi chạy `npx tsc --noEmit`. Kết quả mong đợi: không lỗi.
- [ ] **Step 7: Dừng stack local** bằng `npx supabase stop`, rồi **commit** `feat(db): RLS policies, signup bootstrap, unique category names`

---

### Task 5: Lớp dữ liệu — mục, giao dịch, tổng hợp báo cáo

**Files:**
- Create: `src/lib/supabase.ts`. Tạo client ngay trong task này để lớp dữ liệu có chỗ import. Task 6 mới nối phần phiên đăng nhập vào app.
- Create: `src/lib/categories.ts`, `src/lib/transactions.ts`, `src/lib/report.ts`
- Test: `src/lib/__tests__/report.test.ts`, `src/lib/__tests__/transactions.test.ts`, `src/lib/__tests__/categories.test.ts` (mock `@/lib/supabase`)

**Interfaces — Consumes:** `Database` (Task 4), `LocalDate`, `monthRange` (Task 1). **Produces:**
```ts
// supabase.ts
export const supabase: SupabaseClient<Database>;
// Đọc EXPO_PUBLIC_SUPABASE_URL và EXPO_PUBLIC_SUPABASE_KEY; storage AsyncStorage,
// flowType 'pkce', detectSessionInUrl false, autoRefreshToken true;
// import 'react-native-url-polyfill/auto'; bật/tắt startAutoRefresh theo AppState.

// categories.ts
export type TxType = 'expense' | 'income';
export type Category = { id: string; name: string; icon: string | null; type: TxType; sortOrder: number };
export class DuplicateCategoryError extends Error {}
export function normalizeCategoryName(name: string): string;              // trim + gộp khoảng trắng
export async function listCategories(type: TxType): Promise<Category[]>;  // sắp theo sort_order, created_at
export async function createCategory(input: { name: string; iconKey: string; type: TxType; sortOrder: number }): Promise<Category>;
// lỗi Postgres 23505 -> ném DuplicateCategoryError

// transactions.ts
export type TxCategory = { id: string; name: string; icon: string | null } | null;
export type Transaction = { id: string; type: TxType; amount: number; categoryId: string | null; category: TxCategory;
  note: string | null; date: LocalDate; createdAt: string; walletId: string };
export type TransactionDraft = { type: TxType; amount: number; categoryId: string; date: LocalDate; note: string | null };
export async function createTransaction(d: TransactionDraft): Promise<Transaction>;   // tự tìm ví mặc định
export async function updateTransaction(id: string, d: TransactionDraft): Promise<Transaction>;
export async function deleteTransaction(id: string): Promise<void>;
export async function restoreTransaction(t: Transaction): Promise<void>;  // insert lại đúng id, created_at, wallet_id, ...
export async function getTransaction(id: string): Promise<Transaction | null>;
export async function listTransactionsForDay(date: LocalDate): Promise<Transaction[]>;        // created_at giảm dần
export async function listTransactionsForMonth(year: number, month: number): Promise<Transaction[]>;
export function validateDraft(d: TransactionDraft): string | null; // null = hợp lệ; amount phải là số nguyên trong 1..MAX_AMOUNT, categoryId không rỗng

// report.ts
export type CategoryTotal = { categoryId: string | null; name: string; icon: string | null; total: number };
export type MonthReport = { income: number; expense: number; balance: number;
  expenseByCategory: CategoryTotal[]; incomeByCategory: CategoryTotal[] };
export function sumByType(txs: Transaction[]): { income: number; expense: number };
export function buildMonthReport(txs: Transaction[]): MonthReport;
```

Ghi chú cho các hàm:
- **Ví mặc định:** lấy ví có `is_archived = false` tạo sớm nhất, nhớ trong biến module sau lần đầu tìm. Không có ví nào thì ném lỗi `'Không tìm thấy ví'`.
- Mọi hàm select kèm `category:categories(id,name,icon)`.
- **`buildMonthReport`:** bỏ qua loại `transfer`. Khoản có `categoryId` null gom vào `{ categoryId: null, name: 'Không phân loại', icon: null }`. Sắp theo `total` giảm dần, nếu bằng nhau thì theo `name`.

- [ ] **Step 1: Viết test thất bại**

```ts
// report.test.ts
const r = buildMonthReport([tx('expense', 3200000, catHoaDon), tx('expense', 2500000, catAn), tx('expense', 100000, null),
                            tx('income', 13000000, catLuong), tx('income', 2000000, catThuong)]);
expect(r).toMatchObject({ income: 15000000, expense: 5800000, balance: 9200000 });
expect(r.expenseByCategory.map(c => c.name)).toEqual(['Hoá đơn', 'Ăn uống', 'Không phân loại']);
expect(r.incomeByCategory[0]).toMatchObject({ name: 'Lương', total: 13000000 });
expect(buildMonthReport([])).toEqual({ income: 0, expense: 0, balance: 0, expenseByCategory: [], incomeByCategory: [] });
expect(sumByType([tx('expense', 35000, catAn), tx('income', 5000, catLuong)])).toEqual({ income: 5000, expense: 35000 });
// transactions.test.ts (supabase mock ghi lại payload)
expect(validateDraft({ ...draft, amount: 0 })).not.toBeNull();
expect(validateDraft({ ...draft, amount: 1.5 })).not.toBeNull();
expect(validateDraft({ ...draft, categoryId: '' })).not.toBeNull();
expect(validateDraft(draft)).toBeNull();
await restoreTransaction(existing);
expect(lastInsertPayload).toMatchObject({ id: existing.id, created_at: existing.createdAt, wallet_id: existing.walletId,
  category_id: existing.categoryId, note: existing.note, transaction_date: existing.date, amount: existing.amount, type: existing.type });
// categories.test.ts
expect(normalizeCategoryName('  Cà   phê ')).toBe('Cà phê');
mockInsertError({ code: '23505' });
await expect(createCategory({ name: 'Ăn uống', iconKey: 'cafe', type: 'expense', sortOrder: 99 })).rejects.toBeInstanceOf(DuplicateCategoryError);
```

- [ ] **Step 2: Chạy `npm test`.** Kết quả mong đợi: FAIL.
- [ ] **Step 3: Cài package.** Chạy `npx expo install @react-native-async-storage/async-storage react-native-url-polyfill` để đưa các package đã có về đúng version SDK nếu cần. Sau đó viết `supabase.ts`, `categories.ts`, `transactions.ts` và `report.ts`.
- [ ] **Step 4: Chạy `npm test` và `npx tsc --noEmit`.** Kết quả mong đợi: PASS.
- [ ] **Step 5: Commit** `feat: data layer for categories, transactions and month report`

---

### Task 6: Đăng nhập Google, chặn route theo phiên, Cài đặt và đăng xuất

**Files:**
- Create: `src/lib/auth.tsx`, `src/app/login.tsx`, `src/app/settings.tsx`
- Modify: `src/app/_layout.tsx`

**Interfaces — Consumes:** `supabase` (Task 5). **Produces:**
```ts
export function AuthProvider(props: { children: React.ReactNode }): JSX.Element;
export function useAuth(): { session: Session | null; loading: boolean;
  signInWithGoogle(): Promise<void>; signOut(): Promise<void> };
```

Luồng đăng nhập (spec §5.2, tra docs v58 của `expo-web-browser` và `expo-linking` trước):
1. `redirectTo = Linking.createURL('auth/callback')`. Trong Expo Go sẽ ra `exp://…/--/auth/callback`.
2. Gọi `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo, skipBrowserRedirect: true } })`.
3. Gọi `WebBrowser.openAuthSessionAsync(data.url, redirectTo)`.
4. Nếu `result.type === 'success'`, lấy `code` từ `result.url` rồi gọi `supabase.auth.exchangeCodeForSession(code)`.
5. Người dùng huỷ thì im lặng. Lỗi khác thì hiện `Alert` bằng tiếng Việt.

Ở module scope gọi `WebBrowser.maybeCompleteAuthSession()`.

- [ ] **Step 1: Viết `auth.tsx`.**
  - `getSession()` lúc khởi động. Trong lúc đó `loading = true`.
  - Lắng nghe `onAuthStateChange` để cập nhật `session`.
- [ ] **Step 2: Sửa root `_layout.tsx`.**
  - Bọc app trong `GestureHandlerRootView` rồi `AuthProvider`.
  - Giữ splash bằng `SplashScreen.preventAutoHideAsync()` cho tới khi `loading = false`.
  - Dùng `Stack.Protected guard={!!session}` cho `(tabs)`, `settings` (header "Cài đặt") và `transaction/[id]` (header "Sửa khoản").
  - Dùng `Stack.Protected guard={!session}` cho `login`.
- [ ] **Step 3: Màn `login.tsx`.**
  - Ở giữa màn là chữ "Tiền Đâu", bên dưới là nút đen "Đăng nhập bằng Google".
  - Khi đang xử lý thì nút bị khoá và hiện spinner.
- [ ] **Step 4: Màn `settings.tsx`.**
  - Hiện `full_name` (từ `user_metadata`) và `email`.
  - Nút "Đăng xuất" viền `Colors.danger` gọi `signOut()`. Guard của Stack sẽ tự đưa người dùng về màn login.
- [ ] **Step 5: Thêm nút mở Cài đặt.** Tạm thời đặt nút bánh răng (`settings-outline`) trên tab Báo cáo, gọi `router.push('/settings')`. Task 10 sẽ dựng lại header của tab này.
- [ ] **Step 6:** Chạy `npx tsc --noEmit`, `npx expo lint` và `npm test`. Kết quả mong đợi: không lỗi.
- [ ] **Step 7: Kiểm tra bằng tay trên Android, Expo Go** (chủ project làm, nhờ họ đọc kết quả). Cần đã xong phần 3–5 của `docs/setup.md`.
  - Bấm đăng nhập: mở trang Google, chọn tài khoản, quay về app và thấy 3 tab.
  - Vào Supabase Dashboard → Table Editor: có 1 profile, 1 ví, 15 mục.
  - Tắt hẳn app rồi mở lại: vẫn đăng nhập.
  - Vào Cài đặt, bấm Đăng xuất: quay về màn login.
  - Nếu redirect lỗi, kiểm tra Redirect URLs có `exp://**` và in `redirectTo` ra console.
- [ ] **Step 8: Commit** `feat: Google sign-in, protected routes, settings with sign out`

---

### Task 7: Thành phần UI dùng chung — bottom sheet, toast

**Files:**
- Create: `src/components/ui/bottom-sheet.tsx`, `src/components/ui/toast.tsx`
- Modify: `src/app/_layout.tsx` (bọc thêm `ToastProvider` bên trong `AuthProvider`)

**Interfaces — Produces:**
```ts
export function BottomSheet(props: { visible: boolean; onClose(): void; title: string; children: React.ReactNode }): JSX.Element;
// RN Modal transparent, animationType 'slide', lớp nền mờ bấm vào để đóng, có thanh kéo, tránh bàn phím (KeyboardAvoidingView)
export function ToastProvider(props: { children: React.ReactNode }): JSX.Element;
export function useToast(): { show(opts: { message: string; actionLabel?: string; onAction?(): void; durationMs?: number }): void };
// Mỗi lúc chỉ có 1 toast, toast mới thay toast cũ. Thời gian hiện mặc định 1000ms, nếu có action thì 5000ms.
// Nền Colors.primary, chữ Colors.onPrimary, nằm trên thanh tab.
```

- [ ] **Step 1: Viết 2 component.** Không thêm thư viện mới.
- [ ] **Step 2: Kiểm tra bằng tay.** Gắn tạm một nút ở tab Ghi để mở sheet và hiện toast, xem trên Android rồi gỡ nút đó đi. Chạy `npx tsc --noEmit` và `npx expo lint`.
- [ ] **Step 3: Commit** `feat: bottom sheet and toast primitives`

---

### Task 8: Màn Ghi

**Files:**
- Create: `src/components/entry/entry-form.tsx`, `keypad.tsx`, `category-grid.tsx`, `new-category-sheet.tsx`, `note-sheet.tsx`
- Modify: `src/app/(tabs)/index.tsx`

**Interfaces — Consumes:** `amountReducer`, `amountSuggestions`, `initialAmount` (Task 2); `formatAmountDigits`, `formatVND` (Task 1); `todayLocal`, `formatDayTitle` (Task 1); `listCategories`, `createCategory`, `DuplicateCategoryError`, `normalizeCategoryName` (Task 5); `createTransaction`, `validateDraft` (Task 5); `CategoryIcon`, `CATEGORY_ICON_KEYS`, `DEFAULT_ICON_KEY` (Task 3); `BottomSheet`, `useToast` (Task 7). **Produces:**
```ts
export function EntryForm(props: {
  initial?: Transaction;                       // có giá trị = chế độ Sửa
  onSubmit(d: TransactionDraft): Promise<void>;
  onDelete?(): void;                           // chỉ dùng ở chế độ Sửa: hiện nút "Xoá khoản này"
  resetAfterSubmit: boolean;                   // màn Ghi: true; màn Sửa: false
}): JSX.Element;
export function Keypad(props: { onKey(a: AmountAction): void }): JSX.Element;
```

Hành vi phải giữ đúng (spec §4.4, mockup `docs/mockups/01-man-ghi.html`):
- **Bố cục từ trên xuống:** nút Chi/Thu (segmented), số tiền, dòng ngày và mô tả, lưới mục 3 cột cuộn được, dòng gợi ý, nút Lưu, bàn phím.
- **Số tiền:** chữ cỡ khoảng 32, căn phải, hậu tố `đ`. Khi bằng 0 thì hiện `0` màu `Colors.textMuted`.
- **Phím:** `1–9`, `000`, `0`, `⌫`. Phím `⌫` dùng `onPress` để gửi `backspace`, và `onLongPress` với `delayLongPress={2000}` để gửi `clear`.
- **Gợi ý:** hiện từ `amountSuggestions(state)`. Bấm một gợi ý thì gửi `{ type: 'pick', value }`.
- **Đổi Chi/Thu:** tải lại mục theo loại và bỏ chọn mục cũ.
- **Nút "Lưu":** chỉ hiện khi `validateDraft` trả `null`. Lúc đang lưu thì khoá nút.
  - Lưu thành công, nếu `resetAfterSubmit`: đưa số tiền về `initialAmount`, bỏ chọn mục, xoá mô tả. Giữ nguyên loại và ngày. Hiện toast "Đã lưu".
  - Lưu lỗi: giữ nguyên mọi thứ, hiện toast "Không lưu được, thử lại nhé".
- **Chọn ngày:** `@react-native-community/datetimepicker`, cài bằng `npx expo install`, đặt `maximumDate` là hôm nay. Nhãn ngày dùng `formatDayTitle`.
- **"Thêm mô tả":** mở `note-sheet` có `TextInput` nhiều dòng và nút "Xong". Khi đã có mô tả thì hiện chính đoạn mô tả, cắt bớt nếu dài.
- **"+ Mục mới":** mở `new-category-sheet` với tiêu đề "Mục chi mới" hoặc "Mục thu mới".
  - Gồm ô tên và lưới icon 6 cột từ `CATEGORY_ICON_KEYS`. Mặc định chọn `DEFAULT_ICON_KEY`.
  - Nút "Tạo mục" khoá khi `normalizeCategoryName(name) === ''`.
  - `sortOrder` bằng `max(sortOrder) + 1`.
  - Tạo thành công: đóng sheet, thêm mục vào cuối lưới và chọn sẵn mục đó.
  - Gặp `DuplicateCategoryError`: hiện "Mục đã có" ngay dưới ô tên.
- **Tải mục:** dùng `useFocusEffect`, mỗi lần vào tab thì tải lại.
- **Tab `(tabs)/index.tsx`:** render `<EntryForm resetAfterSubmit onSubmit={d => createTransaction(d).then(() => {})} />`.

- [ ] **Step 1: Viết `keypad.tsx` và `category-grid.tsx`** (mục được chọn có viền `Colors.borderStrong` dày 1.5).
- [ ] **Step 2: Viết `note-sheet.tsx` và `new-category-sheet.tsx`.**
- [ ] **Step 3: Viết `entry-form.tsx`**, nối với `useReducer(amountReducer, …)`. Khi có `initial` thì `dispatch({ type: 'set', value: initial.amount })`.
- [ ] **Step 4:** Chạy `npx tsc --noEmit`, `npx expo lint` và `npm test`. Kết quả mong đợi: không lỗi.
- [ ] **Step 5: Kiểm tra bằng tay trên Android.**
  - Gõ `3`: thấy `3.000 | 30.000 | 300.000`.
  - Bấm `30.000`: gợi ý biến mất.
  - Chọn Ăn uống: nút Lưu hiện ra. Bấm Lưu: hiện "Đã lưu" và màn trống lại.
  - Giữ `⌫` 2 giây: xoá hết số tiền.
  - Tạo mục "Cà phê" lần nữa: báo "Mục đã có".
  - Tạo mục "Xăng": mục đó được chọn sẵn.
  - Không chọn được ngày mai.
  - Kiểm tra bảng `transactions` trên Dashboard có khoản vừa lưu.
- [ ] **Step 6: Commit** `feat: entry screen with keypad, suggestions and inline category creation`

---

### Task 9: Tab Hôm nay, màn Sửa, xoá kèm Hoàn tác

**Files:**
- Create: `src/components/today/transaction-row.tsx`, `src/app/transaction/[id].tsx`
- Modify: `src/app/(tabs)/today.tsx`

**Interfaces — Consumes:** `listTransactionsForDay`, `getTransaction`, `updateTransaction`, `deleteTransaction`, `restoreTransaction` (Task 5); `sumByType` (Task 5); `todayLocal`, `addDays`, `formatDayTitle`, `formatTime` (Task 1); `formatVND`, `formatAmountDigits` (Task 1); `EntryForm` (Task 8); `useToast` (Task 7). **Produces:**
```ts
export function TransactionRow(props: { tx: Transaction; onPress(): void; onEdit(): void; onDelete(): void; peekHint?: boolean }): JSX.Element;
export async function deleteWithUndo(tx: Transaction, toast: ReturnType<typeof useToast>, onChanged: () => void): Promise<void>;
// đặt trong transaction-row.tsx; dùng chung cho cả tab Hôm nay và màn Sửa
```

Hành vi phải giữ đúng (spec §4.5, mockup `02-trang-hom-nay.html`):
- **Đầu trang:** `‹ {formatDayTitle} ›`. Nút `›` bị ẩn hoặc khoá khi đang xem hôm nay. Bên dưới là 2 ô "Đã chi" và "Đã thu", tính bằng `sumByType`.
- **Mỗi dòng:** icon, tên mục (null thì ghi "Không phân loại"), mô tả cắt 1 dòng, số tiền `−30.000` hoặc `+30.000` (chi thì màu `Colors.text`, thu cũng giữ chữ màu trung tính), giờ `formatTime(createdAt)`.
- **Bấm vào dòng:** `router.push('/transaction/' + id)`.
- **Vuốt:** dùng `ReanimatedSwipeable` từ `react-native-gesture-handler/ReanimatedSwipeable`, vuốt sang trái thì lộ 2 nút "Sửa" (`Colors.icon`) và "Xoá" (`Colors.danger`).
- **Gợi ý vuốt:** khi lần đầu tiên danh sách có ít nhất 1 dòng, dòng đầu tự mở swipeable khoảng 1 giây rồi đóng lại. Ghi nhớ bằng AsyncStorage key `hint.swipe.v1`, mỗi máy chỉ chạy một lần.
- **`deleteWithUndo`:**
  1. Gọi `deleteTransaction`, rồi `onChanged()`.
  2. Hiện toast `Đã xoá "{note ?? tên mục}"` với nút "Hoàn tác", trong 5000ms.
  3. Bấm Hoàn tác: `restoreTransaction(tx)`, rồi `onChanged()`.
  4. Nếu xoá lỗi thì hiện toast "Không xoá được".
- **Ngày trống:** hiện chữ "Chưa có khoản nào" màu `Colors.textMuted`.
- **Tải dữ liệu:** `useFocusEffect` tải lại ngày đang xem.
- **Màn `transaction/[id].tsx`:**
  - `getTransaction(id)`. Không tìm thấy thì `router.back()`.
  - Render `<EntryForm initial={tx} resetAfterSubmit={false} onSubmit={d => updateTransaction(id, d).then(() => router.back())} onDelete={() => deleteWithUndo(tx, toast, () => router.back())} />`.

- [ ] **Step 1: Viết `transaction-row.tsx`**, gồm cả `deleteWithUndo`.
- [ ] **Step 2: Viết `today.tsx`.**
- [ ] **Step 3: Viết `transaction/[id].tsx`.**
- [ ] **Step 4:** Chạy `npx tsc --noEmit`, `npx expo lint` và `npm test`. Kết quả mong đợi: không lỗi.
- [ ] **Step 5: Kiểm tra bằng tay trên Android.**
  - Ghi 3 khoản: khoản mới nhất nằm trên cùng, tổng "Đã chi" đúng.
  - Lần đầu mở tab: dòng đầu tự trượt nhẹ một lần.
  - Vuốt rồi bấm Xoá: dòng biến mất. Bấm Hoàn tác: dòng quay lại **đúng vị trí cũ**.
  - Bấm vào dòng, đổi số tiền rồi Lưu: danh sách cập nhật.
  - Sửa ngày sang hôm qua: khoản biến khỏi hôm nay. Bấm `‹` thì thấy khoản đó ở hôm qua.
  - Xoá từ màn Sửa: quay về danh sách và có nút Hoàn tác.
- [ ] **Step 6: Commit** `feat: today list with swipe actions, edit screen and undo delete`

---

### Task 10: Tab Báo cáo

**Files:**
- Create: `src/components/report/category-bars.tsx`
- Modify: `src/app/(tabs)/report.tsx`

**Interfaces — Consumes:** `listTransactionsForMonth`, `buildMonthReport`, `CategoryTotal` (Task 5); `formatVND`, `formatCompactVND`, `formatMonthTitle`, `todayLocal` (Task 1); `CategoryIcon` (Task 3). **Produces:**
```ts
export function CategoryBars(props: { title: string; items: CategoryTotal[]; emptyText: string }): JSX.Element;
```

Hành vi phải giữ đúng (spec §4.6, mockup `03-trang-bao-cao.html`, chỉ làm các phần 1, 2, 4):
- **Header:** `‹ {formatMonthTitle} ›`. Nút `›` khoá khi đang ở tháng hiện tại. Nút bánh răng ở góc phải mở `/settings`.
- **Ô lớn "Còn lại (thu − chi)":** số âm hiện `−`, số dương hiện `+`. Bên dưới là 2 ô "Thu" và "Chi", định dạng bằng `formatVND`.
- **`CategoryBars` cho "Chi theo mục" và "Thu theo mục":**
  - Mỗi dòng: icon, tên, thanh màu `Colors.icon` bo góc phải 4, rồi `formatCompactVND(total)`.
  - Chiều dài thanh bằng `total / items[0].total` nhân bề rộng còn lại, tối thiểu 2px.
  - Không có dữ liệu thì hiện `emptyText`: "Chưa có khoản chi nào" hoặc "Chưa có khoản thu nào".
- **Tải dữ liệu:** `useFocusEffect` tải lại tháng đang xem.
- **Để sau:** bấm vào một mục để xem danh sách khoản. Spec đánh dấu phần này là tuỳ chọn, không làm ở v1.

- [ ] **Step 1: Viết `category-bars.tsx`.**
- [ ] **Step 2: Viết `report.tsx`.** Thay nút bánh răng tạm của Task 6.
- [ ] **Step 3:** Chạy `npx tsc --noEmit`, `npx expo lint` và `npm test`. Kết quả mong đợi: không lỗi.
- [ ] **Step 4: Kiểm tra bằng tay.**
  - Các số khớp với tổng các khoản đã ghi trong tháng.
  - Mục lớn nhất có thanh dài nhất.
  - Bấm `‹` sang tháng trước không có dữ liệu: các số hiện 0 kèm chữ "Chưa có…".
  - Bánh răng mở được Cài đặt.
- [ ] **Step 5: Commit** `feat: monthly report with category bars`

---

### Task 11: Hoàn tất

**Files:** Modify `CLAUDE.md` (mục Commands: thêm `npm test`, `npx supabase test db`; ghi chú file `.env.local`), `docs/setup.md` nếu có bước nào thay đổi.

- [ ] **Step 1:** Chạy `npx tsc --noEmit`, `npx expo lint`, `npm test` và `npx expo-doctor`. Kết quả mong đợi: không lỗi. Với cảnh báo của `expo-doctor` thì xử lý hoặc ghi lý do.
- [ ] **Step 2: Đi trọn luồng một lượt trên Android:** đăng nhập → ghi 1 khoản chi và 1 khoản thu → xem Hôm nay → sửa → xoá rồi hoàn tác → xem Báo cáo → đăng xuất.
- [ ] **Step 3: Chạy `trail check`**, rồi **commit** `docs: update CLAUDE.md for v1 commands`
