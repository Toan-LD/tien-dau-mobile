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

## Xong thì báo cho Claude

Báo theo dạng **"xong phần 1, 2, 3, 4, 5"** (hoặc phần nào bị lỗi thì dán thông báo lỗi). **Không cần gửi key hay secret.** Claude sẽ tự chạy `npx supabase db pull` để lấy schema về.
