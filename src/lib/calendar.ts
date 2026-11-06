import { toLocalDateString, type LocalDate } from "@/lib/dates";

export type YearMonth = { year: number; month: number };

// One square of the calendar. Squares before the 1st and after the last day
// belong to the neighbouring months: they are drawn empty (`inMonth` false),
// but still carry their real date so every square has a stable key.
export type CalendarDay = { date: LocalDate; inMonth: boolean };

// The days of a month laid out as calendar weeks, Monday first (like the
// week view on Danh sách). Always six weeks, so the calendar keeps the same
// height in every month and the sheet never jumps when you change month.
export function monthGrid(year: number, month: number): CalendarDay[][] {
    // getDay(): Sunday 0, Monday 1 … Saturday 6.
    const blanks = (new Date(year, month - 1, 1).getDay() + 6) % 7;

    const weeks: CalendarDay[][] = [];
    for (let w = 0; w < 6; w++) {
        const week: CalendarDay[] = [];
        for (let d = 0; d < 7; d++) {
            // new Date() rolls day 0, -1 … and days past the end over into
            // the neighbouring months.
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

export function yearMonthOf(date: LocalDate): YearMonth {
    const [year, month] = date.split("-").map(Number);
    return { year, month };
}
