import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DailyListens } from '#shared/schema';
import { useDailyListensModal } from './useDailyListensModal';

describe('useDailyListensModal', () => {
  beforeEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('should start closed', () => {
      const { isOpen } = useDailyListensModal();

      expect(isOpen.value).toBe(false);
    });

    it('should have null dailyListens', () => {
      const { dailyListens } = useDailyListensModal();

      expect(dailyListens.value).toBeNull();
    });

    it('should have null viewTransitionName', () => {
      const { viewTransitionName } = useDailyListensModal();

      expect(viewTransitionName.value).toBeNull();
    });
  });

  describe('open', () => {
    const mockDailyListens: DailyListens = {
      date: '2024-01-15',
      albums: [
        {
          album: {
            albumId: 'test-id',
            albumName: 'Test Album',
            artistNames: 'Test Artist',
            imageUrl: 'https://example.com/image.jpg',
          },
          listenMetadata: {
            inOrder: true,
            listenMethod: 'spotify',
          },
        },
      ],
    };

    it('should open modal with provided daily listens', () => {
      const { isOpen, dailyListens, open } = useDailyListensModal();

      open({ dailyListens: mockDailyListens });

      expect(isOpen.value).toBe(true);
      expect(dailyListens.value).toStrictEqual(mockDailyListens);
    });

    it('should set viewTransitionName based on date', () => {
      const { viewTransitionName, open } = useDailyListensModal();

      open({ dailyListens: mockDailyListens });

      expect(viewTransitionName.value).toBe('date-2024-01-15');
    });
  });

  describe('close', () => {
    const mockDailyListens: DailyListens = {
      date: '2024-01-15',
      albums: [],
    };

    it('should close modal immediately', () => {
      const { isOpen, open, close } = useDailyListensModal();

      open({ dailyListens: mockDailyListens });
      expect(isOpen.value).toBe(true);

      close();
      expect(isOpen.value).toBe(false);
    });

    it('should clear dailyListens after timeout', async () => {
      vi.useFakeTimers();
      const { dailyListens, open, close } = useDailyListensModal();

      open({ dailyListens: mockDailyListens });
      close();

      expect(dailyListens.value).toBeNull();
      vi.useRealTimers();
    });

    it('should clear viewTransitionName after timeout', async () => {
      vi.useFakeTimers();
      const { viewTransitionName, open, close } = useDailyListensModal();

      open({ dailyListens: mockDailyListens });
      expect(viewTransitionName.value).toBe('date-2024-01-15');

      close();

      vi.advanceTimersByTime(300);

      expect(viewTransitionName.value).toBeNull();
      vi.useRealTimers();
    });
  });
});
