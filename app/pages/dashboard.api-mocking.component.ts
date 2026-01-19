import {
  mockNuxtImport,
  mountSuspended,
  registerEndpoint,
} from '@nuxt/test-utils/runtime';
import { flushPromises } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, nextTick, ref } from 'vue';
import type { DailyListens, GetFutureListensResponse } from '~~/shared/schema';
import { album, dailyAlbumListen } from '~~/tests/factories/component.factory';
// @ts-expect-error - Vue files are handled by Nuxt test environment at runtime
import Dashboard from './dashboard.vue';

/**
 * EXPERIMENTAL: Component tests using API-level mocking with registerEndpoint.
 *
 * This approach:
 * - Uses registerEndpoint to mock Nuxt's internal API routes
 * - Mocks only useAuth to bypass auth loading (minimal composable mocking)
 * - Lets the real useListens and useFutureListens composables run
 *
 * FINDINGS:
 * 1. MSW doesn't work for Nuxt API routes because $fetch uses Nitro's
 *    internal router, not actual HTTP requests.
 * 2. registerEndpoint IS the correct approach for mocking Nuxt API routes.
 * 3. The real useListens composable CAN run with API-level mocking.
 *
 * LIMITATIONS:
 * - useState shares state between tests, causing test isolation issues.
 * - Once data is loaded in one test, it persists in subsequent tests.
 * - Tests must be carefully ordered or run in isolation.
 *
 * RECOMMENDATION:
 * For reliable, isolated component tests, prefer composable-level mocking
 * (see dashboard.component.ts). API-level mocking is more realistic but
 * requires careful state management.
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

// Skip these tests by default due to useState isolation issues.
// Run with: bun vitest run --config vitest.config.component.ts app/pages/dashboard.api-mocking.component.ts
describe.skip('Dashboard Page - API-level mocking with registerEndpoint', () => {
  const TODAY = new Date('2026-01-15T12:00:00.000Z');

  // Helper to set up API handlers using Nuxt's registerEndpoint
  const setupListensHandler = (listens: DailyListens[]) => {
    registerEndpoint('/api/listens', {
      method: 'GET',
      handler: () => listens,
    });
  };

  const setupFutureListensHandler = (
    response: GetFutureListensResponse = { items: [] },
  ) => {
    registerEndpoint('/api/future-listens', {
      method: 'GET',
      handler: () => response,
    });
  };

  beforeEach(() => {
    vi.setSystemTime(TODAY);
    // Set up default handlers
    setupFutureListensHandler();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Album Display with registerEndpoint', () => {
    // Note: Empty state test runs first because useState shares state between tests.
    // Once data is loaded in a test, it persists in subsequent tests.
    it('should show empty state when API returns empty array', async () => {
      // Given - Empty response from API
      setupListensHandler([]);

      // When
      const wrapper = await mountSuspended(Dashboard);
      await flushPromises();
      await nextTick();

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

      // When - Mount the dashboard and wait for async data
      const wrapper = await mountSuspended(Dashboard);
      await flushPromises();
      await nextTick();

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
      await flushPromises();
      await nextTick();

      // Then - Should show count badge
      expect(wrapper.text()).toContain('2');
    });
  });
});
