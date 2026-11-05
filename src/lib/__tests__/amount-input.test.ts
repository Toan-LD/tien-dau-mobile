import {
    AmountAction,
    amountReducer,
    amountSuggestions,
    initialAmount,
} from "../amount-input";

type Digit = Extract<AmountAction, { type: "digit" }>["digit"];

const typed = (...ds: Digit[]) =>
    ds.reduce(
        (s, d) => amountReducer(s, { type: "digit", digit: d }),
        initialAmount,
    );

describe("amountSuggestions", () => {
    it("suggests x1e3, x1e4, x1e5 for small values", () => {
        expect(amountSuggestions(typed(3))).toEqual([3000, 30000, 300000]);
        expect(amountSuggestions(typed(3, 5))).toEqual([
            35000, 350000, 3500000,
        ]);
        expect(amountSuggestions(typed(9, 9, 9))).toEqual([
            999000, 9990000, 99900000,
        ]);
    });

    it("returns nothing once a suggestion is picked", () => {
        const picked = amountReducer(typed(3), { type: "pick", value: 30000 });
        expect(picked).toEqual({ value: 30000, suggestionPicked: true });
        expect(amountSuggestions(picked)).toEqual([]);
    });

    it("returns nothing for 0 or values >= 1000", () => {
        expect(amountSuggestions(initialAmount)).toEqual([]);
        expect(amountSuggestions(typed(3, 5, 0, 0, 0))).toEqual([]);
    });

    it("drops suggestions above the maximum", () => {
        const s = amountReducer(initialAmount, { type: "set", value: 999 });
        expect(amountSuggestions({ ...s, suggestionPicked: false })).toEqual([
            999000, 9990000, 99900000,
        ]);
    });
});

describe("amountReducer", () => {
    it("backspace removes the last digit", () => {
        expect(amountReducer(typed(1, 2), { type: "backspace" }).value).toBe(1);
    });

    it("backspace to 0 resets suggestionPicked", () => {
        const picked = amountReducer(typed(3), { type: "pick", value: 5 });
        expect(amountReducer(picked, { type: "backspace" })).toEqual({
            value: 0,
            suggestionPicked: false,
        });
    });

    it("clear resets and re-enables suggestions", () => {
        const picked = amountReducer(typed(3), { type: "pick", value: 30000 });
        const cleared = amountReducer(picked, { type: "clear" });
        expect(cleared).toEqual(initialAmount);
        expect(
            amountSuggestions(
                amountReducer(cleared, { type: "digit", digit: 5 }),
            ),
        ).toEqual([5000, 50000, 500000]);
    });

    it("keeps 0 when typing 0 or 000 at 0", () => {
        expect(amountReducer(initialAmount, { type: "tripleZero" }).value).toBe(
            0,
        );
        expect(
            amountReducer(initialAmount, { type: "digit", digit: 0 }).value,
        ).toBe(0);
    });

    it("appends 000", () => {
        expect(amountReducer(typed(5), { type: "tripleZero" }).value).toBe(
            5000,
        );
    });

    it("ignores input beyond the maximum", () => {
        const max = amountReducer(initialAmount, {
            type: "set",
            value: 999_999_999_999,
        });
        expect(amountReducer(max, { type: "digit", digit: 1 }).value).toBe(
            999_999_999_999,
        );
        expect(amountReducer(max, { type: "tripleZero" }).value).toBe(
            999_999_999_999,
        );
    });

    it("set preloads a value as picked", () => {
        expect(
            amountReducer(initialAmount, { type: "set", value: 45000 }),
        ).toEqual({
            value: 45000,
            suggestionPicked: true,
        });
    });
});
