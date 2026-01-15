import { describe, expect, it } from 'vitest';
import { BacklogService } from './backlog.service';

describe('BacklogService - Weighted Offset Calculation', () => {
  const service = new BacklogService();

  describe('getWeightedRandomOffset', () => {
    it('should return 0 for count of 0', () => {
      // @ts-expect-error - Accessing private method for testing
      const offset = service.getWeightedRandomOffset(0);
      expect(offset).toBe(0);
    });

    it('should return 0 for count of 1', () => {
      // @ts-expect-error - Accessing private method for testing
      const offset = service.getWeightedRandomOffset(1);
      expect(offset).toBe(0);
    });

    it('should return offset between 0 and count-1', () => {
      const count = 100;
      for (let i = 0; i < 50; i++) {
        // @ts-expect-error - Accessing private method for testing
        const offset = service.getWeightedRandomOffset(count);
        expect(offset).toBeGreaterThanOrEqual(0);
        expect(offset).toBeLessThan(count);
      }
    });

    it(
      'should bias toward higher indices (cubic weighting)',
      { retry: 3 },
      () => {
        const count = 100;
        const iterations = 1000;
        const offsets: number[] = [];

        // Generate many offsets
        for (let i = 0; i < iterations; i++) {
          // @ts-expect-error - Accessing private method for testing
          const offset = service.getWeightedRandomOffset(count);
          offsets.push(offset);
        }

        // Calculate stats
        const avg = offsets.reduce((sum, val) => sum + val, 0) / offsets.length;
        const inTopQuartile = offsets.filter((o) => o >= 75).length;
        const inBottomQuartile = offsets.filter((o) => o < 25).length;

        // With cubic weighting (random ** 3), we expect:
        // - Average offset to be significantly higher than middle (50)
        // - More values in top quartile than bottom quartile
        expect(avg).toBeGreaterThan(60); // Should be well above middle
        expect(inTopQuartile).toBeGreaterThan(inBottomQuartile * 2); // At least 2x more
      },
    );

    it(
      'should strongly prefer oldest 20% over newest 20%',
      { retry: 3 },
      () => {
        const count = 100;
        const iterations = 1000;
        const offsets: number[] = [];

        // Generate many offsets
        for (let i = 0; i < iterations; i++) {
          // @ts-expect-error - Accessing private method for testing
          const offset = service.getWeightedRandomOffset(count);
          offsets.push(offset);
        }

        // Count selections from oldest 20% vs newest 20%
        const inOldest20 = offsets.filter((o) => o >= 80).length;
        const inNewest20 = offsets.filter((o) => o < 20).length;

        // Oldest 20% should be selected much more frequently
        // With cubic weighting, we expect ~50% from oldest 20%, <10% from newest 20%
        expect(inOldest20).toBeGreaterThan(400); // Should be > 40%
        expect(inNewest20).toBeLessThan(150); // Should be < 15%
        expect(inOldest20).toBeGreaterThan(inNewest20 * 3); // At least 3x more
      },
    );
  });

  describe('getNextNDates', () => {
    it('should return empty array for 0 days', () => {
      // @ts-expect-error - Accessing private method for testing
      const dates = service.getNextNDates(0);
      expect(dates).toEqual([]);
    });

    it('should return correct number of dates', () => {
      // @ts-expect-error - Accessing private method for testing
      const dates = service.getNextNDates(7);
      expect(dates).toHaveLength(7);
    });

    it('should start from tomorrow (UTC)', () => {
      // @ts-expect-error - Accessing private method for testing
      const dates = service.getNextNDates(1);
      const today = new Date();
      const tomorrow = new Date(
        Date.UTC(
          today.getUTCFullYear(),
          today.getUTCMonth(),
          today.getUTCDate() + 1,
        ),
      );

      expect(dates[0].getTime()).toBe(tomorrow.getTime());
    });

    it('should return consecutive dates in UTC', () => {
      // @ts-expect-error - Accessing private method for testing
      const dates = service.getNextNDates(7);

      for (let i = 1; i < dates.length; i++) {
        const diff = dates[i].getTime() - dates[i - 1].getTime();
        const oneDayMs = 24 * 60 * 60 * 1000;
        expect(diff).toBe(oneDayMs);
      }
    });

    it('should return dates at midnight UTC', () => {
      // @ts-expect-error - Accessing private method for testing
      const dates = service.getNextNDates(7);

      for (const date of dates) {
        expect(date.getUTCHours()).toBe(0);
        expect(date.getUTCMinutes()).toBe(0);
        expect(date.getUTCSeconds()).toBe(0);
        expect(date.getUTCMilliseconds()).toBe(0);
      }
    });
  });
});
