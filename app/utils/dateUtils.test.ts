import { describe, expect, it } from 'vitest';
import { toDateKey } from './dateUtils';

describe('toDateKey', () => {
  it('should convert Date to YYYY-MM-DD format', () => {
    const date = new Date('2026-01-15T14:30:00.000Z');
    expect(toDateKey(date)).toBe('2026-01-15');
  });

  it('should extract date from ISO string', () => {
    expect(toDateKey('2026-01-15T14:30:00.000Z')).toBe('2026-01-15');
  });

  it('should pass through YYYY-MM-DD string unchanged', () => {
    expect(toDateKey('2026-01-15')).toBe('2026-01-15');
  });
});
