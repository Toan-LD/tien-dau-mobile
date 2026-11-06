import { assertEquals } from "@std/assert";
import { resolvePeriod, vietnamToday, weekdayTitle } from "./periods.ts";

function assertPeriod(
    input: string,
    today: string,
    start: string,
    end: string,
    label?: string,
) {
    const result = resolvePeriod(input, today);
    if (!result.ok) throw new Error(`"${input}" bị từ chối: ${result.error}`);
    assertEquals(result.period.start, start);
    assertEquals(result.period.end, end);
    if (label !== undefined) assertEquals(result.period.label, label);
}

Deno.test("vietnamToday dùng giờ Việt Nam", () => {
    assertEquals(vietnamToday(new Date("2026-11-05T16:59:59Z")), "2026-11-05");
    assertEquals(vietnamToday(new Date("2026-11-05T17:00:00Z")), "2026-11-06");
});

Deno.test("tuần bắt đầu thứ Hai", () => {
    // 2026-11-06 là thứ Sáu, 2026-11-02 thứ Hai, 2026-11-08 Chủ nhật
    assertPeriod(
        "this_week",
        "2026-11-06",
        "2026-11-02",
        "2026-11-06",
        "Tuần này (02/11/2026 – 06/11/2026)",
    );
    assertPeriod("this_week", "2026-11-02", "2026-11-02", "2026-11-02");
    assertPeriod("this_week", "2026-11-08", "2026-11-02", "2026-11-08");
    assertPeriod(
        "last_week",
        "2026-11-06",
        "2026-10-26",
        "2026-11-01",
        "Tuần trước (26/10/2026 – 01/11/2026)",
    );
    assertPeriod("last_week", "2026-01-02", "2025-12-22", "2025-12-28");
});

Deno.test("ngày, tháng, năm", () => {
    assertPeriod(
        "today",
        "2026-11-06",
        "2026-11-06",
        "2026-11-06",
        "Hôm nay, 06/11/2026",
    );
    assertPeriod(
        "yesterday",
        "2026-11-01",
        "2026-10-31",
        "2026-10-31",
        "Hôm qua, 31/10/2026",
    );
    assertPeriod(
        "this_month",
        "2026-11-06",
        "2026-11-01",
        "2026-11-06",
        "Tháng 11/2026 (01/11/2026 – 06/11/2026)",
    );
    assertPeriod(
        "last_month",
        "2026-01-15",
        "2025-12-01",
        "2025-12-31",
        "Tháng 12/2025 (01/12/2025 – 31/12/2025)",
    );
    assertPeriod(
        "this_year",
        "2026-11-06",
        "2026-01-01",
        "2026-11-06",
        "Năm 2026 (01/01/2026 – 06/11/2026)",
    );
    assertPeriod(
        "2026-10",
        "2026-11-06",
        "2026-10-01",
        "2026-10-31",
        "Tháng 10/2026 (01/10/2026 – 31/10/2026)",
    );
    assertPeriod("2026-11", "2026-11-06", "2026-11-01", "2026-11-06"); // tháng hiện tại tính tới hôm nay
    assertPeriod("2028-02", "2026-11-06", "2028-02-01", "2028-02-29");
    assertPeriod(
        "2026-11-03",
        "2026-11-06",
        "2026-11-03",
        "2026-11-03",
        "Ngày 03/11/2026",
    );
    assertPeriod(
        "2026-10-01..2026-10-15",
        "2026-11-06",
        "2026-10-01",
        "2026-10-15",
        "01/10/2026 – 15/10/2026",
    );
    assertEquals(weekdayTitle("2026-11-06"), "Thứ Sáu, 06/11/2026");
});

Deno.test("đầu vào sai trả lỗi", () => {
    for (const bad of [
        "",
        "last_decade",
        "2026-13",
        "2026-02-30",
        "2026-11-06..2026-11-01",
        "06/11/2026",
    ]) {
        const result = resolvePeriod(bad, "2026-11-06");
        assertEquals(result.ok, false);
    }
});
