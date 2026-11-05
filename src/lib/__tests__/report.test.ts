import {
    buildMonthReport,
    formatShare,
    historySummary,
    monthlyTotals,
    movingAverage,
    niceTicks,
    sumByType,
    toDonutSlices,
    type CategoryTotal,
} from "@/lib/report";
import type { Transaction, TxCategory } from "@/lib/transactions";

const catAn = { id: "c1", name: "Ăn uống", icon: "restaurant" };
const catHoaDon = { id: "c2", name: "Hoá đơn", icon: "receipt" };
const catLuong = { id: "c3", name: "Lương", icon: "cash" };
const catThuong = { id: "c4", name: "Thưởng", icon: "gift" };

let n = 0;
function tx(
    type: "expense" | "income",
    amount: number,
    category: TxCategory,
): Transaction {
    n += 1;
    return {
        id: `t${n}`,
        type,
        amount,
        categoryId: category?.id ?? null,
        category,
        note: null,
        date: "2026-11-05",
        createdAt: "2026-11-05T01:00:00Z",
        walletId: "w1",
    };
}

describe("buildMonthReport", () => {
    it("totals and groups by category, largest first", () => {
        const r = buildMonthReport([
            tx("expense", 3200000, catHoaDon),
            tx("expense", 2500000, catAn),
            tx("expense", 100000, null),
            tx("income", 13000000, catLuong),
            tx("income", 2000000, catThuong),
        ]);
        expect(r).toMatchObject({
            income: 15000000,
            expense: 5800000,
            balance: 9200000,
        });
        expect(r.expenseByCategory.map((c) => c.name)).toEqual([
            "Hoá đơn",
            "Ăn uống",
            "Không phân loại",
        ]);
        expect(r.incomeByCategory[0]).toMatchObject({
            name: "Lương",
            total: 13000000,
        });
    });

    it("is empty for no transactions", () => {
        expect(buildMonthReport([])).toEqual({
            income: 0,
            expense: 0,
            balance: 0,
            expenseByCategory: [],
            incomeByCategory: [],
        });
    });

    it("merges the same category and breaks ties by name", () => {
        const r = buildMonthReport([
            tx("expense", 100, catHoaDon),
            tx("expense", 100, catAn),
            tx("expense", 50, catAn),
            tx("expense", 150, catHoaDon),
        ]);
        expect(r.expenseByCategory).toEqual(
            [
                {
                    categoryId: "c1",
                    name: "Ăn uống",
                    icon: "restaurant",
                    total: 150,
                },
                {
                    categoryId: "c2",
                    name: "Hoá đơn",
                    icon: "receipt",
                    total: 250,
                },
            ].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name)),
        );
    });

    it("skips transfers", () => {
        const transfer = {
            ...tx("expense", 999, catAn),
            type: "transfer",
        } as unknown as Transaction;
        expect(buildMonthReport([transfer]).expense).toBe(0);
    });
});

describe("sumByType", () => {
    it("sums income and expense", () => {
        expect(
            sumByType([
                tx("expense", 35000, catAn),
                tx("income", 5000, catLuong),
            ]),
        ).toEqual({
            income: 5000,
            expense: 35000,
        });
    });
});

describe("toDonutSlices", () => {
    const cat = (name: string, total: number): CategoryTotal => ({
        categoryId: name,
        name,
        icon: null,
        total,
    });

    it("gives each category its share and a colour slot in order", () => {
        expect(toDonutSlices([cat("Ăn", 300), cat("Xe", 100)])).toEqual([
            {
                key: "Ăn",
                name: "Ăn",
                icon: null,
                total: 300,
                share: 0.75,
                slot: 0,
            },
            {
                key: "Xe",
                name: "Xe",
                icon: null,
                total: 100,
                share: 0.25,
                slot: 1,
            },
        ]);
    });

    it("keeps five slices and folds the rest into Khác", () => {
        const items = [
            cat("a", 60),
            cat("b", 10),
            cat("c", 10),
            cat("d", 10),
            cat("e", 5),
            cat("f", 3),
            cat("g", 2),
        ];
        const slices = toDonutSlices(items);
        expect(slices.map((s) => s.name)).toEqual([
            "a",
            "b",
            "c",
            "d",
            "e",
            "Khác",
        ]);
        expect(slices[5]).toMatchObject({
            key: "other",
            total: 5,
            share: 0.05,
            slot: "other",
        });
    });

    it("keeps a single leftover under its own name, in the grey slot", () => {
        const items = ["a", "b", "c", "d", "e", "f"].map((n) => cat(n, 10));
        const slices = toDonutSlices(items);
        expect(slices).toHaveLength(6);
        expect(slices[5]).toMatchObject({
            key: "f",
            name: "f",
            total: 10,
            slot: "other",
        });
    });

    it("returns nothing when there is nothing to show", () => {
        expect(toDonutSlices([])).toEqual([]);
    });
});

describe("monthlyTotals", () => {
    const now = { year: 2026, month: 11 };

    it("sums each month and fills months with nothing as zero", () => {
        const rows = [
            { date: "2026-08-03", amount: 100 },
            { date: "2026-08-20", amount: 50 },
            { date: "2026-10-01", amount: 30 },
        ];
        expect(monthlyTotals(rows, now)).toEqual([
            { year: 2026, month: 8, total: 150 },
            { year: 2026, month: 9, total: 0 },
            { year: 2026, month: 10, total: 30 },
            { year: 2026, month: 11, total: 0 },
        ]);
    });

    it("runs across a new year", () => {
        const rows = [{ date: "2025-12-31", amount: 10 }];
        expect(
            monthlyTotals(rows, { year: 2026, month: 1 }).map((m) => m.month),
        ).toEqual([12, 1]);
    });

    it("returns nothing when there are no rows", () => {
        expect(monthlyTotals([], now)).toEqual([]);
    });
});

describe("historySummary", () => {
    it("gives the total, the monthly average and the biggest month", () => {
        const months = [
            { year: 2026, month: 9, total: 100 },
            { year: 2026, month: 10, total: 0 },
            { year: 2026, month: 11, total: 200 },
        ];
        expect(historySummary(months)).toEqual({
            total: 300,
            average: 100,
            peak: { year: 2026, month: 11, total: 200 },
        });
    });
});

describe("formatShare", () => {
    it("rounds to a whole percent and never shows a real share as 0%", () => {
        expect(formatShare(0.3349)).toBe("33%");
        expect(formatShare(1)).toBe("100%");
        expect(formatShare(0.004)).toBe("<1%");
        expect(formatShare(0)).toBe("0%");
    });
});

describe("movingAverage", () => {
    it("averages each value with up to two before it", () => {
        expect(movingAverage([300, 0, 600, 300])).toEqual([300, 150, 300, 300]);
    });

    it("returns nothing for nothing", () => {
        expect(movingAverage([])).toEqual([]);
    });
});

describe("niceTicks", () => {
    it("picks round steps that cover the largest value", () => {
        expect(niceTicks(2_350_000)).toEqual([
            0, 1_000_000, 2_000_000, 3_000_000,
        ]);
        expect(niceTicks(180_000)).toEqual([
            0, 50_000, 100_000, 150_000, 200_000,
        ]);
        expect(niceTicks(1000)).toEqual([0, 250, 500, 750, 1000]);
    });

    it("still gives an axis when everything is zero", () => {
        expect(niceTicks(0)).toEqual([0, 1]);
    });
});
