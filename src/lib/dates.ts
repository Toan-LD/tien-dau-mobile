export type LocalDate = string; // 'YYYY-MM-DD'

const pad = (n: number) => String(n).padStart(2, "0");

export function toLocalDateString(d: Date): LocalDate {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayLocal(now: Date = new Date()): LocalDate {
    return toLocalDateString(now);
}

// null means "follow today": the day is resolved when it is needed, so it rolls over at midnight.
export function resolveDate(
    picked: LocalDate | null,
    today: LocalDate,
): LocalDate {
    return picked ?? today;
}

function parse(date: LocalDate): Date {
    const [y, m, d] = date.split("-").map(Number);
    return new Date(y, m - 1, d);
}

export function addDays(date: LocalDate, n: number): LocalDate {
    const d = parse(date);
    d.setDate(d.getDate() + n);
    return toLocalDateString(d);
}

export function monthRange(
    year: number,
    month: number,
): { start: LocalDate; end: LocalDate } {
    return {
        start: toLocalDateString(new Date(year, month - 1, 1)),
        end: toLocalDateString(new Date(year, month, 0)),
    };
}

export function formatDayTitle(date: LocalDate, today: LocalDate): string {
    const [y, m, d] = date.split("-");
    if (date === today) return `Hôm nay, ${d}/${m}`;
    if (date === addDays(today, -1)) return `Hôm qua, ${d}/${m}`;
    return `${d}/${m}/${y}`;
}

export function formatMonthTitle(year: number, month: number): string {
    return `Tháng ${month}/${year}`;
}

export function formatTime(iso: string): string {
    const d = new Date(iso);
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
