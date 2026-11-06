import { assert, assertEquals, assertFalse } from "@std/assert";
import {
    formatChange,
    formatShare,
    formatVND,
    parseAmount,
    toVND,
} from "./money.ts";

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

Deno.test("parseAmount hiểu k, nghìn, ngàn, n", () => {
    for (const input of [
        "30k",
        "30 k",
        "30K",
        "30 nghìn",
        "30 ngàn",
        "30n",
        "30 nghìn đồng",
    ]) {
        assertEquals(parseAmount(input), { ok: true, amount: 30000 }, input);
    }
    assertEquals(parseAmount("1,5k"), { ok: true, amount: 1500 });
    assertEquals(parseAmount("1k5"), { ok: true, amount: 1500 });
});

Deno.test("parseAmount hiểu số có dấu ngăn hàng nghìn và đơn vị đồng", () => {
    for (const input of [
        "30.000",
        "30,000",
        "30000",
        "30000đ",
        "30.000 đ",
        "30.000 vnđ",
        "30 000",
    ]) {
        assertEquals(parseAmount(input), { ok: true, amount: 30000 }, input);
    }
    assertEquals(parseAmount("1.250.000"), { ok: true, amount: 1250000 });
});

Deno.test("parseAmount hiểu triệu, củ, m, tỷ và số lẻ kiểu 1tr2", () => {
    assertEquals(parseAmount("1tr2"), { ok: true, amount: 1200000 });
    assertEquals(parseAmount("1tr25"), { ok: true, amount: 1250000 });
    assertEquals(parseAmount("1tr250"), { ok: true, amount: 1250000 });
    assertEquals(parseAmount("1,5tr"), { ok: true, amount: 1500000 });
    assertEquals(parseAmount("1.5 triệu"), { ok: true, amount: 1500000 });
    assertEquals(parseAmount("2 củ"), { ok: true, amount: 2000000 });
    assertEquals(parseAmount("15tr"), { ok: true, amount: 15000000 });
    assertEquals(parseAmount("2m"), { ok: true, amount: 2000000 });
    assertEquals(parseAmount("1 tỷ"), { ok: true, amount: 1000000000 });
});

Deno.test("parseAmount từ chối số trần dưới 1.000 vì mơ hồ", () => {
    for (const input of ["30", "999", "1.5"]) {
        const result = parseAmount(input);
        assertFalse(result.ok, input);
        assert(!result.ok && result.error.includes("mơ hồ"), input);
    }
});

Deno.test("parseAmount từ chối rác, số 0, số âm và số quá lớn", () => {
    for (const input of [
        "",
        "abc",
        "0",
        "0k",
        "-30k",
        "30kk",
        "1000000000000",
        "1000 tỷ",
    ]) {
        assertFalse(parseAmount(input).ok, input);
    }
});
