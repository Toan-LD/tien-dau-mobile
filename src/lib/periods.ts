import {
    addDays,
    formatDayTitle,
    formatMonthTitle,
    monthRange,
    toLocalDateString,
    type LocalDate,
} from "@/lib/dates";
import type { Transaction } from "@/lib/transactions";

// The Danh sách tab shows one day, one week or one month at a time. A period is
// described by an "anchor" day inside it: switching mode keeps the anchor, so
// going from day 02/11 to "week" shows the week that contains 02/11.

export type PeriodMode = "day" | "week" | "month";
export type Period = { start: LocalDate; end: LocalDate };

function parse(date: LocalDate): Date {
    const [y, m, d] = date.split("-").map(Number);
    return new Date(y, m - 1, d);
}

export function periodOf(mode: PeriodMode, anchor: LocalDate): Period {
    if (mode === "day") return { start: anchor, end: anchor };
    if (mode === "week") {
        // Weeks start on Monday. getDay(): Sunday 0, Monday 1 … Saturday 6.
        const fromMonday = (parse(anchor).getDay() + 6) % 7;
        const start = addDays(anchor, -fromMonday);
        return { start, end: addDays(start, 6) };
    }
    const [y, m] = anchor.split("-").map(Number);
    return monthRange(y, m);
}

// The anchor one period earlier (delta -1) or later (+1). Months move to the
// 1st, so stepping back from 31/03 lands in February instead of skipping it.
export function shiftAnchor(
    mode: PeriodMode,
    anchor: LocalDate,
    delta: number,
): LocalDate {
    if (mode === "day") return addDays(anchor, delta);
    if (mode === "week") return addDays(anchor, 7 * delta);
    const d = parse(anchor);
    return toLocalDateString(
        new Date(d.getFullYear(), d.getMonth() + delta, 1),
    );
}

export function containsDate(period: Period, date: LocalDate): boolean {
    // YYYY-MM-DD strings sort the same way as the dates they name.
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

// dd/mm, plus /yyyy when the date is not in the current year.
function shortDate(date: LocalDate, today: LocalDate): string {
    const [y, m, d] = date.split("-");
    const sameYear = y === today.slice(0, 4);
    return sameYear ? `${d}/${m}` : `${d}/${m}/${y}`;
}

// Day heading inside a week or month list: "Thứ Hai, 02/11", with
// "Hôm nay" / "Hôm qua" for the two most recent days.
export function formatWeekday(date: LocalDate, today: LocalDate): string {
    if (date === today || date === addDays(today, -1)) {
        return formatDayTitle(date, today);
    }
    return `${WEEKDAYS[parse(date).getDay()]}, ${shortDate(date, today)}`;
}

export function formatPeriodTitle(
    mode: PeriodMode,
    period: Period,
    today: LocalDate,
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
    date: LocalDate;
    expense: number;
    income: number;
    items: Transaction[];
};

// Splits a list (already newest first) into one group per day, in the same
// order, with each day's totals.
export function groupByDay(list: Transaction[]): DayGroup[] {
    const groups: DayGroup[] = [];
    const byDate = new Map<LocalDate, DayGroup>();
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

// Filter key for transactions without a category ("Không phân loại").
export const NO_CATEGORY = "none";

// The Danh sách category filter: keeps rows in any of the chosen categories.
// An empty choice means no filter (the same list comes back).
export function filterByCategories(
    list: Transaction[],
    categoryIds: string[],
): Transaction[] {
    if (categoryIds.length === 0) return list;
    const chosen = new Set(categoryIds);
    return list.filter((tx) => chosen.has(tx.categoryId ?? NO_CATEGORY));
}
