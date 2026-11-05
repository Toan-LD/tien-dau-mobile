import type { Transaction } from "@/lib/transactions";

export type CategoryTotal = {
    categoryId: string | null;
    name: string;
    icon: string | null;
    total: number;
};
export type MonthReport = {
    income: number;
    expense: number;
    balance: number;
    expenseByCategory: CategoryTotal[];
    incomeByCategory: CategoryTotal[];
};

function counted(txs: Transaction[]) {
    return txs.filter((t) => t.type === "income" || t.type === "expense");
}

export function sumByType(txs: Transaction[]): {
    income: number;
    expense: number;
} {
    let income = 0;
    let expense = 0;
    for (const t of counted(txs)) {
        if (t.type === "income") income += t.amount;
        else expense += t.amount;
    }
    return { income, expense };
}

function groupByCategory(txs: Transaction[]): CategoryTotal[] {
    const groups = new Map<string, CategoryTotal>();
    for (const t of txs) {
        const key = t.categoryId ?? "";
        const g = groups.get(key);
        if (g) g.total += t.amount;
        else {
            groups.set(key, {
                categoryId: t.categoryId,
                name: t.category?.name ?? "Không phân loại",
                icon: t.category?.icon ?? null,
                total: t.amount,
            });
        }
    }
    return [...groups.values()].sort(
        (a, b) => b.total - a.total || a.name.localeCompare(b.name),
    );
}

export function buildMonthReport(txs: Transaction[]): MonthReport {
    const list = counted(txs);
    const { income, expense } = sumByType(list);
    return {
        income,
        expense,
        balance: income - expense,
        expenseByCategory: groupByCategory(
            list.filter((t) => t.type === "expense"),
        ),
        incomeByCategory: groupByCategory(
            list.filter((t) => t.type === "income"),
        ),
    };
}
