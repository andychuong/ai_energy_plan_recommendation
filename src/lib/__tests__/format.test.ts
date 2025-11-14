import { formatCurrency, formatNumber, formatPercentage } from '../format';

describe('formatCurrency', () => {
  it('should format positive numbers correctly', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56');
    expect(formatCurrency(0)).toBe('$0.00');
    expect(formatCurrency(100)).toBe('$100.00');
  });

  it('should format negative numbers correctly', () => {
    expect(formatCurrency(-1234.56)).toBe('-$1,234.56');
    expect(formatCurrency(-100)).toBe('-$100.00');
  });

  it('should format large numbers with commas', () => {
    expect(formatCurrency(1000000)).toBe('$1,000,000.00');
    expect(formatCurrency(1234567.89)).toBe('$1,234,567.89');
  });

  it('should format decimal numbers correctly', () => {
    expect(formatCurrency(0.99)).toBe('$0.99');
    expect(formatCurrency(0.1)).toBe('$0.10');
  });
});

describe('formatNumber', () => {
  it('should format positive numbers with commas', () => {
    expect(formatNumber(1234)).toBe('1,234');
    expect(formatNumber(1000000)).toBe('1,000,000');
    expect(formatNumber(0)).toBe('0');
  });

  it('should format negative numbers with commas', () => {
    expect(formatNumber(-1234)).toBe('-1,234');
    expect(formatNumber(-1000000)).toBe('-1,000,000');
  });

  it('should format decimal numbers', () => {
    expect(formatNumber(1234.56)).toBe('1,234.56');
    expect(formatNumber(0.99)).toBe('0.99');
  });
});

describe('formatPercentage', () => {
  it('should format percentages with one decimal place', () => {
    expect(formatPercentage(50)).toBe('50.0%');
    expect(formatPercentage(0)).toBe('0.0%');
    expect(formatPercentage(100)).toBe('100.0%');
  });

  it('should format decimal percentages correctly', () => {
    expect(formatPercentage(12.345)).toBe('12.3%');
    expect(formatPercentage(99.999)).toBe('100.0%');
  });

  it('should format negative percentages', () => {
    expect(formatPercentage(-10)).toBe('-10.0%');
  });
});
