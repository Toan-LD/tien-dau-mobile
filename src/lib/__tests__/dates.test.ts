import {
    addDays,
    formatDayTitle,
    formatMonthTitle,
    formatTime,
    monthRange,
    resolveDate,
    todayLocal,
    toLocalDateString,
} from "../dates";

describe("toLocalDateString", () => {
    it("uses the local date, not UTC", () => {
        expect(toLocalDateString(new Date(2026, 10, 5, 6, 30))).toBe(
            "2026-11-05",
        );
        expect(toLocalDateString(new Date(2026, 10, 5, 23, 59))).toBe(
            "2026-11-05",
        );
    });
});

describe("todayLocal", () => {
    it("formats the given instant", () => {
        expect(todayLocal(new Date(2026, 0, 2, 0, 5))).toBe("2026-01-02");
    });
});

describe("addDays", () => {
    it("crosses month and year boundaries", () => {
        expect(addDays("2026-11-01", -1)).toBe("2026-10-31");
        expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
        expect(addDays("2026-11-05", 0)).toBe("2026-11-05");
    });
});

describe("monthRange", () => {
    it("returns first and last day", () => {
        expect(monthRange(2026, 2)).toEqual({
            start: "2026-02-01",
            end: "2026-02-28",
        });
        expect(monthRange(2028, 2).end).toBe("2028-02-29");
        expect(monthRange(2026, 12)).toEqual({
            start: "2026-12-01",
            end: "2026-12-31",
        });
    });
});

describe("formatDayTitle", () => {
    it("labels today and yesterday", () => {
        expect(formatDayTitle("2026-11-05", "2026-11-05")).toBe(
            "Hôm nay, 05/11",
        );
        expect(formatDayTitle("2026-11-04", "2026-11-05")).toBe(
            "Hôm qua, 04/11",
        );
    });
    it("uses full date otherwise", () => {
        expect(formatDayTitle("2026-10-03", "2026-11-05")).toBe("03/10/2026");
    });
});

describe("formatMonthTitle", () => {
    it("formats the month", () => {
        expect(formatMonthTitle(2026, 11)).toBe("Tháng 11/2026");
    });
});

describe("formatTime", () => {
    it("shows local HH:mm", () => {
        expect(formatTime(new Date(2026, 10, 5, 7, 58).toISOString())).toBe(
            "07:58",
        );
        expect(formatTime(new Date(2026, 10, 5, 19, 5).toISOString())).toBe(
            "19:05",
        );
    });
});

describe("resolveDate", () => {
    it("follows today when nothing is picked", () => {
        expect(resolveDate(null, "2026-11-06")).toBe("2026-11-06");
    });
    it("keeps an explicitly picked date", () => {
        expect(resolveDate("2026-11-04", "2026-11-06")).toBe("2026-11-04");
    });
});

describe("time zone", () => {
    it("runs pinned to Asia/Ho_Chi_Minh", () => {
        expect(new Date(2026, 10, 5, 6, 30).getTimezoneOffset()).toBe(-420);
    });
});
