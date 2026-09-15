import { describe, expect, it } from 'vitest';
import { buildExpenseTypeBreakdown, categoryDonutGradient } from './expense.util';

describe('Dashboard expense types', () => {
  it('aggregates amounts and fills the ring proportionally by type', () => {
    const slices = buildExpenseTypeBreakdown([
      { type: 'FIXED', amount: '100.00' },
      { type: 'FIXED', amount: '50.00' },
      { type: 'VARIABLE', amount: '100.00' },
      { type: 'EXTRAORDINARY', amount: '50.00' },
    ]);
    expect(slices.map(slice => slice.total)).toEqual([150, 100, 50]);
    expect(slices[0].pct).toBe(50);
    expect(slices.reduce((sum, slice) => sum + slice.pct, 0)).toBeCloseTo(100);
    expect(categoryDonutGradient(slices)).toContain('#000000 0% 50%');
  });

  it('keeps colors stable when amounts change and supports an empty month', () => {
    const empty = buildExpenseTypeBreakdown([]);
    const filled = buildExpenseTypeBreakdown([{ type: 'VARIABLE', amount: '250' }]);
    expect(filled.map(slice => slice.color)).toEqual(empty.map(slice => slice.color));
    expect(filled.map(slice => slice.pct)).toEqual([0, 100, 0]);
    expect(categoryDonutGradient(filled)).toBe('conic-gradient(#38b6ff 0% 100%)');
    expect(empty.every(slice => slice.total === 0 && slice.pct === 0)).toBe(true);
    expect(categoryDonutGradient(empty)).toBe('conic-gradient(rgba(255,255,255,.12) 0% 100%)');
  });
});
