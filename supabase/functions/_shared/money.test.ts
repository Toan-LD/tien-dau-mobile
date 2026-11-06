import { assertEquals } from "@std/assert";
import { formatChange, formatShare, formatVND, toVND } from "./money.ts";

Deno.test("formatVND nhóm hàng nghìn bằng dấu chấm", () => {
    assertEquals(formatVND(30000), "30.000 đ");
    assertEquals(formatVND(0), "0 đ");
    assertEquals(formatVND(-500000), "-500.000 đ");
    assertEquals(formatVND(999_999_999_999), "999.999.999.999 đ");
});

Deno.test("toVND làm tròn về số nguyên", () => {
    assertEquals(toVND("45000.00"), 45000);
});

Deno.test("formatShare làm tròn phần trăm", () => {
    assertEquals(formatShare(35, 100), "35%");
    assertEquals(formatShare(1, 3), "33%");
    assertEquals(formatShare(5, 0), "0%");
});

Deno.test("formatChange mô tả tăng, giảm, không đổi", () => {
    assertEquals(formatChange(800000, 920000), "tăng 120.000 đ (+15%)");
    assertEquals(formatChange(920000, 800000), "giảm 120.000 đ (-13%)");
    assertEquals(formatChange(500000, 500000), "không đổi");
    assertEquals(formatChange(0, 120000), "tăng 120.000 đ (kỳ trước không có)");
    assertEquals(formatChange(120000, 0), "giảm 120.000 đ (-100%)");
});
