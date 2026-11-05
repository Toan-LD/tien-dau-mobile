import {
    containsDate,
    filterByCategories,
    NO_CATEGORY,
    formatPeriodTitle,
    formatWeekday,
    groupByDay,
    periodOf,
    shiftAnchor,
} from "@/lib/periods";
import type { Transaction } from "@/lib/transactions";

// 2026-11-05 is a Thursday; its week runs Monday 02/11 to Sunday 08/11.
const TODAY = "2026-11-05";

function tx(
    id: string,
    date: string,
    type: "expense" | "income",
    amount: number,
): Transaction {
    return {
        id,
        type,
        amount,
        categoryId: null,
        category: null,
        note: null,
        date,
        createdAt: `${date}T03:00:00.000Z`,
        walletId: "w1",
    };
}

describe("periodOf", () => {
    it("a day is just that day", () => {
        expect(periodOf("day", TODAY)).toEqual({ start: TODAY, end: TODAY });
    });

    it("a week runs Monday to Sunday", () => {
        expect(periodOf("week", TODAY)).toEqual({
            start: "2026-11-02",
            end: "2026-11-08",
        });
    });

    it("Sunday belongs to the week that started the Monday before", () => {
        expect(periodOf("week", "2026-11-08")).toEqual({
            start: "2026-11-02",
            end: "2026-11-08",
        });
        expect(periodOf("week", "2026-11-09").start).toBe("2026-11-09");
    });

    it("a week can cross months and years", () => {
        expect(periodOf("week", "2027-01-01")).toEqual({
            start: "2026-12-28",
            end: "2027-01-03",
        });
    });

    it("a month runs from the 1st to its last day", () => {
        expect(periodOf("month", "2026-02-14")).toEqual({
            start: "2026-02-01",
            end: "2026-02-28",
        });
    });
});

describe("shiftAnchor", () => {
    it("steps by a day or a week", () => {
        expect(shiftAnchor("day", TODAY, -1)).toBe("2026-11-04");
        expect(shiftAnchor("week", TODAY, -1)).toBe("2026-10-29");
    });

    it("steps by a month to the 1st, so 31st doesn't skip short months", () => {
        expect(shiftAnchor("month", "2026-03-31", -1)).toBe("2026-02-01");
        expect(shiftAnchor("month", "2026-12-15", 1)).toBe("2027-01-01");
    });
});

describe("containsDate", () => {
    it("includes both ends", () => {
        const week = periodOf("week", TODAY);
        expect(containsDate(week, "2026-11-02")).toBe(true);
        expect(containsDate(week, "2026-11-08")).toBe(true);
        expect(containsDate(week, "2026-11-09")).toBe(false);
    });
});

describe("formatWeekday", () => {
    it("names the weekday in Vietnamese, with today and yesterday", () => {
        expect(formatWeekday("2026-11-02", TODAY)).toBe("Thứ Hai, 02/11");
        expect(formatWeekday("2026-11-08", TODAY)).toBe("Chủ nhật, 08/11");
        expect(formatWeekday(TODAY, TODAY)).toBe("Hôm nay, 05/11");
        expect(formatWeekday("2026-11-04", TODAY)).toBe("Hôm qua, 04/11");
    });

    it("adds the year when it isn't this year", () => {
        expect(formatWeekday("2025-12-31", TODAY)).toBe("Thứ Tư, 31/12/2025");
    });
});

describe("formatPeriodTitle", () => {
    it("uses the day title for a day", () => {
        expect(formatPeriodTitle("day", periodOf("day", TODAY), TODAY)).toBe(
            "Hôm nay, 05/11",
        );
    });

    it("names this week and last week", () => {
        expect(formatPeriodTitle("week", periodOf("week", TODAY), TODAY)).toBe(
            "Tuần này, 02/11 – 08/11",
        );
        expect(
            formatPeriodTitle("week", periodOf("week", "2026-10-29"), TODAY),
        ).toBe("Tuần trước, 26/10 – 01/11");
    });

    it("adds the year to older weeks from another year", () => {
        expect(
            formatPeriodTitle("week", periodOf("week", "2025-06-11"), TODAY),
        ).toBe("09/06 – 15/06/2025");
    });

    it("uses the month title for a month", () => {
        expect(
            formatPeriodTitle("month", periodOf("month", TODAY), TODAY),
        ).toBe("Tháng 11/2026");
    });
});

describe("groupByDay", () => {
    it("keeps the list order and sums each day", () => {
        const list = [
            tx("a", "2026-11-05", "expense", 30000),
            tx("b", "2026-11-05", "income", 100000),
            tx("c", "2026-11-03", "expense", 5000),
            tx("d", "2026-11-05", "expense", 20000),
        ];
        expect(groupByDay(list)).toEqual([
            {
                date: "2026-11-05",
                expense: 50000,
                income: 100000,
                items: [list[0], list[1], list[3]],
            },
            {
                date: "2026-11-03",
                expense: 5000,
                income: 0,
                items: [list[2]],
            },
        ]);
    });

    it("returns nothing for an empty list", () => {
        expect(groupByDay([])).toEqual([]);
    });
});

describe("filterByCategories", () => {
    const withCat = (id: string, categoryId: string | null) => ({
        ...tx(id, TODAY, "expense", 1000),
        categoryId,
    });
    const list = [withCat("a", "c1"), withCat("b", "c2"), withCat("c", null)];

    it("keeps everything when there is no filter", () => {
        expect(filterByCategories(list, [])).toBe(list);
    });

    it("keeps only the chosen categories", () => {
        expect(filterByCategories(list, ["c2"]).map((t) => t.id)).toEqual([
            "b",
        ]);
    });

    it('matches rows without a category with "none"', () => {
        expect(
            filterByCategories(list, ["c1", NO_CATEGORY]).map((t) => t.id),
        ).toEqual(["a", "c"]);
    });
});
