import type { Category } from "@/lib/categories";
import { toLocalDateString } from "@/lib/dates";
import {
    deleteSampleData,
    generateSampleTransactions,
    insertSampleData,
    SAMPLE_MARKER,
} from "@/lib/sample-data";
import { clearDefaultWalletCache } from "@/lib/transactions";
import { fake } from "@/test-utils/supabase-mock";

jest.mock("@/lib/supabase", () => ({
    supabase: jest.requireActual("@/test-utils/supabase-mock").fakeSupabase,
}));

function cat(name: string, type: "expense" | "income"): Category {
    return { id: `${type}-${name}`, name, icon: null, type, sortOrder: 0 };
}

const categories: Category[] = [
    cat("Ăn uống", "expense"),
    cat("Cà phê", "expense"),
    cat("Đi lại", "expense"),
    cat("Mua sắm", "expense"),
    cat("Hoá đơn", "expense"),
    cat("Nhà cửa", "expense"),
    cat("Giải trí", "expense"),
    cat("Lương", "income"),
    cat("Thưởng", "income"),
];

// 5 Nov 2026, 15:30 local time.
const now = new Date(2026, 10, 5, 15, 30);
const rows = generateSampleTransactions({
    from: "2026-01-01",
    now,
    categories,
    seed: 42,
});

it("fills every month from January to now with a realistic amount of rows", () => {
    expect(rows.length).toBeGreaterThan(600);
    const months = new Set(rows.map((r) => r.transaction_date.slice(0, 7)));
    expect(months.size).toBe(11);
});

it("keeps dates in range and never goes past now", () => {
    for (const r of rows) {
        expect(r.transaction_date >= "2026-01-01").toBe(true);
        expect(r.transaction_date <= "2026-11-05").toBe(true);
        expect(new Date(r.created_at).getTime()).toBeLessThanOrEqual(
            now.getTime(),
        );
    }
});

it("records each row at a time on its own local day", () => {
    for (const r of rows) {
        expect(toLocalDateString(new Date(r.created_at))).toBe(
            r.transaction_date,
        );
    }
});

it("uses whole thousands of đồng, always positive", () => {
    for (const r of rows) {
        expect(Number.isInteger(r.amount)).toBe(true);
        expect(r.amount).toBeGreaterThan(0);
        expect(r.amount % 1000).toBe(0);
    }
});

it("pays the salary on the 10th of every month so far", () => {
    const salary = rows.filter((r) => r.category_id === "income-Lương");
    expect(salary.map((r) => r.transaction_date)).toEqual(
        Array.from(
            { length: 10 },
            (_, i) => `2026-${String(i + 1).padStart(2, "0")}-10`,
        ),
    );
});

it("only uses the categories it was given, with the right type", () => {
    const byId = new Map(categories.map((c) => [c.id, c]));
    for (const r of rows) {
        const c = byId.get(r.category_id);
        expect(c?.type).toBe(r.type);
    }
});

it("is the same for the same seed", () => {
    const again = generateSampleTransactions({
        from: "2026-01-01",
        now,
        categories,
        seed: 42,
    });
    expect(again).toEqual(rows);
});

it("skips a type that has no categories", () => {
    const onlyExpense = generateSampleTransactions({
        from: "2026-10-01",
        now,
        categories: categories.filter((c) => c.type === "expense"),
        seed: 1,
    });
    expect(onlyExpense.every((r) => r.type === "expense")).toBe(true);
});

it('puts rows whose category is missing into "Khác", not another category', () => {
    const withOther = [...categories, cat("Khác", "income")];
    const result = generateSampleTransactions({
        from: "2026-01-01",
        now,
        categories: withOther,
        seed: 42,
    });
    const salary = result.filter((r) => r.category_id === "income-Lương");
    expect(salary.every((r) => r.transaction_date.endsWith("-10"))).toBe(true);
    expect(result.some((r) => r.category_id === "income-Khác")).toBe(true);
});

describe("insertSampleData / deleteSampleData", () => {
    beforeEach(() => {
        fake.reset();
        clearDefaultWalletCache();
    });

    it("marks every inserted row so it can be removed later", async () => {
        fake.enqueue("wallets", { data: { id: "w1" } });
        fake.enqueue("categories", {
            data: categories.map((c) => ({
                id: c.id,
                name: c.name,
                icon: c.icon,
                type: c.type,
                sort_order: 0,
            })),
        });
        const count = await insertSampleData(now);
        expect(count).toBeGreaterThan(600);
        const inserted = fake
            .callsTo("insert")
            .flatMap((args) => args[0] as Record<string, unknown>[]);
        expect(inserted).toHaveLength(count);
        for (const row of inserted) {
            expect(row).toMatchObject({
                user_id: "user-1",
                wallet_id: "w1",
                receipt_url: SAMPLE_MARKER,
            });
        }
    });

    it("deletes only marked rows", async () => {
        await deleteSampleData();
        expect(fake.callsTo("delete")).toHaveLength(1);
        expect(fake.callsTo("eq")).toEqual([["receipt_url", SAMPLE_MARKER]]);
    });
});
