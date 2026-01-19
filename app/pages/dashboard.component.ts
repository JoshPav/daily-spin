import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { flushPromises } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, nextTick, ref } from 'vue';
import type { DailyListens } from '~~/shared/schema';
import { album, dailyAlbumListen } from '~~/tests/factories/api.factory';
// @ts-expect-error - Vue files are handled by Nuxt test environment at runtime
import Dashboard from './dashboard.vue';

// Helper to wait for all async operations to complete
const waitForAsyncUpdates = async () => {
  // Multiple rounds to ensure all microtasks and Vue updates complete
  await flushPromises();
  await nextTick();
  await flushPromises();
  await nextTick();
};

/**
 * Component tests using composable-level mocking.
 *
 * This approach mocks useListens and useFutureListens directly, giving full
 * control over the data and loading states without relying on registerEndpoint.
 */

// Shared mock state that tests can modify
let mockListensData: DailyListens[] = [];
let mockListensPending = true;

// Mock useAuth to bypass auth loading
mockNuxtImport('useAuth', () => {
  return () => ({
    loggedIn: computed(() => true),
    user: computed(() => ({
      id: 'test-user-id',
      name: 'Test User',
      image: 'https://example.com/avatar.jpg',
      initial: 'T',
    })),
    loading: ref(false),
    requiresReauth: computed(() => false),
  });
});

// Mock useListens to return controlled data
mockNuxtImport('useListens', () => {
  return () => ({
    data: computed(() => mockListensData),
    pending: computed(() => mockListensPending),
    loadingMore: ref(false),
    hasMore: ref(false),
    error: ref(null),
    fetchMore: vi.fn(),
    refresh: vi.fn(),
    updateFavoriteSongForDate: vi.fn(),
  });
});

// Mock useFutureListens to return empty data
mockNuxtImport('useFutureListens', () => {
  return () => ({
    data: ref({ items: [] }),
    pending: ref(false),
    error: ref(null),
    refresh: vi.fn(),
  });
});

describe('Dashboard Page', () => {
  const TODAY = new Date('2026-01-15T12:00:00.000Z');

  beforeEach(() => {
    vi.setSystemTime(TODAY);
    // Reset mock state
    mockListensData = [];
    mockListensPending = false;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Album Display', () => {
    it('should show empty state when no listens', async () => {
      // Given - Empty listens data
      mockListensData = [];
      mockListensPending = false;

      // When
      const wrapper = await mountSuspended(Dashboard);
      await waitForAsyncUpdates();

      // Then
      expect(wrapper.text()).toContain('No listens yet for this month');
    });

    it('should display album when data is present', async () => {
      // Given - Listens with today's album
      const todayAlbum = dailyAlbumListen({
        album: album({
          albumName: "Today's Album",
          imageUrl: 'https://example.com/album.jpg',
        }),
      });

      mockListensData = [
        {
          date: TODAY.toISOString(),
          albums: [todayAlbum],
          favoriteSong: null,
        },
      ];
      mockListensPending = false;

      // When
      const wrapper = await mountSuspended(Dashboard);
      await waitForAsyncUpdates();

      // Then - Album image should be visible
      const img = wrapper.find('img');
      expect(img.exists()).toBe(true);
    });

    it('should display multiple albums for a day', async () => {
      // Given - Multiple albums for today
      const album1 = dailyAlbumListen({
        album: album({ albumName: 'First Album' }),
      });
      const album2 = dailyAlbumListen({
        album: album({ albumName: 'Second Album' }),
      });

      mockListensData = [
        {
          date: TODAY.toISOString(),
          albums: [album1, album2],
          favoriteSong: null,
        },
      ];
      mockListensPending = false;

      // When
      const wrapper = await mountSuspended(Dashboard);
      await waitForAsyncUpdates();

      // Then - Should show count badge
      expect(wrapper.text()).toContain('2');
    });
  });
});
