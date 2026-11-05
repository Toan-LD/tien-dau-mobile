import { buildMonthReport, sumByType } from "@/lib/report";
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
