import { describe, expect, it } from 'vitest';
import { useDate } from './useDate';

describe('useDate', () => {
  describe('date computations', () => {
    it('should parse date string correctly', () => {
      const { day, month, year } = useDate('2024-01-15');

      expect(day.value).toBe(15);
      expect(month.value).toBe(0); // January is 0-indexed
      expect(year.value).toBe(2024);
    });

    it('should handle different date formats', () => {
      const { day, month, year } = useDate('2024-12-31T23:59:59Z');

      expect(day.value).toBe(31);
      expect(month.value).toBe(11); // December is 11
      expect(year.value).toBe(2024);
    });
  });

  describe('formatted', () => {
    it('should format month as uppercase short name', () => {
      const { formatted } = useDate('2024-01-15');

      expect(formatted.formattedMonth.value).toBe('JAN');
    });

    it('should format different months correctly', () => {
      const { formatted: jan } = useDate('2024-01-15');
      const { formatted: dec } = useDate('2024-12-25');

      expect(jan.formattedMonth.value).toBe('JAN');
      expect(dec.formattedMonth.value).toBe('DEC');
    });
  });

  describe('isToday', () => {
    it('should return true for today', () => {
      const today = new Date();
      const dateString = today.toISOString();
      const { utils } = useDate(dateString);

      expect(utils.isToday()).toBe(true);
    });

    it('should return false for yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const { utils } = useDate(yesterday.toISOString());

      expect(utils.isToday()).toBe(false);
    });

    it('should return false for tomorrow', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const { utils } = useDate(tomorrow.toISOString());

      expect(utils.isToday()).toBe(false);
    });
  });

  describe('isFuture', () => {
    it('should return false for past dates', () => {
      const { utils } = useDate('2020-01-01');

      expect(utils.isFuture()).toBe(false);
    });

    it('should return false for today', () => {
      const today = new Date().toISOString();
      const { utils } = useDate(today);

      expect(utils.isFuture()).toBe(false);
    });

    it('should return true for future dates', () => {
      const future = new Date();
      future.setFullYear(future.getFullYear() + 1);
      const { utils } = useDate(future.toISOString());

      expect(utils.isFuture()).toBe(true);
    });
  });
});
