import { assertEquals, assertRejects } from "@std/assert";
import { fetchCategories, fetchTransactions, PAGE_SIZE } from "./data.ts";
import { createFakeClient, type FakeTransactionRow } from "./test-fakes.ts";

function makeRow(index: number): FakeTransactionRow {
    return {
        type: "expense",
        amount: "45000.00",
        category_id: "e1",
        transaction_date: "2026-11-01",
        note: `khoản ${index}`,
        created_at: "2026-11-01T00:00:00Z",
        category: { name: "Ăn uống" },
    };
}

Deno.test("fetchTransactions phân trang 1000 dòng mỗi lần", async () => {
    const rows = Array.from({ length: 2500 }, (_, index) => makeRow(index));
    const { client, calls } = createFakeClient({ transactions: rows });
    const transactions = await fetchTransactions(
        client,
        "2026-11-01",
        "2026-11-06",
    );
    assertEquals(PAGE_SIZE, 1000);
    assertEquals(transactions.length, 2500);
    assertEquals(calls.ranges, [
        [0, 999],
        [1000, 1999],
        [2000, 2999],
        [2500, 3499],
    ]);
});

Deno.test(
    "fetchTransactions vẫn lấy đủ khi server giới hạn 500 dòng mỗi trang",
    async () => {
        const rows = Array.from({ length: 1700 }, (_, index) => makeRow(index));
        const { client, calls } = createFakeClient({
            transactions: rows,
            maxRowsPerPage: 500,
        });
        const transactions = await fetchTransactions(client, "a", "b");
        assertEquals(transactions.length, 1700);
        assertEquals(
            transactions.map((transaction) => transaction.note),
            rows.map((row) => row.note),
        );
        assertEquals(calls.ranges.at(-1), [1700, 2699]);
    },
);

Deno.test(
    "fetchTransactions đủ một trang thì hỏi thêm một trang rỗng",
    async () => {
        const rows = Array.from({ length: 1000 }, (_, index) => makeRow(index));
        const { client, calls } = createFakeClient({ transactions: rows });
        const transactions = await fetchTransactions(client, "a", "b");
        assertEquals(transactions.length, 1000);
        assertEquals(calls.ranges, [
            [0, 999],
            [1000, 1999],
        ]);
    },
);

Deno.test("fetchTransactions đổi dòng DB sang Transaction", async () => {
    const { client } = createFakeClient({
        transactions: [
            makeRow(1),
            {
                ...makeRow(2),
                type: "income",
                amount: "1500000.00",
                category_id: null,
                category: null,
                note: null,
            },
        ],
    });
    assertEquals(await fetchTransactions(client, "a", "b"), [
        {
            type: "expense",
            amount: 45000,
            categoryId: "e1",
            categoryName: "Ăn uống",
            date: "2026-11-01",
            note: "khoản 1",
            createdAt: "2026-11-01T00:00:00Z",
        },
        {
            type: "income",
            amount: 1500000,
            categoryId: null,
            categoryName: null,
            date: "2026-11-01",
            note: null,
            createdAt: "2026-11-01T00:00:00Z",
        },
    ]);
});

Deno.test("fetchTransactions lọc theo ngày và chỉ lấy chi/thu", async () => {
    const { client, calls } = createFakeClient({ transactions: [] });
    await fetchTransactions(client, "2026-11-01", "2026-11-06");
    assertEquals(calls.tables, ["transactions"]);
    assertEquals(calls.filters, [
        ["gte", "transaction_date", "2026-11-01"],
        ["lte", "transaction_date", "2026-11-06"],
        ["in", "type", ["expense", "income"]],
    ]);
    assertEquals(calls.orders, ["transaction_date", "created_at", "id"]);
});

Deno.test("fetchTransactions ném lỗi từ Supabase", async () => {
    const { client } = createFakeClient({ error: { message: "hỏng rồi" } });
    await assertRejects(
        () => fetchTransactions(client, "a", "b"),
        Error,
        "hỏng rồi",
    );
});

Deno.test(
    "fetchCategories đọc id, tên, loại theo thứ tự hiển thị",
    async () => {
        const { client, calls } = createFakeClient({
            categories: [
                { id: "e1", name: "Ăn uống", type: "expense" },
                { id: "i1", name: "Lương", type: "income" },
            ],
        });
        assertEquals(await fetchCategories(client), [
            { id: "e1", name: "Ăn uống", type: "expense" },
            { id: "i1", name: "Lương", type: "income" },
        ]);
        assertEquals(calls.tables, ["categories"]);
        assertEquals(calls.selects, ["id, name, type"]);
        assertEquals(calls.orders, ["type", "sort_order"]);
    },
);

Deno.test("fetchCategories ném lỗi từ Supabase", async () => {
    const { client } = createFakeClient({ error: { message: "hỏng rồi" } });
    await assertRejects(() => fetchCategories(client), Error, "hỏng rồi");
});
