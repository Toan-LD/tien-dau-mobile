# Hướng dẫn cài đặt (những việc chủ project tự làm)

Làm theo thứ tự từ trên xuống. Phần nào xong thì đánh dấu ✅.

> **Không dán Client Secret, mật khẩu database hay access token vào chat.** Những thứ này chỉ dán vào Supabase Dashboard hoặc vào terminal khi CLI hỏi.

---

## Phần 1. Cài Docker

Supabase CLI cần Docker để lấy schema từ server về (lệnh `db pull` chạy một Postgres tạm trong Docker để so sánh).

Trên Fedora:

```bash
sudo dnf install moby-engine
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
```

Sau đó **đăng xuất rồi đăng nhập lại** (hoặc khởi động lại máy) để quyền nhóm `docker` có hiệu lực. Kiểm tra:

```bash
docker run --rm hello-world
```

Thấy dòng `Hello from Docker!` là được.

---

## Phần 2. Cài Supabase CLI và nối repo với project

Chạy trong thư mục `tien-dau-mobile`:

```bash
# 1. Cài CLI cho riêng project này (thêm vào devDependencies)
npm install supabase --save-dev

# 2. Đăng nhập. Lệnh này mở trình duyệt để bạn đăng nhập tài khoản Supabase.
npx supabase login

# 3. Tạo thư mục supabase/ trong repo.
#    Nếu nó hỏi "Generate VS Code settings for Deno?", trả lời N.
npx supabase init

# 4. Nối repo với project trên server
npx supabase link --project-ref <PROJECT_REF>
```

**`<PROJECT_REF>` lấy ở đâu:** mở project trên Supabase Dashboard, đường link sẽ có dạng `https://supabase.com/dashboard/project/abcdxyz...`. Đoạn `abcdxyz...` chính là project ref. Bạn cũng có thể vào **Project Settings → General → Project ID**.

Khi `link` hỏi **database password**, nhập mật khẩu bạn đặt lúc tạo project. Nếu quên thì vào **Project Settings → Database → Reset database password** để đặt lại.

---

## Phần 3. Tạo file `.env.local`

Tạo file `.env.local` ở thư mục gốc `tien-dau-mobile/` (file này đã nằm trong `.gitignore`, không bị commit):

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://<PROJECT_REF>.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=<PUBLISHABLE_KEY>
```

**Lấy URL và key:** trên Dashboard bấm nút **Connect** ở đầu trang project, hoặc vào **Project Settings → API Keys**.

- Dùng **Publishable key** (bắt đầu bằng `sb_publishable_...`). Nếu project chỉ có key kiểu cũ thì dùng **anon key**.
- **Tuyệt đối không dùng Secret key / service_role key** trong app. Key đó bỏ qua mọi bảo mật.

---

## Phần 4. Tạo OAuth Client trên Google Cloud

1. Vào <https://console.cloud.google.com>, tạo project mới (ví dụ tên `tien-dau`).
2. Tìm **Google Auth Platform** ở ô tìm kiếm, bấm **Get started** rồi điền:
   - App name: `Tiền Đâu`, User support email: Gmail của bạn
   - Audience: **External**
   - Contact email: Gmail của bạn → đồng ý điều khoản → **Create**
3. Vào mục **Audience → Test users → Add users**, thêm **Gmail mà bạn sẽ dùng để đăng nhập app**. Khi app còn ở chế độ Testing thì chỉ những tài khoản trong danh sách này mới đăng nhập được, đủ cho việc bạn tự dùng.
4. Vào mục **Data Access → Add or remove scopes**, tick `openid` (hai scope `email` và `profile` thường đã có sẵn) → **Save**.
5. Mở Supabase Dashboard → **Authentication → Sign In / Providers → Google** và copy dòng **Callback URL**. Nó có dạng:
   ```
   https://<PROJECT_REF>.supabase.co/auth/v1/callback
   ```
6. Quay lại Google, vào mục **Clients → Create client**:
   - Application type: **Web application**
   - Name: `tien-dau-supabase`
   - **Authorized redirect URIs → Add URI**: dán Callback URL vừa copy
   - Bấm **Create**
7. **Copy ngay Client ID và Client Secret** và lưu vào chỗ an toàn. Google có thể chỉ cho xem Secret một lần.

---

## Phần 5. Bật Google trên Supabase

1. Vào **Authentication → Sign In / Providers → Google**:
   - Bật **Enable Sign in with Google**
   - **Client IDs**: dán Client ID
   - **Client Secret**: dán Client Secret
   - **Save**
2. Vào **Authentication → URL Configuration → Redirect URLs → Add URL**, thêm 2 dòng:
   ```
   tiendaumobile://**
   exp://**
   ```
   Dòng đầu dùng cho app cài thật sau này. Dòng sau dùng cho Expo Go, vì địa chỉ `exp://` đổi theo IP mạng nên phải dùng wildcard `**`.
3. Ô **Site URL** cứ để mặc định.

---

## Phần 6. Chạy app trên điện thoại (Expo Go)

Dùng lệnh này thay cho `npx expo start`:

```bash
npm run start:phone
```

Sau đó mở Expo Go trên điện thoại và quét mã QR như bình thường. Điện thoại và máy tính phải dùng chung Wi-Fi.

**Vì sao không dùng `npx expo start`:** lệnh đó cho Expo Go kết nối bằng địa chỉ IP (ví dụ `exp://192.168.1.31:8081`). Đăng nhập Google xong, Supabase phải chuyển bạn về đúng địa chỉ này, nhưng Supabase **từ chối mọi địa chỉ quay về là IP**, kể cả khi đã có `exp://**` trong Redirect URLs. Khi bị từ chối, nó chuyển sang `localhost:3000` và đăng nhập thất bại.

`npm run start:phone` đổi IP thành tên miền dạng `192.168.1.31.sslip.io`. sslip.io là dịch vụ DNS miễn phí, trả về đúng IP nằm trong tên, nên điện thoại vẫn kết nối thẳng tới máy tính qua Wi-Fi như cũ. Supabase thấy đây là tên miền nên chấp nhận.

**Nếu app không tải được với `start:phone`** (một số router chặn tên miền trỏ về IP nội bộ), dùng đường hầm của Expo thay thế, chậm hơn nhưng chạy được mọi mạng:

```bash
npx expo start --tunnel
```

---

## Phần 7. Chatbot (tab Hỏi)

Tab **Hỏi** cho bạn hỏi bằng tiếng Việt, ví dụ "Tháng này tôi chi bao nhiêu cho ăn uống?". App gửi câu hỏi tới một Edge Function tên `chat` (code nằm trong `supabase/functions/chat/`). Function này đọc dữ liệu của chính bạn rồi nhờ một model AI viết câu trả lời. **Key của model AI chỉ nằm ở phía server, không bao giờ nằm trong app.**

Mỗi người dùng có giới hạn số câu hỏi mỗi ngày (mặc định 50, đổi bằng `CHAT_DAILY_LIMIT`).

> Việc "nối model thật" (đặt key và tên model GLM qua zpro, rồi chỉnh prompt dựa trên bộ câu hỏi mẫu) chưa làm, vì cần key và tên model của bạn. Các bước dưới đây là để bạn chuẩn bị sẵn.

### 7.1. Lấy key ở zpro

Đăng nhập zpro, tạo một API key, và ghi lại ba thứ:

- **Base URL**: địa chỉ API của zpro (kiểu OpenAI-compatible).
- **API key**: chuỗi bí mật. Không dán vào chat.
- **Tên model**: tên model GLM bạn muốn dùng.

### 7.2. Tạo file `supabase/functions/.env`

```bash
cp supabase/functions/.env.example supabase/functions/.env
```

Mở file `supabase/functions/.env` và điền:

```dotenv
LLM_BASE_URL=<Base URL>
LLM_API_KEY=<API key>
LLM_MODEL=<tên model>
CHAT_DAILY_LIMIT=50
```

File `.env` đã nằm trong `.gitignore`, không bị commit. File `.env.example` thì được commit và không chứa key.

### 7.3. Chạy thử trên máy (local)

Cần Docker đang chạy. Mở hai terminal trong thư mục `tien-dau-mobile`:

```bash
# Terminal 1: dựng Supabase trên máy, rồi chạy function
npx supabase start
npx supabase functions serve chat --env-file supabase/functions/.env
```

**Nếu máy bạn là Fedora (SELinux đang bật):** `functions serve` có thể báo lỗi `BOOT_ERROR` hoặc `failed to determine entrypoint`. Nguyên nhân: SELinux không cho container Docker đọc thư mục `supabase/functions` (file đang mang nhãn `user_home_t`). Cách xử lý tạm, làm trước và sau khi chạy:

```bash
# Trước khi serve: cho container được phép đọc thư mục này
chcon -R -t container_file_t supabase/functions

# Sau khi dừng serve: trả nhãn về như cũ
restorecon -RF supabase/functions
```

`chcon` chỉ đổi nhãn bảo mật của file, không đổi nội dung. `restorecon` đặt lại nhãn mặc định. Nếu muốn làm một lần là xong, có cách vĩnh viễn là thêm quy tắc bằng `semanage fcontext`, nhưng đó là quyết định của bạn nên hướng dẫn này không làm sẵn.

### 7.4. Chạy bộ câu hỏi mẫu (eval)

Bộ này nạp một người dùng thử với khoảng 335 giao dịch giả, rồi hỏi 26 câu và chấm đạt/không đạt, để kiểm tra model trả lời đúng số liệu. **Chỉ chạy được với Supabase trên máy**: hai lệnh từ chối mọi địa chỉ khác `127.0.0.1` / `localhost`, để không đụng vào dữ liệu thật.

1. Trong `supabase/functions/.env` đặt `CHAT_DAILY_LIMIT=1000` (nếu không, 26 câu nhân số lần chạy sẽ chạm giới hạn 50 câu/ngày), rồi chạy lại `functions serve` như trên.
2. Lấy địa chỉ và key của Supabase local, đưa vào môi trường của terminal thứ hai:

    ```bash
    npx supabase status -o env
    ```

    Hai lệnh dưới đọc các biến `API_URL` (hoặc `SUPABASE_URL`), `SERVICE_ROLE_KEY` (hoặc `SUPABASE_SERVICE_ROLE_KEY`, chỉ `eval:seed` cần) và `ANON_KEY` (hoặc `PUBLISHABLE_KEY`, chỉ `eval:chat` cần), nên có thể `export` đúng tên mà `status -o env` in ra.
3. Chạy:

    ```bash
    npm run eval:seed                 # nạp người dùng thử và dữ liệu mẫu
    npm run eval:chat -- --runs 2     # hỏi 26 câu, mỗi câu 2 lần
    ```

Kết quả in từng câu hỏi, câu trả lời, đáp án mong đợi và dòng tổng: đạt, không đạt, cần xem (câu cần người đọc), lỗi.

### 7.5. Đưa lên project thật

Làm sau khi chạy thử local ổn. Các lệnh này tác động lên project thật, nên chạy từng lệnh một. Repo đã `link` ở Phần 2.

- `secrets set` và `functions deploy` chỉ làm việc với project thật, mặc định dùng project đã link. Muốn chọn project khác thì thêm `--remote=<project ref>`.
- `db push` và `gen types` mặc định làm việc với database **trên máy**, nên phải thêm `--remote` để nhắm vào project thật. Quên cờ này thì migration chỉ chạy trên máy bạn, còn function trên server sẽ lỗi vì thiếu bảng `chat_usage`.

```bash
# 1. Cập nhật database thật (bảng chat_usage và hàm đếm lượt hỏi).
#    Thêm --dry-run để xem trước những migration sẽ chạy, rồi chạy lại không có --dry-run.
npx supabase db push --remote

# 2. Đặt secret cho function (đọc từ file .env vừa tạo)
npx supabase secrets set --env-file supabase/functions/.env

# 3. Đưa function lên
npx supabase functions deploy chat
```

Sau bước 1, sinh lại kiểu TypeScript cho database:

```bash
npx supabase gen types typescript --remote --schema public > src/lib/database.types.ts
```

Rồi mở app bằng Expo Go, vào tab **Hỏi** để thử.

### 7.6. Đổi model sau này

Chỉ cần đổi các secret `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`, rồi đặt lại bằng `npx supabase secrets set --env-file supabase/functions/.env`. Không phải sửa code hay deploy lại. Lưu ý: model phải hỗ trợ gọi công cụ (tool calling) theo kiểu OpenAI.

---

## Xong thì báo cho Claude

Báo theo dạng **"xong phần 1, 2, 3, 4, 5"** (hoặc phần nào bị lỗi thì dán thông báo lỗi). **Không cần gửi key hay secret.** Claude sẽ tự chạy `npx supabase db pull` để lấy schema về.
