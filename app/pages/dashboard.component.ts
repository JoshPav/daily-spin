import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import type { DailyListens } from '~~/shared/schema';
import { album, dailyAlbumListen } from '~~/tests/factories/component.factory';
// @ts-expect-error - Vue files are handled by Nuxt test environment at runtime
import Dashboard from './dashboard.vue';

/**
 * Component tests for the Dashboard page.
 *
 * Testing approach:
 * - Both `useListens` and `useFutureListens` are mocked at the composable level
 *   using `mockNuxtImport` for reliable test isolation
 * - `useListens` requires composable-level mocking because it uses `useState`,
 *   watchers, and other internal Nuxt utilities that require full Nuxt context
 * - Auth is mocked via ~/lib/auth-client in component.setup.ts
 *
 * Note: API-level mocking via `registerEndpoint` is an alternative approach
 * for simpler composables, but requires careful handling of async data flow.
 * For complex composables like `useListens` that use `useState`, composable-level
 * mocking is more reliable.
 */

// Mock useListens composable
const mockListensData = ref<DailyListens[]>([]);
const mockListensPending = ref(false);
const mockListensError = ref<Error | null>(null);

mockNuxtImport('useListens', () => {
  return () => ({
    data: mockListensData,
    pending: mockListensPending,
    error: mockListensError,
    loadingMore: ref(false),
    hasMore: ref(true),
    fetchMore: vi.fn(),
    refresh: vi.fn(),
    updateFavoriteSongForDate: vi.fn(),
  });
});

// Mock useFutureListens composable
const mockFutureListensData = ref<{ items: [] } | null>({ items: [] });

mockNuxtImport('useFutureListens', () => {
  return () => ({
    data: mockFutureListensData,
    pending: ref(false),
    error: ref(null),
    refresh: vi.fn(),
  });
});

describe('Dashboard Page - Component Tests', () => {
  const TODAY = new Date('2026-01-15T12:00:00.000Z');

  beforeEach(() => {
    vi.setSystemTime(TODAY);
    // Reset mocks - use empty array to avoid null reference errors in component
    mockListensData.value = [];
    mockListensPending.value = false;
    mockListensError.value = null;
    mockFutureListensData.value = { items: [] };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Album Display', () => {
    it('should display album artwork when albums have images', async () => {
      // Given - API returns listens with today's album (with image)
      const todayAlbum = dailyAlbumListen({
        album: album({
          albumName: "Today's Album",
          imageUrl: 'https://example.com/album.jpg',
        }),
      });

      mockListensData.value = [
        {
          date: TODAY.toISOString(),
          albums: [todayAlbum],
          favoriteSong: null,
        },
      ];

      // When - Mount the dashboard
      const wrapper = await mountSuspended(Dashboard);

      // Then - Album image should be visible (NuxtImg renders as img)
      const img = wrapper.find('img');
      expect(img.exists()).toBe(true);
    });

    it('should render album card with today styling', async () => {
      // Given - Album with artwork
      const todayAlbum = dailyAlbumListen({
        album: album({
          albumName: "Today's Album",
          imageUrl: 'https://example.com/album.jpg',
        }),
      });

      mockListensData.value = [
        {
          date: TODAY.toISOString(),
          albums: [todayAlbum],
          favoriteSong: null,
        },
      ];

      // When - Mount the dashboard
      const wrapper = await mountSuspended(Dashboard);

      // Then - Album card should have today class for special styling
      const albumCard = wrapper.find('.album-day-card');
      expect(albumCard.exists()).toBe(true);
      expect(albumCard.classes()).toContain('today');
    });

    it('should show loading state while fetching', async () => {
      // Given - Data is pending
      mockListensPending.value = true;
      mockListensData.value = [];

      // When - Mount the dashboard
      const wrapper = await mountSuspended(Dashboard);

      // Then - Should show loading state
      expect(wrapper.text()).toContain('Loading...');
    });

    it('should show empty state when no listens exist', async () => {
      // Given - Empty listens response
      mockListensData.value = [];

      // When
      const wrapper = await mountSuspended(Dashboard);

      // Then
      expect(wrapper.text()).toContain('No listens yet for this month');
    });

    it('should display multiple albums for a day with count badge', async () => {
      // Given - Today has multiple albums
      const album1 = dailyAlbumListen({
        album: album({ albumName: 'First Album' }),
      });
      const album2 = dailyAlbumListen({
        album: album({ albumName: 'Second Album' }),
      });

      mockListensData.value = [
        {
          date: TODAY.toISOString(),
          albums: [album1, album2],
          favoriteSong: null,
        },
      ];

      // When
      const wrapper = await mountSuspended(Dashboard);

      // Then - Should show album count badge (2)
      expect(wrapper.text()).toContain('2');
    });
  });

  describe('Scroll to Today', () => {
    it('should have scrollable container', async () => {
      // Given
      mockListensData.value = [
        {
          date: TODAY.toISOString(),
          albums: [dailyAlbumListen()],
          favoriteSong: null,
        },
      ];

      // When
      const wrapper = await mountSuspended(Dashboard);

      // Then - Scroll container should exist
      const scrollContainer = wrapper.find('.overflow-y-auto');
      expect(scrollContainer.exists()).toBe(true);
    });

    it('should display today card with album image', async () => {
      // Given
      const todayAlbum = dailyAlbumListen({
        album: album({
          albumName: 'Album for Today',
          imageUrl: 'https://example.com/today.jpg',
        }),
      });

      mockListensData.value = [
        {
          date: TODAY.toISOString(),
          albums: [todayAlbum],
          favoriteSong: null,
        },
      ];

      // When
      const wrapper = await mountSuspended(Dashboard);

      // Then - Today's card should have an image
      const img = wrapper.find('img');
      expect(img.exists()).toBe(true);
    });
  });

  describe('Album Click and Modal', () => {
    it('should render day with albums and clickable card', async () => {
      // Given - Today has an album
      const todayAlbum = dailyAlbumListen({
        album: album({
          albumName: 'Clicked Album',
          albumId: 'album-123',
        }),
      });

      mockListensData.value = [
        {
          date: TODAY.toISOString(),
          albums: [todayAlbum],
          favoriteSong: null,
        },
      ];

      // When
      const wrapper = await mountSuspended(Dashboard);

      // Then - Find the clickable card (has cursor-pointer class when has albums)
      const albumCard = wrapper.find('.album-day-card');
      expect(albumCard.exists()).toBe(true);

      // Card with albums should have cursor-pointer class
      expect(albumCard.classes()).toContain('cursor-pointer');
    });

    it('should render empty day without albums', async () => {
      // Given - Today has no albums
      mockListensData.value = [
        {
          date: TODAY.toISOString(),
          albums: [],
          favoriteSong: null,
        },
      ];

      // When
      const wrapper = await mountSuspended(Dashboard);

      // Find the day card - it should exist with empty state
      const albumCard = wrapper.find('.album-day-card');
      expect(albumCard.exists()).toBe(true);

      // Empty state shows a dash
      expect(wrapper.text()).toContain('—');
    });
  });

  describe('Album Card Rendering', () => {
    it('should display album image when URL is provided', async () => {
      // Given
      const todayAlbum = dailyAlbumListen({
        album: album({
          imageUrl: 'https://example.com/album-art.jpg',
        }),
      });

      mockListensData.value = [
        {
          date: TODAY.toISOString(),
          albums: [todayAlbum],
          favoriteSong: null,
        },
      ];

      // When
      const wrapper = await mountSuspended(Dashboard);

      // Then - Image should be rendered via NuxtImg
      const img = wrapper.find('img');
      expect(img.exists()).toBe(true);
    });
  });

  describe('Day Number Display', () => {
    it('should show correct day number for today', async () => {
      // Given - Today is January 15th
      mockListensData.value = [
        {
          date: TODAY.toISOString(),
          albums: [dailyAlbumListen()],
          favoriteSong: null,
        },
      ];

      // When
      const wrapper = await mountSuspended(Dashboard);

      // Then - Should show day number 15
      expect(wrapper.text()).toContain('15');
    });

    it('should show month header for first day of month', async () => {
      // Given - Data starting from first of the month
      const firstOfMonth = new Date('2026-01-01T00:00:00.000Z');

      mockListensData.value = [
        {
          date: firstOfMonth.toISOString(),
          albums: [],
          favoriteSong: null,
        },
        {
          date: TODAY.toISOString(),
          albums: [dailyAlbumListen()],
          favoriteSong: null,
        },
      ];

      // When
      const wrapper = await mountSuspended(Dashboard);

      // Then - Should show January 2026
      expect(wrapper.text()).toContain('January 2026');
    });
  });
});
