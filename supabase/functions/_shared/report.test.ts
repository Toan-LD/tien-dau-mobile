import { assertEquals } from "@std/assert";
import { byCategory, compare, listTxs, summarize } from "./report.ts";
import type { Tx, TxType } from "./types.ts";

function tx(
    type: TxType,
    amount: number,
    categoryName: string | null,
    date: string,
    createdAt = `${date}T00:00:00Z`,
): Tx {
    return {
        type,
        amount,
        categoryId: categoryName,
        categoryName,
        date,
        note: null,
        createdAt,
    };
}

Deno.test("summarize tính chi, thu, số dư", () => {
    const txs = [
        tx("expense", 100000, "Ăn uống", "2026-11-01"),
        tx("expense", 50000, "Đi lại", "2026-11-02"),
        tx("income", 1000000, "Lương", "2026-11-03"),
    ];
    assertEquals(summarize(txs), {
        expense: "150.000 đ",
        income: "1.000.000 đ",
        balance: "850.000 đ",
        count: 3,
    });
});

Deno.test("summarize số dư âm và mảng rỗng", () => {
    const over = [
        tx("expense", 150000, "Ăn uống", "2026-11-01"),
        tx("income", 100000, "Lương", "2026-11-03"),
    ];
    assertEquals(summarize(over).balance, "-50.000 đ");
    assertEquals(summarize([]), {
        expense: "0 đ",
        income: "0 đ",
        balance: "0 đ",
        count: 0,
    });
});

Deno.test(
    "byCategory chỉ tính đúng loại, gộp không phân loại, tính tỷ lệ",
    () => {
        const txs = [
            tx("expense", 60000, "Ăn uống", "2026-11-01"),
            tx("expense", 20000, null, "2026-11-02"),
            tx("expense", 20000, "Đi lại", "2026-11-02"),
            tx("income", 999999, "Lương", "2026-11-03"),
        ];
        assertEquals(byCategory(txs, "expense"), {
            total: "100.000 đ",
            categories: [
                { name: "Ăn uống", total: "60.000 đ", share: "60%", count: 1 },
                { name: "Đi lại", total: "20.000 đ", share: "20%", count: 1 },
                {
                    name: "Không phân loại",
                    total: "20.000 đ",
                    share: "20%",
                    count: 1,
                },
            ],
        });
    },
);

Deno.test("byCategory sắp giảm dần theo tổng, bằng nhau theo tên", () => {
    const txs = [
        tx("expense", 10000, "B", "2026-11-01"),
        tx("expense", 10000, "A", "2026-11-01"),
        tx("expense", 30000, "C", "2026-11-01"),
        tx("expense", 10000, "C", "2026-11-01"),
    ];
    const names = byCategory(txs, "expense").categories.map((c) => c.name);
    assertEquals(names, ["C", "A", "B"]);
    assertEquals(byCategory(txs, "expense").categories[0].count, 2);
    assertEquals(byCategory([], "expense"), { total: "0 đ", categories: [] });
});

Deno.test("compare tính thay đổi tổng", () => {
    const base = [tx("expense", 800000, "Ăn uống", "2026-10-01")];
    const cur = [tx("expense", 920000, "Ăn uống", "2026-11-01")];
    assertEquals(compare(base, cur, "expense", false), {
        base_total: "800.000 đ",
        total: "920.000 đ",
        change: "tăng 120.000 đ (+15%)",
    });
});

Deno.test("compare breakdown: top 3 tăng/giảm, bỏ mục không đổi", () => {
    const base = [
        tx("expense", 100000, "A", "2026-10-01"),
        tx("expense", 100000, "B", "2026-10-01"),
        tx("expense", 100000, "C", "2026-10-01"),
        tx("expense", 100000, "D", "2026-10-01"),
        tx("expense", 100000, "Same", "2026-10-01"),
        tx("expense", 500000, "Gone", "2026-10-01"),
        tx("expense", 90000, "X", "2026-10-01"),
        tx("income", 1, "Lương", "2026-10-01"),
    ];
    const cur = [
        tx("expense", 110000, "A", "2026-11-01"),
        tx("expense", 150000, "B", "2026-11-01"),
        tx("expense", 200000, "C", "2026-11-01"),
        tx("expense", 300000, "D", "2026-11-01"),
        tx("expense", 100000, "Same", "2026-11-01"),
        tx("expense", 40000, "New", "2026-11-01"),
        tx("expense", 10000, "X", "2026-11-01"),
    ];
    const r = compare(base, cur, "expense", true);
    assertEquals(r.biggest_increases, [
        { name: "D", change: "tăng 200.000 đ (+200%)" },
        { name: "C", change: "tăng 100.000 đ (+100%)" },
        { name: "B", change: "tăng 50.000 đ (+50%)" },
    ]);
    assertEquals(r.biggest_decreases, [
        { name: "Gone", change: "giảm 500.000 đ (-100%)" },
        { name: "X", change: "giảm 80.000 đ (-89%)" },
    ]);
    const noBreakdown = compare(base, cur, "expense", false);
    assertEquals("biggest_increases" in noBreakdown, false);
    assertEquals("biggest_decreases" in noBreakdown, false);
});

Deno.test("compare breakdown: mục chỉ có ở một kỳ vẫn được tính", () => {
    const r = compare(
        [],
        [tx("expense", 40000, "New", "2026-11-01")],
        "expense",
        true,
    );
    assertEquals(r.biggest_increases, [
        { name: "New", change: "tăng 40.000 đ (kỳ trước không có)" },
    ]);
    assertEquals(r.biggest_decreases, []);
});

Deno.test("listTxs newest: theo date rồi createdAt giảm dần", () => {
    const txs = [
        tx("expense", 1000, "A", "2026-11-01", "2026-11-01T08:00:00Z"),
        tx("expense", 2000, "B", "2026-11-03", "2026-11-03T08:00:00Z"),
        tx("income", 3000, "C", "2026-11-03", "2026-11-03T09:00:00Z"),
        tx("expense", 4000, null, "2026-11-02", "2026-11-02T08:00:00Z"),
        tx("expense", 5000, "E", "2026-10-30", "2026-10-30T08:00:00Z"),
    ];
    const r = listTxs(txs, "newest", 2);
    assertEquals(r.total_count, 5);
    assertEquals(r.shown, 2);
    assertEquals(r.items, [
        {
            date: "03/11/2026",
            kind: "thu",
            category: "C",
            amount: "3.000 đ",
            note: null,
        },
        {
            date: "03/11/2026",
            kind: "chi",
            category: "B",
            amount: "2.000 đ",
            note: null,
        },
    ]);
    const all = listTxs(txs, "newest", 10);
    assertEquals(all.items[2].category, "Không phân loại");
});

Deno.test(
    "listTxs largest: theo amount giảm dần, bằng nhau thì mới nhất trước",
    () => {
        const txs = [
            tx("expense", 5000, "Old", "2026-11-01"),
            tx("expense", 9000, "Big", "2026-10-01"),
            tx("expense", 5000, "New", "2026-11-02"),
        ];
        const cats = listTxs(txs, "largest", 3).items.map((i) => i.category);
        assertEquals(cats, ["Big", "New", "Old"]);
    },
);
