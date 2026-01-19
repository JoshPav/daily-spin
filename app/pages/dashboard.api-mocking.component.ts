import {
  mockNuxtImport,
  mountSuspended,
  registerEndpoint,
} from '@nuxt/test-utils/runtime';
import { flushPromises } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, nextTick, ref } from 'vue';
import type { DailyListens, GetFutureListensResponse } from '~~/shared/schema';
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
 * EXPERIMENTAL: Component tests using API-level mocking with registerEndpoint.
 *
 * This approach:
 * - Uses registerEndpoint to mock Nuxt's internal API routes
 * - Mocks only useAuth to bypass auth loading (minimal composable mocking)
 * - Lets the real useListens and useFutureListens composables run
 *
 * Key findings:
 * 1. MSW doesn't work for Nuxt API routes because $fetch uses Nitro's
 *    internal router, not actual HTTP requests.
 * 2. registerEndpoint IS the correct approach for mocking Nuxt API routes.
 *
 * LIMITATION:
 * The Nuxt test environment appears to cache composable state between tests
 * in ways that are difficult to reset. This causes test isolation issues
 * where the first test's state persists to subsequent tests.
 */

// Mock only useAuth to bypass auth loading - use proper Vue refs
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

// Skip these tests - see documentation above for why
describe.skip('Dashboard Page - API-level mocking with registerEndpoint', () => {
  const TODAY = new Date('2026-01-15T12:00:00.000Z');

  // Store unregister functions to clean up between tests
  const unregisterFns: Array<() => void> = [];

  // Helper to set up API handlers using Nuxt's registerEndpoint
  const setupListensHandler = (listens: DailyListens[]) => {
    const unregister = registerEndpoint('/api/listens', {
      method: 'GET',
      handler: () => listens,
    });
    unregisterFns.push(unregister);
  };

  const setupFutureListensHandler = (
    response: GetFutureListensResponse = { items: [] },
  ) => {
    const unregister = registerEndpoint('/api/future-listens', {
      method: 'GET',
      handler: () => response,
    });
    unregisterFns.push(unregister);
  };

  beforeEach(() => {
    vi.setSystemTime(TODAY);
    // Set up default handlers
    setupFutureListensHandler();
  });

  afterEach(() => {
    vi.useRealTimers();
    // Clean up registered endpoints
    unregisterFns.forEach((fn) => fn());
    unregisterFns.length = 0;
  });

  describe('Album Display with registerEndpoint', () => {
    it('should show empty state when API returns empty array', async () => {
      // Given - Empty response from API
      setupListensHandler([]);

      // When
      const wrapper = await mountSuspended(Dashboard);
      await waitForAsyncUpdates();

      // Then
      expect(wrapper.text()).toContain('No listens yet for this month');
    });

    it('should display album when API returns data', async () => {
      // Given - API returns listens with today's album
      const todayAlbum = dailyAlbumListen({
        album: album({
          albumName: "Today's Album",
          imageUrl: 'https://example.com/album.jpg',
        }),
      });

      setupListensHandler([
        {
          date: TODAY.toISOString(),
          albums: [todayAlbum],
          favoriteSong: null,
        },
      ]);

      // When
      const wrapper = await mountSuspended(Dashboard);
      await waitForAsyncUpdates();

      // Then - Album image should be visible
      const img = wrapper.find('img');
      expect(img.exists()).toBe(true);
    });

    it('should display multiple albums for a day', async () => {
      // Given - API returns multiple albums for today
      const album1 = dailyAlbumListen({
        album: album({ albumName: 'First Album' }),
      });
      const album2 = dailyAlbumListen({
        album: album({ albumName: 'Second Album' }),
      });

      setupListensHandler([
        {
          date: TODAY.toISOString(),
          albums: [album1, album2],
          favoriteSong: null,
        },
      ]);

      // When
      const wrapper = await mountSuspended(Dashboard);
      await waitForAsyncUpdates();

      // Then - Should show count badge
      expect(wrapper.text()).toContain('2');
    });
  });
});
