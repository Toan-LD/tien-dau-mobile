export type Period = { start: string; end: string; label: string };
export type PeriodResult =
    { ok: true; period: Period } | { ok: false; error: string };

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAYS = [
    "Chủ Nhật",
    "Thứ Hai",
    "Thứ Ba",
    "Thứ Tư",
    "Thứ Năm",
    "Thứ Sáu",
    "Thứ Bảy",
];

const pad = (n: number, width = 2) => String(n).padStart(width, "0");

function toIso(ms: number): string {
    const d = new Date(ms);
    return `${pad(d.getUTCFullYear(), 4)}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

function toMs(date: string): number {
    const [y, m, d] = date.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
}

function addDays(date: string, days: number): string {
    return toIso(toMs(date) + days * DAY_MS);
}

function isValidDate(date: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(date) && toIso(toMs(date)) === date;
}

function isValidMonth(month: string): boolean {
    return /^\d{4}-(0[1-9]|1[0-2])$/.test(month);
}

function lastDayOfMonth(year: number, month: number): string {
    // Ngày 0 của tháng kế tiếp là ngày cuối của tháng này.
    return toIso(Date.UTC(year, month, 0));
}

// "2026-11-06" -> "06/11/2026"
export function formatDate(date: string): string {
    const [y, m, d] = date.split("-");
    return `${d}/${m}/${y}`;
}

export function weekdayTitle(date: string): string {
    const day = new Date(toMs(date)).getUTCDay();
    return `${WEEKDAYS[day]}, ${formatDate(date)}`;
}

export function vietnamToday(now: Date): string {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Ho_Chi_Minh",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(now);
}

function range(prefix: string, start: string, end: string): PeriodResult {
    return {
        ok: true,
        period: {
            start,
            end,
            label: `${prefix} (${formatDate(start)} – ${formatDate(end)})`,
        },
    };
}

function monthPeriod(year: number, month: number, today: string): PeriodResult {
    const start = `${pad(year, 4)}-${pad(month)}-01`;
    const lastDay = lastDayOfMonth(year, month);
    const end = start <= today && today < lastDay ? today : lastDay;
    return range(`Tháng ${pad(month)}/${pad(year, 4)}`, start, end);
}

function invalid(input: string, detail?: string): PeriodResult {
    return {
        ok: false,
        error:
            detail ??
            `Khoảng thời gian không hợp lệ: "${input}". Dùng một trong: today, yesterday, this_week, last_week, this_month, last_month, this_year, YYYY-MM, YYYY-MM-DD, YYYY-MM-DD..YYYY-MM-DD.`,
    };
}

export function resolvePeriod(input: string, today: string): PeriodResult {
    const [year, month] = today.split("-").map(Number);
    const single = (date: string, label: string): PeriodResult => ({
        ok: true,
        period: { start: date, end: date, label },
    });

    switch (input) {
        case "today":
            return single(today, `Hôm nay, ${formatDate(today)}`);
        case "yesterday": {
            const y = addDays(today, -1);
            return single(y, `Hôm qua, ${formatDate(y)}`);
        }
        case "this_week":
        case "last_week": {
            // Thứ Hai là ngày đầu tuần: Chủ Nhật (0) lùi 6 ngày.
            const sinceMonday = (new Date(toMs(today)).getUTCDay() + 6) % 7;
            const thisMonday = addDays(today, -sinceMonday);
            if (input === "this_week") {
                return range("Tuần này", thisMonday, today);
            }
            return range(
                "Tuần trước",
                addDays(thisMonday, -7),
                addDays(thisMonday, -1),
            );
        }
        case "this_month":
            return monthPeriod(year, month, today);
        case "last_month":
            return month === 1
                ? monthPeriod(year - 1, 12, today)
                : monthPeriod(year, month - 1, today);
        case "this_year":
            return range(`Năm ${year}`, `${pad(year, 4)}-01-01`, today);
    }

    if (isValidMonth(input)) {
        const [y, m] = input.split("-").map(Number);
        return monthPeriod(y, m, today);
    }
    if (isValidDate(input)) {
        return single(input, `Ngày ${formatDate(input)}`);
    }
    const parts = input.split("..");
    if (parts.length === 2 && parts.every(isValidDate)) {
        const [start, end] = parts;
        if (start > end) {
            return invalid(
                input,
                `Khoảng thời gian không hợp lệ: "${input}". Ngày bắt đầu phải trước ngày kết thúc.`,
            );
        }
        return {
            ok: true,
            period: {
                start,
                end,
                label: `${formatDate(start)} – ${formatDate(end)}`,
            },
        };
    }
    return invalid(input);
}
