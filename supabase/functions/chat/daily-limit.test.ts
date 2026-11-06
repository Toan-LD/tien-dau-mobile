import { assertEquals } from "@std/assert";
import { DEFAULT_DAILY_LIMIT, readDailyLimit } from "./daily-limit.ts";

Deno.test("readDailyLimit nhận số nguyên dương", () => {
    assertEquals(readDailyLimit("1000"), 1000);
    assertEquals(readDailyLimit("1"), 1);
});

Deno.test("readDailyLimit về mặc định khi giá trị không hợp lệ", () => {
    for (const rawValue of [
        undefined,
        "",
        "abc",
        "0",
        "-5",
        "2.5",
        "NaN",
        "Infinity",
    ]) {
        assertEquals(readDailyLimit(rawValue), DEFAULT_DAILY_LIMIT);
    }
    assertEquals(DEFAULT_DAILY_LIMIT, 50);
});
