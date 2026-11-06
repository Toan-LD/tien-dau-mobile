import { normalizeName } from "./categories.ts";

export const MAX_AMOUNT = 999_999_999_999;

export type AmountResult =
    { ok: true; amount: number } | { ok: false; error: string };

const AMOUNT_EXAMPLES =
    'Ví dụ dạng đúng: "30k", "30 nghìn", "30.000", "1tr2", "1,5 triệu", "2 củ".';

const UNIT_MULTIPLIERS: Record<string, number> = {
    k: 1_000,
    nghin: 1_000,
    ngan: 1_000,
    n: 1_000,
    tr: 1_000_000,
    trieu: 1_000_000,
    cu: 1_000_000,
    m: 1_000_000,
    ty: 1_000_000_000,
};

const AMOUNT_PATTERN =
    /^(\d+(?:[.,\s]\d+)*)\s*(k|nghin|ngan|n|tr|trieu|cu|m|ty)?\s*(\d{1,3})?$/;

function invalidAmount(input: string, reason: string): AmountResult {
    return {
        ok: false,
        error: `Số tiền "${input}" ${reason}. ${AMOUNT_EXAMPLES}`,
    };
}

function readNumber(text: string): number | null {
    const decimal = /^(\d+)[.,](\d{1,2})$/.exec(text);
    if (decimal) return Number(`${decimal[1]}.${decimal[2]}`);
    const groups = text.split(/[.,\s]/);
    if (groups.slice(1).some((group) => group.length !== 3)) {
        return null;
    }
    return Number(groups.join(""));
}

export function parseAmount(input: string): AmountResult {
    const normalized = normalizeName(input).replace(/\s*(vnd|dong|d)$/, "");
    const match = AMOUNT_PATTERN.exec(normalized);
    if (!match) return invalidAmount(input, "không đọc được");
    const [, numberText, unit, trailingDigits] = match;
    if (trailingDigits !== undefined && unit === undefined) {
        return invalidAmount(input, "không đọc được");
    }
    const hasUnit = unit !== undefined;
    const number = readNumber(numberText);
    if (number === null) return invalidAmount(input, "không đọc được");
    if (!hasUnit && (number < 1000 || !Number.isInteger(number))) {
        return {
            ok: false,
            error: `Số tiền "${input}" mơ hồ: hỏi lại người dùng là ${input}.000 đ hay ${input} đ.`,
        };
    }
    const multiplier = hasUnit ? UNIT_MULTIPLIERS[unit] : 1;
    const fraction =
        trailingDigits === undefined
            ? 0
            : Number(trailingDigits.padEnd(3, "0")) * (multiplier / 1000);
    const amount = Math.round(number * multiplier + fraction);
    if (amount < 1) return invalidAmount(input, "phải lớn hơn 0");
    if (amount > MAX_AMOUNT) {
        return invalidAmount(input, "vượt quá 999.999.999.999 đ");
    }
    return { ok: true, amount };
}

function groupThousands(whole: number): string {
    return String(Math.abs(whole)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function formatVND(amount: number): string {
    const whole = Math.trunc(amount);
    return `${whole < 0 ? "-" : ""}${groupThousands(whole)} đ`;
}

export function toVND(raw: number | string): number {
    return Math.round(Number(raw));
}

export function formatShare(part: number, whole: number): string {
    if (whole === 0) return "0%";
    return `${Math.round((part / whole) * 100)}%`;
}

export function formatChange(before: number, after: number): string {
    const difference = after - before;
    if (difference === 0) return "không đổi";
    const amount = formatVND(Math.abs(difference));
    if (before === 0) {
        return difference > 0
            ? `tăng ${amount} (kỳ trước không có)`
            : `giảm ${amount} (kỳ trước không có)`;
    }
    const percent = Math.round((difference / before) * 100);
    return difference > 0
        ? `tăng ${amount} (+${percent}%)`
        : `giảm ${amount} (${percent}%)`;
}
