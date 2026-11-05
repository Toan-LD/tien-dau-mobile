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

// One slice of the donut in the period report. `slot` picks the colour: 0..4
// are the five chart colours in order, "other" is grey.
export type DonutSlice = {
    key: string;
    name: string;
    icon: string | null;
    total: number;
    share: number;
    slot: number | "other";
};

const DONUT_SLOTS = 5;

// Category totals (largest first) as donut slices: the five biggest get a
// colour each, the rest share one grey "Khác" slice. A single leftover keeps
// its own name rather than becoming a "Khác" of one.
export function toDonutSlices(items: CategoryTotal[]): DonutSlice[] {
    const sum = items.reduce((s, c) => s + c.total, 0);
    if (sum === 0) return [];
    const slice = (c: CategoryTotal, slot: DonutSlice["slot"]): DonutSlice => ({
        key: c.categoryId ?? "none",
        name: c.name,
        icon: c.icon,
        total: c.total,
        share: c.total / sum,
        slot,
    });
    const top = items.slice(0, DONUT_SLOTS).map((c, i) => slice(c, i));
    const rest = items.slice(DONUT_SLOTS);
    if (rest.length === 0) return top;
    if (rest.length === 1) return [...top, slice(rest[0], "other")];
    const restTotal = rest.reduce((s, c) => s + c.total, 0);
    return [
        ...top,
        {
            key: "other",
            name: "Khác",
            icon: null,
            total: restTotal,
            share: restTotal / sum,
            slot: "other",
        },
    ];
}

export type MonthTotal = { year: number; month: number; total: number };

// One category's history: a total for every month from its first entry up to
// `until` (the current month), with empty months as zero so the chart's
// columns line up with the calendar.
export function monthlyTotals(
    rows: { date: string; amount: number }[],
    until: { year: number; month: number },
): MonthTotal[] {
    if (rows.length === 0) return [];
    const byMonth = new Map<string, number>();
    let first = rows[0].date.slice(0, 7);
    for (const r of rows) {
        const key = r.date.slice(0, 7);
        byMonth.set(key, (byMonth.get(key) ?? 0) + r.amount);
        if (key < first) first = key;
    }
    const months: MonthTotal[] = [];
    let [year, month] = first.split("-").map(Number);
    while (year < until.year || (year === until.year && month <= until.month)) {
        const key = `${year}-${String(month).padStart(2, "0")}`;
        months.push({ year, month, total: byMonth.get(key) ?? 0 });
        month += 1;
        if (month > 12) {
            month = 1;
            year += 1;
        }
    }
    return months;
}

export function historySummary(months: MonthTotal[]): {
    total: number;
    average: number;
    peak: MonthTotal | null;
} {
    const total = months.reduce((s, m) => s + m.total, 0);
    const peak = months.reduce<MonthTotal | null>(
        (best, m) => (best === null || m.total > best.total ? m : best),
        null,
    );
    return {
        total,
        average: months.length > 0 ? Math.round(total / months.length) : 0,
        peak,
    };
}

// A share (0..1) as a whole percent; tiny shares read "<1%" instead of "0%".
export function formatShare(share: number): string {
    const p = share * 100;
    if (p > 0 && p < 1) return "<1%";
    return `${Math.round(p)}%`;
}

// Each month's average with up to two months before it: the trend line on
// the category history chart, in the same unit as the columns.
export function movingAverage(values: number[], window = 3): number[] {
    return values.map((_, i) => {
        const from = Math.max(0, i - window + 1);
        const part = values.slice(from, i + 1);
        return Math.round(part.reduce((s, v) => s + v, 0) / part.length);
    });
}

// Round axis values from 0 up past `max`, about four steps (0, 500k, 1tr…).
export function niceTicks(max: number, steps = 4): number[] {
    if (max <= 0) return [0, 1];
    const rough = max / steps;
    const magnitude = 10 ** Math.floor(Math.log10(rough));
    const nice = [1, 2, 2.5, 5, 10].find((n) => n * magnitude >= rough) ?? 10;
    const step = nice * magnitude;
    const top = Math.ceil(max / step) * step;
    const ticks: number[] = [];
    for (let v = 0; v <= top + step / 2; v += step) ticks.push(Math.round(v));
    return ticks;
}
