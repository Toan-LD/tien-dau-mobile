import { MAX_AMOUNT } from "./money";

export type AmountState = { value: number; suggestionPicked: boolean };

export type AmountAction =
    | { type: "digit"; digit: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 }
    | { type: "tripleZero" }
    | { type: "backspace" }
    | { type: "clear" }
    | { type: "pick"; value: number }
    | { type: "set"; value: number };

export const initialAmount: AmountState = { value: 0, suggestionPicked: false };

function withValue(s: AmountState, value: number): AmountState {
    return {
        value,
        suggestionPicked: value === 0 ? false : s.suggestionPicked,
    };
}

export function amountReducer(s: AmountState, a: AmountAction): AmountState {
    switch (a.type) {
        case "digit": {
            const next = s.value * 10 + a.digit;
            return next > MAX_AMOUNT ? s : withValue(s, next);
        }
        case "tripleZero": {
            const next = s.value * 1000;
            return next > MAX_AMOUNT ? s : withValue(s, next);
        }
        case "backspace":
            return withValue(s, Math.floor(s.value / 10));
        case "clear":
            return initialAmount;
        case "pick":
            return withValue({ ...s, suggestionPicked: true }, a.value);
        case "set":
            return withValue({ ...s, suggestionPicked: true }, a.value);
    }
}

export function amountSuggestions(s: AmountState): number[] {
    if (s.suggestionPicked || s.value === 0 || s.value >= 1000) return [];
    return [1e3, 1e4, 1e5]
        .map((m) => s.value * m)
        .filter((v) => v <= MAX_AMOUNT);
}
