const pad = (n: number) => String(n).padStart(2, "0");

export function toLocalDateString(d: Date): string {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayLocal(now: Date = new Date()): string {
    return toLocalDateString(now);
}

export function resolveDate(picked: string | null, today: string): string {
    return picked ?? today;
}

function parse(date: string): Date {
    const [y, m, d] = date.split("-").map(Number);
    return new Date(y, m - 1, d);
}

export function addDays(date: string, n: number): string {
    const d = parse(date);
    d.setDate(d.getDate() + n);
    return toLocalDateString(d);
}

export function monthRange(
    year: number,
    month: number,
): { start: string; end: string } {
    return {
        start: toLocalDateString(new Date(year, month - 1, 1)),
        end: toLocalDateString(new Date(year, month, 0)),
    };
}

export function formatDayTitle(date: string, today: string): string {
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
