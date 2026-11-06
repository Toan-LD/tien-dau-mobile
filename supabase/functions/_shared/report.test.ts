import { assertEquals } from "@std/assert";
import { byCategory, compare, listTransactions, summarize } from "./report.ts";
import type { Transaction, TransactionType } from "./types.ts";

function makeTransaction(
    type: TransactionType,
    amount: number,
    categoryName: string | null,
    date: string,
    createdAt = `${date}T00:00:00Z`,
): Transaction {
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
    const transactions = [
        makeTransaction("expense", 100000, "Ăn uống", "2026-11-01"),
        makeTransaction("expense", 50000, "Đi lại", "2026-11-02"),
        makeTransaction("income", 1000000, "Lương", "2026-11-03"),
    ];
    assertEquals(summarize(transactions), {
        expense: "150.000 đ",
        income: "1.000.000 đ",
        balance: "850.000 đ",
        count: 3,
    });
});

Deno.test("summarize số dư âm và mảng rỗng", () => {
    const transactionsWithNegativeBalance = [
        makeTransaction("expense", 150000, "Ăn uống", "2026-11-01"),
        makeTransaction("income", 100000, "Lương", "2026-11-03"),
    ];
    assertEquals(
        summarize(transactionsWithNegativeBalance).balance,
        "-50.000 đ",
    );
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
        const transactions = [
            makeTransaction("expense", 60000, "Ăn uống", "2026-11-01"),
            makeTransaction("expense", 20000, null, "2026-11-02"),
            makeTransaction("expense", 20000, "Đi lại", "2026-11-02"),
            makeTransaction("income", 999999, "Lương", "2026-11-03"),
        ];
        assertEquals(byCategory(transactions, "expense"), {
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
    const transactions = [
        makeTransaction("expense", 10000, "B", "2026-11-01"),
        makeTransaction("expense", 10000, "A", "2026-11-01"),
        makeTransaction("expense", 30000, "C", "2026-11-01"),
        makeTransaction("expense", 10000, "C", "2026-11-01"),
    ];
    const names = byCategory(transactions, "expense").categories.map(
        (category) => category.name,
    );
    assertEquals(names, ["C", "A", "B"]);
    assertEquals(byCategory(transactions, "expense").categories[0].count, 2);
    assertEquals(byCategory([], "expense"), { total: "0 đ", categories: [] });
});

Deno.test("compare tính thay đổi tổng", () => {
    const previous = [
        makeTransaction("expense", 800000, "Ăn uống", "2026-10-01"),
    ];
    const current = [
        makeTransaction("expense", 920000, "Ăn uống", "2026-11-01"),
    ];
    assertEquals(compare(previous, current, "expense", false), {
        base_total: "800.000 đ",
        total: "920.000 đ",
        change: "tăng 120.000 đ (+15%)",
    });
});

Deno.test("compare breakdown: top 3 tăng/giảm, bỏ mục không đổi", () => {
    const previous = [
        makeTransaction("expense", 100000, "A", "2026-10-01"),
        makeTransaction("expense", 100000, "B", "2026-10-01"),
        makeTransaction("expense", 100000, "C", "2026-10-01"),
        makeTransaction("expense", 100000, "D", "2026-10-01"),
        makeTransaction("expense", 100000, "Same", "2026-10-01"),
        makeTransaction("expense", 500000, "Gone", "2026-10-01"),
        makeTransaction("expense", 90000, "X", "2026-10-01"),
        makeTransaction("income", 1, "Lương", "2026-10-01"),
    ];
    const current = [
        makeTransaction("expense", 110000, "A", "2026-11-01"),
        makeTransaction("expense", 150000, "B", "2026-11-01"),
        makeTransaction("expense", 200000, "C", "2026-11-01"),
        makeTransaction("expense", 300000, "D", "2026-11-01"),
        makeTransaction("expense", 100000, "Same", "2026-11-01"),
        makeTransaction("expense", 40000, "New", "2026-11-01"),
        makeTransaction("expense", 10000, "X", "2026-11-01"),
    ];
    const result = compare(previous, current, "expense", true);
    assertEquals(result.biggest_increases, [
        { name: "D", change: "tăng 200.000 đ (+200%)" },
        { name: "C", change: "tăng 100.000 đ (+100%)" },
        { name: "B", change: "tăng 50.000 đ (+50%)" },
    ]);
    assertEquals(result.biggest_decreases, [
        { name: "Gone", change: "giảm 500.000 đ (-100%)" },
        { name: "X", change: "giảm 80.000 đ (-89%)" },
    ]);
    const noBreakdown = compare(previous, current, "expense", false);
    assertEquals("biggest_increases" in noBreakdown, false);
    assertEquals("biggest_decreases" in noBreakdown, false);
});

Deno.test("compare breakdown: mục chỉ có ở một kỳ vẫn được tính", () => {
    const result = compare(
        [],
        [makeTransaction("expense", 40000, "New", "2026-11-01")],
        "expense",
        true,
    );
    assertEquals(result.biggest_increases, [
        { name: "New", change: "tăng 40.000 đ (kỳ trước không có)" },
    ]);
    assertEquals(result.biggest_decreases, []);
});

Deno.test("listTransactions newest: theo date rồi createdAt giảm dần", () => {
    const transactions = [
        makeTransaction(
            "expense",
            1000,
            "A",
            "2026-11-01",
            "2026-11-01T08:00:00Z",
        ),
        makeTransaction(
            "expense",
            2000,
            "B",
            "2026-11-03",
            "2026-11-03T08:00:00Z",
        ),
        makeTransaction(
            "income",
            3000,
            "C",
            "2026-11-03",
            "2026-11-03T09:00:00Z",
        ),
        makeTransaction(
            "expense",
            4000,
            null,
            "2026-11-02",
            "2026-11-02T08:00:00Z",
        ),
        makeTransaction(
            "expense",
            5000,
            "E",
            "2026-10-30",
            "2026-10-30T08:00:00Z",
        ),
    ];
    const result = listTransactions(transactions, "newest", 2);
    assertEquals(result.total_count, 5);
    assertEquals(result.shown, 2);
    assertEquals(result.items, [
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
    const all = listTransactions(transactions, "newest", 10);
    assertEquals(all.items[2].category, "Không phân loại");
});

Deno.test(
    "listTransactions largest: theo amount giảm dần, bằng nhau thì mới nhất trước",
    () => {
        const transactions = [
            makeTransaction("expense", 5000, "Old", "2026-11-01"),
            makeTransaction("expense", 9000, "Big", "2026-10-01"),
            makeTransaction("expense", 5000, "New", "2026-11-02"),
        ];
        const categoryNames = listTransactions(
            transactions,
            "largest",
            3,
        ).items.map((item) => item.category);
        assertEquals(categoryNames, ["Big", "New", "Old"]);
    },
);
