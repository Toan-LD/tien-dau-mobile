export const DEFAULT_DAILY_LIMIT = 50;

export function readDailyLimit(rawValue: string | undefined): number {
    const value = Number(rawValue);
    return Number.isSafeInteger(value) && value > 0
        ? value
        : DEFAULT_DAILY_LIMIT;
}
