# Bản phác giao diện v1

Đây là các bản phác đã duyệt trong buổi brainstorm ngày 2026-11-05. Mở bằng trình duyệt để xem.

| File | Màn hình |
|---|---|
| `01-man-ghi.html` | Tab Ghi, luồng gõ số → gợi ý → chọn mục → Lưu |
| `02-trang-hom-nay.html` | Tab Hôm nay, danh sách và vuốt để Sửa/Xoá |
| `03-trang-bao-cao.html` | Tab Báo cáo |
| `04-tao-muc-moi.html` | Tạo mục mới bằng bottom sheet |

**Bản phác chỉ để tham khảo.** Khi bản phác khác với tài liệu thiết kế
([../superpowers/specs/2026-11-05-expense-app-v1-design.md](../superpowers/specs/2026-11-05-expense-app-v1-design.md))
thì **làm theo tài liệu thiết kế**. Những chỗ khác đã biết:

- `01-man-ghi.html`:
  - Nút lưu chỉ ghi **"Lưu"**, không ghi "Lưu · 30.000 đ · Ăn uống".
  - Sau khi bấm một gợi ý số tiền thì **dòng gợi ý ẩn đi**. Bản phác vẫn vẽ dòng gợi ý ở bước 2 và 3.
- `02-trang-hom-nay.html`: bấm vào một dòng cũng mở màn Sửa. Lần đầu mở trang, dòng trên cùng tự trượt nhẹ để gợi ý thao tác vuốt.
- `03-trang-bao-cao.html`: chỉ giữ các phần **1, 2 và 4**, bỏ phần 3 "Chi theo ngày". Có thêm nút bánh răng để vào Cài đặt.
