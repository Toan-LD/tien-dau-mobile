export const DEFAULT_DAILY_LIMIT = 50;

// CHAT_DAILY_LIMIT phải là số nguyên dương; giá trị khác thì dùng mặc định.
export function readDailyLimit(rawValue: string | undefined): number {
    const value = Number(rawValue);
    return Number.isSafeInteger(value) && value > 0
        ? value
        : DEFAULT_DAILY_LIMIT;
}
