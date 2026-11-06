import { monthGrid, shiftMonth, yearMonthOf } from "../calendar";

// The dates inside the month, week by week (null outside it).
const inMonth = (year: number, month: number) =>
    monthGrid(year, month).map((week) =>
        week.map((day) => (day.inMonth ? day.date : null)),
    );

describe("monthGrid", () => {
    it("starts weeks on Monday and leaves blanks before the 1st", () => {
        // 1 November 2026 is a Sunday: six blanks, then the 1st.
        const grid = inMonth(2026, 11);
        expect(grid[0]).toEqual([
            null,
            null,
            null,
            null,
            null,
            null,
            "2026-11-01",
        ]);
        expect(grid[1][0]).toBe("2026-11-02");
        expect(grid[5][0]).toBe("2026-11-30");
    });

    it("always has six weeks of seven days, so the sheet never resizes", () => {
        // February 2027 starts on a Monday and fits in four weeks.
        for (const [y, m] of [
            [2027, 2],
            [2026, 11],
            [2026, 3],
        ]) {
            const grid = monthGrid(y, m);
            expect(grid).toHaveLength(6);
            for (const week of grid) expect(week).toHaveLength(7);
        }
        const feb = inMonth(2027, 2);
        expect(feb[0][0]).toBe("2027-02-01");
        expect(feb[3][6]).toBe("2027-02-28");
        expect(feb[4]).toEqual(Array(7).fill(null));
    });

    it("gives every square a unique date, even outside the month", () => {
        const dates = monthGrid(2026, 11)
            .flat()
            .map((d) => d.date);
        expect(new Set(dates).size).toBe(42);
        expect(dates[0]).toBe("2026-10-26");
        expect(dates[41]).toBe("2026-12-06");
    });

    it("handles leap years", () => {
        const days = inMonth(2028, 2).flat().filter(Boolean);
        expect(days).toHaveLength(29);
        expect(days.at(-1)).toBe("2028-02-29");
    });
});

describe("shiftMonth", () => {
    it("moves across year boundaries", () => {
        expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({
            year: 2025,
            month: 12,
        });
        expect(shiftMonth({ year: 2026, month: 12 }, 1)).toEqual({
            year: 2027,
            month: 1,
        });
        expect(shiftMonth({ year: 2026, month: 5 }, 1)).toEqual({
            year: 2026,
            month: 6,
        });
    });
});

describe("yearMonthOf", () => {
    it("reads the year and month of a local date", () => {
        expect(yearMonthOf("2026-11-06")).toEqual({ year: 2026, month: 11 });
    });
});
