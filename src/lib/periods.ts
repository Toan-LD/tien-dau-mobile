import {
    addDays,
    formatDayTitle,
    formatMonthTitle,
    monthRange,
    toLocalDateString,
} from "@/lib/dates";
import type { Transaction } from "@/lib/transactions";

export type PeriodMode = "day" | "week" | "month";
export type Period = { start: string; end: string };

function parse(date: string): Date {
    const [y, m, d] = date.split("-").map(Number);
    return new Date(y, m - 1, d);
}

export function periodOf(mode: PeriodMode, anchor: string): Period {
    if (mode === "day") return { start: anchor, end: anchor };
    if (mode === "week") {
        const fromMonday = (parse(anchor).getDay() + 6) % 7;
        const start = addDays(anchor, -fromMonday);
        return { start, end: addDays(start, 6) };
    }
    const [y, m] = anchor.split("-").map(Number);
    return monthRange(y, m);
}

export function shiftAnchor(
    mode: PeriodMode,
    anchor: string,
    delta: number,
): string {
    if (mode === "day") return addDays(anchor, delta);
    if (mode === "week") return addDays(anchor, 7 * delta);
    const d = parse(anchor);
    return toLocalDateString(
        new Date(d.getFullYear(), d.getMonth() + delta, 1),
    );
}

export function containsDate(period: Period, date: string): boolean {
    return period.start <= date && date <= period.end;
}

const WEEKDAYS = [
    "Chủ nhật",
    "Thứ Hai",
    "Thứ Ba",
    "Thứ Tư",
    "Thứ Năm",
    "Thứ Sáu",
    "Thứ Bảy",
];

function shortDate(date: string, today: string): string {
    const [y, m, d] = date.split("-");
    const sameYear = y === today.slice(0, 4);
    return sameYear ? `${d}/${m}` : `${d}/${m}/${y}`;
}

export function formatWeekday(date: string, today: string): string {
    if (date === today || date === addDays(today, -1)) {
        return formatDayTitle(date, today);
    }
    return `${WEEKDAYS[parse(date).getDay()]}, ${shortDate(date, today)}`;
}

export function formatPeriodTitle(
    mode: PeriodMode,
    period: Period,
    today: string,
): string {
    if (mode === "day") return formatDayTitle(period.start, today);
    if (mode === "month") {
        const [y, m] = period.start.split("-").map(Number);
        return formatMonthTitle(y, m);
    }
    const thisWeek = periodOf("week", today);
    const [sd, sm] = period.start.split("-").slice(1).reverse();
    const range = `${sd}/${sm} – ${shortDate(period.end, today)}`;
    if (period.start === thisWeek.start) return `Tuần này, ${range}`;
    if (period.start === addDays(thisWeek.start, -7)) {
        return `Tuần trước, ${range}`;
    }
    return range;
}

export type DayGroup = {
    date: string;
    expense: number;
    income: number;
    items: Transaction[];
};

export function groupByDay(list: Transaction[]): DayGroup[] {
    const groups: DayGroup[] = [];
    const byDate = new Map<string, DayGroup>();
    for (const tx of list) {
        let group = byDate.get(tx.date);
        if (!group) {
            group = { date: tx.date, expense: 0, income: 0, items: [] };
            byDate.set(tx.date, group);
            groups.push(group);
        }
        group.items.push(tx);
        if (tx.type === "income") group.income += tx.amount;
        else group.expense += tx.amount;
    }
    return groups;
}

export const NO_CATEGORY = "none";

export function filterByCategories(
    list: Transaction[],
    categoryIds: string[],
): Transaction[] {
    if (categoryIds.length === 0) return list;
    const chosen = new Set(categoryIds);
    return list.filter((tx) => chosen.has(tx.categoryId ?? NO_CATEGORY));
}
