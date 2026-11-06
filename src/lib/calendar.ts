import { toLocalDateString } from "@/lib/dates";

export type YearMonth = { year: number; month: number };

export type CalendarDay = { date: string; inMonth: boolean };

export function monthGrid(year: number, month: number): CalendarDay[][] {
    // getDay(): Sunday 0, Monday 1 … Saturday 6.
    const blanks = (new Date(year, month - 1, 1).getDay() + 6) % 7;

    const weeks: CalendarDay[][] = [];
    for (let w = 0; w < 6; w++) {
        const week: CalendarDay[] = [];
        for (let d = 0; d < 7; d++) {
            const date = new Date(year, month - 1, w * 7 + d - blanks + 1);
            week.push({
                date: toLocalDateString(date),
                inMonth: date.getMonth() === month - 1,
            });
        }
        weeks.push(week);
    }
    return weeks;
}

export function shiftMonth(value: YearMonth, n: number): YearMonth {
    const d = new Date(value.year, value.month - 1 + n, 1);
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export function yearMonthOf(date: string): YearMonth {
    const [year, month] = date.split("-").map(Number);
    return { year, month };
}
