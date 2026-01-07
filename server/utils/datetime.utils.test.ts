import { describe, expect, it } from 'vitest';
import {
  dateInRange,
  getEndOfDayTimestamp,
  getStartOfDayTimestamp,
  isPlayedToday,
  isToday,
} from './datetime.utils';

describe('datetime.utils', () => {
  describe('getStartOfDayTimestamp', () => {
    it('should return timestamp for start of day (00:00:00)', () => {
      const date = new Date('2024-01-15T14:30:45');
      const timestamp = getStartOfDayTimestamp(date);
      const resultDate = new Date(timestamp * 1000);

      expect(resultDate.getHours()).toBe(0);
      expect(resultDate.getMinutes()).toBe(0);
      expect(resultDate.getSeconds()).toBe(0);
      expect(resultDate.getMilliseconds()).toBe(0);
    });

    it('should use current date when no date provided', () => {
      const timestamp = getStartOfDayTimestamp();
      const resultDate = new Date(timestamp * 1000);

      expect(resultDate.getHours()).toBe(0);
      expect(resultDate.getMinutes()).toBe(0);
      expect(resultDate.getSeconds()).toBe(0);
    });
  });

  describe('getEndOfDayTimestamp', () => {
    it('should return timestamp for end of day (23:59:59)', () => {
      const date = new Date('2024-01-15T14:30:45');
      const timestamp = getEndOfDayTimestamp(date);
      const resultDate = new Date(timestamp * 1000);

      expect(resultDate.getHours()).toBe(23);
      expect(resultDate.getMinutes()).toBe(59);
      expect(resultDate.getSeconds()).toBe(59);
    });
  });

  describe('isPlayedToday', () => {
    it('should return true for date played today', () => {
      const targetDate = new Date('2024-01-15');
      const playedAt = '2024-01-15T14:30:00Z';

      expect(isPlayedToday(playedAt, targetDate)).toBe(true);
    });

    it('should return false for date played yesterday', () => {
      const targetDate = new Date('2024-01-15');
      const playedAt = '2024-01-14T23:59:00Z';

      expect(isPlayedToday(playedAt, targetDate)).toBe(false);
    });

    it('should return false for date played tomorrow', () => {
      const targetDate = new Date('2024-01-15');
      const playedAt = '2024-01-16T00:01:00Z';

      expect(isPlayedToday(playedAt, targetDate)).toBe(false);
    });
  });

  describe('isToday', () => {
    it("should return true for today's date", () => {
      const today = new Date();
      expect(isToday(today)).toBe(true);
    });

    it('should return false for yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(isToday(yesterday)).toBe(false);
    });

    it('should return false for tomorrow', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(isToday(tomorrow)).toBe(false);
    });
  });

  describe('dateInRange', () => {
    it('should return true for date within range', () => {
      const date = new Date('2024-01-15');
      const range = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      };

      expect(dateInRange(date, range)).toBe(true);
    });

    it('should return true for date at start of range', () => {
      const date = new Date('2024-01-01');
      const range = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      };

      expect(dateInRange(date, range)).toBe(true);
    });

    it('should return true for date at end of range', () => {
      const date = new Date('2024-01-31');
      const range = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      };

      expect(dateInRange(date, range)).toBe(true);
    });

    it('should return false for date before range', () => {
      const date = new Date('2023-12-31');
      const range = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      };

      expect(dateInRange(date, range)).toBe(false);
    });

    it('should return false for date after range', () => {
      const date = new Date('2024-02-01');
      const range = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      };

      expect(dateInRange(date, range)).toBe(false);
    });
  });
});
