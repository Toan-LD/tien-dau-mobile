import { MAX_AMOUNT, formatAmountDigits, formatCompactVND, formatVND } from '../money';

describe('formatVND', () => {
  it('adds thousands separators and the đ suffix', () => {
    expect(formatVND(30000)).toBe('30.000 đ');
    expect(formatVND(0)).toBe('0 đ');
    expect(formatVND(1234567)).toBe('1.234.567 đ');
  });
});

describe('formatAmountDigits', () => {
  it('formats without suffix', () => {
    expect(formatAmountDigits(999999999999)).toBe('999.999.999.999');
    expect(formatAmountDigits(30000)).toBe('30.000');
    expect(formatAmountDigits(999)).toBe('999');
  });
});

describe('formatCompactVND', () => {
  it('formats millions', () => {
    expect(formatCompactVND(2500000)).toBe('2,5tr');
    expect(formatCompactVND(3200000)).toBe('3,2tr');
    expect(formatCompactVND(13000000)).toBe('13tr');
  });
  it('formats thousands', () => {
    expect(formatCompactVND(450000)).toBe('450k');
    expect(formatCompactVND(1500)).toBe('1,5k');
  });
  it('formats billions', () => {
    expect(formatCompactVND(1200000000)).toBe('1,2 tỷ');
  });
  it('promotes the tier when rounding reaches 1000', () => {
    expect(formatCompactVND(999950)).toBe('1tr');
    expect(formatCompactVND(999949)).toBe('999,9k');
    expect(formatCompactVND(999999999)).toBe('1 tỷ');
  });
  it('leaves small amounts as đ', () => {
    expect(formatCompactVND(800)).toBe('800 đ');
  });
});

describe('MAX_AMOUNT', () => {
  it('is 999_999_999_999', () => {
    expect(MAX_AMOUNT).toBe(999999999999);
  });
});
