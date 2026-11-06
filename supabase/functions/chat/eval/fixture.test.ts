import { assert, assertEquals, assertNotEquals } from "@std/assert";
import type { CategoryRef } from "../../_shared/types.ts";
import { buildFixture } from "./fixture.ts";

const TODAY = "2026-11-06";

const categories: CategoryRef[] = [
    ["Ăn uống", "expense"],
    ["Cà phê", "expense"],
    ["Đi lại", "expense"],
    ["Mua sắm", "expense"],
    ["Hoá đơn", "expense"],
    ["Nhà cửa", "expense"],
    ["Giải trí", "expense"],
    ["Khác", "expense"],
    ["Lương", "income"],
    ["Khác", "income"],
].map(([name, type], index) => ({
    id: `category-${index}`,
    name,
    type: type as CategoryRef["type"],
}));

function daysBefore(date: string, days: number): string {
    const [year, month, day] = date.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day - days))
        .toISOString()
        .slice(0, 10);
}

Deno.test("cùng ngày và seed thì cho cùng kết quả", () => {
    assertEquals(
        buildFixture(TODAY, categories),
        buildFixture(TODAY, categories, 7),
    );
});

Deno.test("seed khác thì cho kết quả khác", () => {
    assertNotEquals(
        buildFixture(TODAY, categories, 7),
        buildFixture(TODAY, categories, 8),
    );
});

Deno.test("mọi ngày nằm trong 120 ngày tính tới hôm nay", () => {
    const earliest = daysBefore(TODAY, 119);
    for (const transaction of buildFixture(TODAY, categories)) {
        assert(transaction.date >= earliest && transaction.date <= TODAY);
    }
});

Deno.test("có khoản hôm qua và trong tuần trước", () => {
    const transactions = buildFixture(TODAY, categories);
    const yesterday = daysBefore(TODAY, 1);
    assert(transactions.some((transaction) => transaction.date === yesterday));
    // 2026-11-06 là thứ Sáu: tuần trước là 26/10 – 01/11.
    assert(
        transactions.some(
            (transaction) =>
                transaction.date >= "2026-10-26" &&
                transaction.date <= "2026-11-01",
        ),
    );
});

Deno.test("có khoản Khác ở cả chi lẫn thu và khoản không có mục", () => {
    const transactions = buildFixture(TODAY, categories);
    for (const type of ["expense", "income"]) {
        assert(
            transactions.some(
                (transaction) =>
                    transaction.type === type &&
                    transaction.categoryName === "Khác",
            ),
            `thiếu khoản Khác loại ${type}`,
        );
    }
    assert(transactions.some((transaction) => transaction.categoryId === null));
});

Deno.test("lương ngày 10 và tiền nhà ngày 1", () => {
    const transactions = buildFixture(TODAY, categories);
    assert(
        transactions.some(
            (transaction) =>
                transaction.date === "2026-11-01" &&
                transaction.categoryName === "Nhà cửa" &&
                transaction.amount === 4_500_000,
        ),
    );
    assert(
        transactions.some(
            (transaction) =>
                transaction.date === "2026-10-10" &&
                transaction.categoryName === "Lương" &&
                transaction.amount === 18_500_000,
        ),
    );
});
