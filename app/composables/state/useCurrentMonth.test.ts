import { describe, expect, it } from 'vitest';
import { useCurrentMonth } from './useCurrentMonth';

describe('useCurrentMonth', () => {
  describe('formattedMonth', () => {
    it('should return formatted month and year', () => {
      const { formattedMonth, setCurrentMonth } = useCurrentMonth();
      const testDate = new Date('2024-01-15');

      setCurrentMonth(testDate);

      expect(formattedMonth.value).toBe('January 2024');
    });

    it('should update when month changes', () => {
      const { formattedMonth, setCurrentMonth } = useCurrentMonth();

      setCurrentMonth(new Date('2024-01-15'));
      expect(formattedMonth.value).toBe('January 2024');

      setCurrentMonth(new Date('2024-06-20'));
      expect(formattedMonth.value).toBe('June 2024');
    });

    it('should handle different years', () => {
      const { formattedMonth, setCurrentMonth } = useCurrentMonth();

      setCurrentMonth(new Date('2023-12-31'));
      expect(formattedMonth.value).toBe('December 2023');

      setCurrentMonth(new Date('2025-03-15'));
      expect(formattedMonth.value).toBe('March 2025');
    });
  });

  describe('setCurrentMonth', () => {
    it('should update the current month', () => {
      const { formattedMonth, setCurrentMonth } = useCurrentMonth();
      const newDate = new Date('2024-07-04');

      setCurrentMonth(newDate);

      expect(formattedMonth.value).toBe('July 2024');
    });

    it('should handle multiple updates', () => {
      const { formattedMonth, setCurrentMonth } = useCurrentMonth();

      setCurrentMonth(new Date('2024-01-01'));
      setCurrentMonth(new Date('2024-02-01'));
      setCurrentMonth(new Date('2024-03-01'));

      expect(formattedMonth.value).toBe('March 2024');
    });
  });

  describe('shared state', () => {
    it('should share state between multiple instances', () => {
      const instance1 = useCurrentMonth();
      const instance2 = useCurrentMonth();

      instance1.setCurrentMonth(new Date('2024-05-15'));

      expect(instance1.formattedMonth.value).toBe('May 2024');
      expect(instance2.formattedMonth.value).toBe('May 2024');
    });
  });
});
