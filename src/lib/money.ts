export const MAX_AMOUNT = 999_999_999_999;

export function formatAmountDigits(amount: number): string {
  return String(Math.trunc(amount)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function formatVND(amount: number): string {
  return `${formatAmountDigits(amount)} đ`;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function compact(value: number): string {
  return round1(value).toString().replace('.', ',');
}

export function formatCompactVND(amount: number): string {
  if (amount < 1e3) return formatVND(amount);
  if (amount >= 1e9 || round1(amount / 1e6) >= 1000) return `${compact(amount / 1e9)} tỷ`;
  if (amount >= 1e6 || round1(amount / 1e3) >= 1000) return `${compact(amount / 1e6)}tr`;
  return `${compact(amount / 1e3)}k`;
}
