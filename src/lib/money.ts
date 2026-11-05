export const MAX_AMOUNT = 999_999_999_999;

export function formatAmountDigits(amount: number): string {
  return String(Math.trunc(amount)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function formatVND(amount: number): string {
  return `${formatAmountDigits(amount)} đ`;
}

function compact(value: number): string {
  return (Math.round(value * 10) / 10).toString().replace('.', ',');
}

export function formatCompactVND(amount: number): string {
  if (amount >= 1e9) return `${compact(amount / 1e9)} tỷ`;
  if (amount >= 1e6) return `${compact(amount / 1e6)}tr`;
  if (amount >= 1e3) return `${compact(amount / 1e3)}k`;
  return `${amount} đ`;
}
