import { assert, assertEquals } from "@std/assert";
import type { CategoryRef, Transaction } from "../_shared/types.ts";
import { runTool, TOOL_DEFINITIONS, type ToolContext } from "./tools.ts";

const categories: CategoryRef[] = [
    { id: "e1", name: "Ăn uống", type: "expense" },
    { id: "e2", name: "Khác", type: "expense" },
    { id: "i1", name: "Lương", type: "income" },
    { id: "i2", name: "Khác", type: "income" },
];

const transactions: Transaction[] = [
    {
        type: "expense",
        amount: 100000,
        categoryId: "e1",
        categoryName: "Ăn uống",
        date: "2026-11-02",
        note: "phở",
        createdAt: "2026-11-02T01:00:00Z",
    },
    {
        type: "expense",
        amount: 30000,
        categoryId: "e2",
        categoryName: "Khác",
        date: "2026-11-03",
        note: null,
        createdAt: "2026-11-03T01:00:00Z",
    },
    {
        type: "income",
        amount: 5000000,
        categoryId: "i1",
        categoryName: "Lương",
        date: "2026-11-04",
        note: null,
        createdAt: "2026-11-04T01:00:00Z",
    },
    {
        type: "income",
        amount: 200000,
        categoryId: "i2",
        categoryName: "Khác",
        date: "2026-11-05",
        note: null,
        createdAt: "2026-11-05T01:00:00Z",
    },
    {
        type: "expense",
        amount: 15000,
        categoryId: null,
        categoryName: null,
        date: "2026-11-05",
        note: null,
        createdAt: "2026-11-05T02:00:00Z",
    },
];

function makeContext(rows: Transaction[] = transactions) {
    const requests: [string, string][] = [];
    const context: ToolContext = {
        today: "2026-11-06",
        categories,
        loadTransactions: (start, end) => {
            requests.push([start, end]);
            return Promise.resolve(rows);
        },
    };
    return { context, requests };
}

async function call(name: string, args: unknown, context: ToolContext) {
    const rawArgs = typeof args === "string" ? args : JSON.stringify(args);
    return JSON.parse(await runTool(name, rawArgs, context));
}

Deno.test("get_summary hỏi đúng khoảng và trả nhãn kỳ", async () => {
    const { context, requests } = makeContext();
    const result = await call("get_summary", { period: "this_month" }, context);
    assertEquals(requests, [["2026-11-01", "2026-11-06"]]);
    assertEquals(result.period, "Tháng 11/2026 (01/11/2026 – 06/11/2026)");
    assertEquals(result.expense, "145.000 đ");
    assertEquals(result.count, 5);
});

Deno.test("get_by_category trả từng mục", async () => {
    const { context } = makeContext();
    const result = await call(
        "get_by_category",
        { period: "this_month", type: "expense" },
        context,
    );
    assertEquals(result.type, "expense");
    assertEquals(result.total, "145.000 đ");
    assertEquals(result.categories[0].name, "Ăn uống");
});

Deno.test("list_transactions lọc 'Khác' của cả chi lẫn thu", async () => {
    const { context } = makeContext();
    const result = await call(
        "list_transactions",
        { period: "this_month", category: "Khác" },
        context,
    );
    assertEquals(result.total_count, 2);
    assertEquals(
        result.items.map((item: { kind: string }) => item.kind).sort(),
        ["chi", "thu"],
    );
});

Deno.test("list_transactions lọc 'Không phân loại' và theo loại", async () => {
    const { context } = makeContext();
    const uncategorized = await call(
        "list_transactions",
        { period: "this_month", category: "Không phân loại" },
        context,
    );
    assertEquals(uncategorized.total_count, 1);
    const income = await call(
        "list_transactions",
        { period: "this_month", type: "income", sort: "largest" },
        context,
    );
    assertEquals(income.total_count, 2);
    assertEquals(income.items[0].amount, "5.000.000 đ");
});

Deno.test("list_transactions kẹp limit trong 1..20, mặc định 10", async () => {
    const many: Transaction[] = Array.from({ length: 30 }, (_, index) => ({
        ...transactions[0],
        createdAt: `2026-11-02T01:${String(index).padStart(2, "0")}:00Z`,
    }));
    const { context } = makeContext(many);
    const capped = await call(
        "list_transactions",
        { period: "this_month", limit: 50 },
        context,
    );
    assertEquals(capped.shown, 20);
    assertEquals(capped.total_count, 30);
    const defaulted = await call(
        "list_transactions",
        { period: "this_month" },
        context,
    );
    assertEquals(defaulted.shown, 10);
    const floored = await call(
        "list_transactions",
        { period: "this_month", limit: 0 },
        context,
    );
    assertEquals(floored.shown, 1);
});

Deno.test(
    "list_transactions từ chối limit không nguyên và sort sai",
    async () => {
        const { context } = makeContext();
        const fraction = await call(
            "list_transactions",
            { period: "this_month", limit: 2.5 },
            context,
        );
        assert(fraction.error.includes("limit"));
        const sort = await call(
            "list_transactions",
            { period: "this_month", sort: "oldest" },
            context,
        );
        assert(sort.error.includes("sort"));
    },
);

Deno.test("compare_periods gọi cả hai khoảng", async () => {
    const { context, requests } = makeContext();
    const result = await call(
        "compare_periods",
        { base_period: "last_month", period: "this_month", type: "expense" },
        context,
    );
    assertEquals(requests, [
        ["2026-10-01", "2026-10-31"],
        ["2026-11-01", "2026-11-06"],
    ]);
    assertEquals(result.base_period, "Tháng 10/2026 (01/10/2026 – 31/10/2026)");
    assertEquals(result.period, "Tháng 11/2026 (01/11/2026 – 06/11/2026)");
    assertEquals(result.base_total, "145.000 đ");
    assert("biggest_increases" in result);
    assert(!("category" in result));
});

Deno.test("compare_periods với category bỏ phần breakdown", async () => {
    const { context } = makeContext();
    const result = await call(
        "compare_periods",
        {
            base_period: "last_month",
            period: "this_month",
            type: "expense",
            category: "an uong",
        },
        context,
    );
    assertEquals(result.category, "an uong");
    assertEquals(result.total, "100.000 đ");
    assert(!("biggest_increases" in result));
});

Deno.test("list_categories chỉ trả khoá được hỏi", async () => {
    const { context } = makeContext();
    assertEquals(await call("list_categories", {}, context), {
        expense: ["Ăn uống", "Khác"],
        income: ["Lương", "Khác"],
    });
    assertEquals(await call("list_categories", { type: "income" }, context), {
        income: ["Lương", "Khác"],
    });
});

Deno.test("lỗi tham số trả { error } thay vì ném", async () => {
    const { context, requests } = makeContext();
    assert((await call("get_summary", "{hỏng", context)).error);
    assert((await call("get_summary", "[]", context)).error);
    assert((await call("get_summary", {}, context)).error.includes("period"));
    const period = await call(
        "get_summary",
        { period: "last_decade" },
        context,
    );
    assert(period.error.includes("this_month"));
    const name = await call(
        "list_transactions",
        { period: "today", category: "Du lịch" },
        context,
    );
    assert(name.error.includes("Ăn uống"));
    const missingType = await call(
        "get_by_category",
        { period: "today" },
        context,
    );
    assert(missingType.error.includes("type"));
    const badType = await call(
        "compare_periods",
        { base_period: "today", period: "today", type: "transfer" },
        context,
    );
    assert(badType.error.includes("type"));
    assertEquals(requests, []);
    assertEquals(await call("lam_thơ", {}, context), {
        error: "Không có công cụ lam_thơ",
    });
});

Deno.test("lỗi tải dữ liệu không bị nuốt", async () => {
    const { context } = makeContext();
    context.loadTransactions = () => Promise.reject(new Error("db hỏng"));
    let thrown: unknown;
    try {
        await runTool("get_summary", '{"period":"today"}', context);
    } catch (error) {
        thrown = error;
    }
    assert(thrown instanceof Error);
});

Deno.test("TOOL_DEFINITIONS có đúng tham số bắt buộc", () => {
    const required = Object.fromEntries(
        TOOL_DEFINITIONS.map((definition) => {
            assertEquals(definition.type, "function");
            if (definition.type !== "function") throw new Error();
            const parameters = definition.function.parameters as {
                required?: string[];
            };
            return [definition.function.name, parameters.required ?? []];
        }),
    );
    assertEquals(required, {
        get_summary: ["period"],
        get_by_category: ["period", "type"],
        compare_periods: ["base_period", "period", "type"],
        list_transactions: ["period"],
        list_categories: [],
    });
});
