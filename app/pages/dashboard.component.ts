/** biome-ignore-all lint/style/noNonNullAssertion: we are in control of test data */
import { mockNuxtImport, registerEndpoint } from '@nuxt/test-utils/runtime';
import { flushPromises } from '@vue/test-utils';
import { getDate } from 'date-fns';
import { readBody } from 'h3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, ref } from 'vue';
import type { DailyListens, FutureListenItem } from '~~/shared/schema';
import {
  cleanupAfterTest,
  mountPage,
  waitFor,
  waitForElement,
  waitForText,
  wrapper,
} from '~~/tests/component';
import {
  dailyAlbumListen,
  favouriteSong,
  futureListenItem,
  getFutureListensResponse,
  getListensReponse,
} from '~~/tests/factories/api.factory';

const mountDashboard = () => mountPage('/dashboard');

// Shared mock state that tests can modify
let mockListensData: DailyListens[] = [];
let mockFutureListensData: FutureListenItem[] = [];
let listensCallCount = 0;
let deletedFutureListenIds: string[] = [];
let favoriteSongPatchCalls: { date: string; body: unknown }[] = [];

// Mock track data for Spotify API
const mockTracks = [
  { id: 'track-1', name: 'First Track', track_number: 1, duration_ms: 180000 },
  { id: 'track-2', name: 'Second Track', track_number: 2, duration_ms: 240000 },
  { id: 'track-3', name: 'Third Track', track_number: 3, duration_ms: 200000 },
];

// Mock Spotify API for track fetching
const mockSpotifyAlbumsGet = vi.fn().mockResolvedValue({
  tracks: { items: mockTracks },
});

mockNuxtImport('useSpotifyApi', () => {
  return async () => ({
    albums: {
      get: mockSpotifyAlbumsGet,
    },
  });
});

// Mock useAuth to bypass auth loading (must be at module level)
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

// Register endpoint mock for /api/listens
// Returns data on first call, empty on subsequent calls (simulates no more history)
registerEndpoint('/api/listens', () => {
  listensCallCount++;
  if (listensCallCount === 1) {
    return mockListensData;
  }
  // Return empty days for subsequent calls (fetchMore)
  return [];
});

// Register endpoint mock for /api/future-listens (GET)
registerEndpoint('/api/future-listens', () => ({
  items: mockFutureListensData,
}));

// Note: registerEndpoint doesn't support dynamic :id params
// We'll register specific DELETE endpoints in the modal test describe block

describe('Dashboard Page', () => {
  const TODAY = new Date('2026-01-15T12:00:00.000Z');

  beforeEach(() => {
    vi.setSystemTime(TODAY);
    mockListensData = [];
    mockFutureListensData = [];
    listensCallCount = 0;
    deletedFutureListenIds = [];
    favoriteSongPatchCalls = [];
    // Reset Spotify API mock
    mockSpotifyAlbumsGet.mockClear();
    // Clear Nuxt data cache to ensure fresh fetch
    clearNuxtData('listens');
    clearNuxtData('future-listens');
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanupAfterTest();
  });

  describe('when the user has past listens', () => {
    beforeEach(() => {
      mockListensData = getListensReponse({ n: 14, startDate: TODAY });
    });

    it('should render the current month sticky banner', async () => {
      // When
      const wrapper = await mountDashboard();

      // Then
      const stickyHeader = wrapper.find('[data-testid="sticky-month-header"]');
      expect(stickyHeader.exists()).toBe(true);
      expect(stickyHeader.text()).toBe('January 2026');
    });

    describe('past listens', () => {
      it('should render past listens correctly', async () => {
        // When
        const wrapper = await mountDashboard();

        // Then - should render all listens
        const pastAlbumDays = wrapper.findAll('[data-testid="past-album-day"]');
        expect(pastAlbumDays).toHaveLength(mockListensData.length);

        // And - should display the correct date and image on each listen
        for (let i = 0; i < mockListensData.length; i++) {
          const dayNumber = pastAlbumDays[i]?.find(
            '[data-testid="day-number"]',
          );
          const expectedDay = getDate(new Date(mockListensData[i]!.date));
          expect(dayNumber?.text()).toEqual(String(expectedDay));

          const albumImage = pastAlbumDays[i]?.find(
            '[data-testid="album-image"]',
          );
          const expectedImageUrl =
            mockListensData[i]?.albums[0]?.album.imageUrl;
          expect(albumImage?.attributes('src')).toEqual(expectedImageUrl);
        }
      });

      it('should render a chip for albums without a song of the day', async () => {
        // Given - ensure albums exist but no favorite song
        mockListensData = mockListensData.map((listen) => ({
          ...listen,
          favoriteSong: null,
          albums:
            listen.albums.length > 0 ? listen.albums : [dailyAlbumListen()],
        }));

        // When
        const wrapper = await mountDashboard();

        // Then - UChip renders a warning indicator when needsFavoriteSong is true
        // The chip indicator is a span sibling to the album-day-card with warning background
        const chipIndicators = wrapper.findAll(
          '[data-testid="past-album-day"] + span',
        );
        expect(chipIndicators.length).toBeGreaterThan(0);

        // At least some should have the warning color class
        const hasWarningChip = chipIndicators.some((indicator) =>
          indicator.classes().some((c) => c.includes('warning')),
        );
        expect(hasWarningChip).toBe(true);
      });

      it('should render the formattedMonth name for the 1st day of the month', async () => {
        // Given - set first listen to Jan 1st so it displays the month label
        mockListensData[0]!.date = new Date(
          '2026-01-01T12:00:00.000Z',
        ).toISOString();

        // When
        const wrapper = await mountDashboard();

        // Then - find the month label on the first day (Jan 1st)
        const monthLabels = wrapper.findAll('[data-testid="month-label"]');
        expect(monthLabels.length).toBeGreaterThanOrEqual(1);

        // The first month label should say JAN (short format)
        expect(monthLabels[0]?.text()).toBe('JAN');
      });

      describe('when a day has no albums', () => {
        beforeEach(() => {
          // Set the first day (oldest, not today) to have no albums
          mockListensData[0]!.albums = [];
          mockListensData[0]!.favoriteSong = null;
        });

        it('should render empty day correctly', async () => {
          // When
          const wrapper = await mountDashboard();

          // Then - past days without albums show the empty album cover
          const emptyCovers = wrapper.findAll(
            '[data-testid="empty-album-cover"]',
          );
          expect(emptyCovers.length).toBeGreaterThanOrEqual(1);

          // And - the empty day should not have a chip indicator
          const pastAlbumDays = wrapper.findAll(
            '[data-testid="past-album-day"]',
          );
          const emptyDayCard = pastAlbumDays[0];
          const emptyDayImages = emptyDayCard?.findAll(
            '[data-testid="album-image"]',
          );
          expect(emptyDayImages?.length).toBe(0);

          // The chip should not be visible for empty days (check sibling span)
          const chipIndicator = emptyDayCard?.element.nextElementSibling;
          const hasWarningClass =
            chipIndicator?.classList.contains('bg-warning');
          expect(hasWarningClass).toBeFalsy();
        });

        it('should render the formattedMonth name for the 1st day of the month', async () => {
          // Given - first day (empty) is set to Jan 1st
          mockListensData[0]!.date = new Date(
            '2026-01-01T12:00:00.000Z',
          ).toISOString();

          // When
          const wrapper = await mountDashboard();

          // Then - the empty day on Jan 1st should still show month label
          const monthLabels = wrapper.findAll('[data-testid="month-label"]');
          expect(monthLabels.length).toBeGreaterThanOrEqual(1);
          expect(monthLabels[0]?.text()).toBe('JAN');
        });
      });

      describe('multiple albums', () => {
        beforeEach(() => {
          // Add multiple albums to the first day
          mockListensData[0]!.albums = [
            dailyAlbumListen(),
            dailyAlbumListen(),
            dailyAlbumListen(),
          ];
        });

        it('should render multiple albums correctly', async () => {
          // When
          const wrapper = await mountDashboard();

          // Then - find the day with multiple albums
          const pastAlbumDays = wrapper.findAll(
            '[data-testid="past-album-day"]',
          );
          const dayWithMultiple = pastAlbumDays[0];
          const albumImages = dayWithMultiple?.findAll(
            '[data-testid="album-image"]',
          );

          // Should have 3 stacked images with stack classes
          expect(albumImages?.length).toBe(3);
          expect(albumImages?.[0]?.classes()).toContain('stack-0');
          expect(albumImages?.[1]?.classes()).toContain('stack-1');
          expect(albumImages?.[2]?.classes()).toContain('stack-2');

          // And - first album should be on top (highest z-index)
          const firstImageZIndex = albumImages?.[0]?.attributes('style');
          const secondImageZIndex = albumImages?.[1]?.attributes('style');
          expect(firstImageZIndex).toContain('z-index: 3');
          expect(secondImageZIndex).toContain('z-index: 2');

          // And - should show album count badge
          const countBadge = dayWithMultiple?.find(
            '[data-testid="album-count-badge"]',
          );
          expect(countBadge?.exists()).toBe(true);
          expect(countBadge?.text()).toBe('3');
        });
      });

      describe('daily listens modal', () => {
        // Define fixed test data to avoid random data issues
        const testDailyListen: DailyListens = {
          date: new Date('2026-01-10T12:00:00.000Z').toISOString(),
          albums: [
            {
              id: 'test-album-listen-id',
              album: {
                albumId: 'test-album-spotify-id',
                albumName: 'Test Album Name',
                artists: [{ name: 'Test Artist', spotifyId: 'artist-id' }],
                imageUrl: 'https://example.com/album.jpg',
              },
              listenMetadata: {
                listenOrder: 'ordered',
                listenMethod: 'spotify',
                listenTime: 'morning',
              },
            },
          ],
          favoriteSong: null,
        };

        /**
         * Opens the DailyListensModal by clicking a past listen that has albums.
         * Waits for the modal to appear in the DOM.
         */
        const openDailyListenModal = async (): Promise<Element> => {
          const pastAlbumDays = wrapper!.findAll(
            '[data-testid="past-album-day"]',
          );
          expect(pastAlbumDays.length).toBeGreaterThan(0);

          const dayWithAlbum = pastAlbumDays.find((day) =>
            day.find('[data-testid="album-image"]').exists(),
          );
          expect(dayWithAlbum).toBeDefined();

          await dayWithAlbum!.trigger('click');

          return waitForElement('[role="dialog"]');
        };

        /**
         * Expands the track list by clicking "View tracks" and waits for tracks to load.
         */
        const expandTrackList = async (modal: Element): Promise<void> => {
          const viewTracksButton = Array.from(
            modal.querySelectorAll('button'),
          ).find((btn) => btn.textContent?.includes('View tracks'));
          expect(viewTracksButton).toBeDefined();
          (viewTracksButton as HTMLElement).click();

          // Wait for tracks to load from mocked Spotify API
          await waitForText(modal, 'First Track');
        };

        beforeEach(() => {
          // Override first listen with our fixed test data
          mockListensData[0] = testDailyListen;
        });

        it('should render the DailyListensModal correctly', async () => {
          // When
          await mountDashboard();
          const modal = await openDailyListenModal();

          // Then - modal should display the formatted date
          expect(modal.textContent).toContain('January 10th 2026');

          // And - modal should display album count
          expect(modal.textContent).toContain('1 album listened');

          // And - modal should display album artwork
          const albumImage = modal.querySelector(
            `img[src="${testDailyListen.albums[0]?.album.imageUrl}"]`,
          );
          expect(albumImage).not.toBeNull();

          // And - modal should display album name and artist
          expect(modal.textContent).toContain(
            testDailyListen.albums[0]?.album.albumName,
          );
          expect(modal.textContent).toContain(
            testDailyListen.albums[0]?.album.artists[0]?.name,
          );

          // And - modal should display listen metadata
          expect(modal.textContent).toContain('Ordered');
          expect(modal.textContent).toContain('Morning');
          expect(modal.textContent).toContain('Spotify');

          // And - modal should have Open in Spotify button
          const spotifyLink = modal.querySelector(
            `a[href="https://open.spotify.com/album/${testDailyListen.albums[0]?.album.albumId}"]`,
          );
          expect(spotifyLink).not.toBeNull();
        });

        it('should show Song of the Day placeholder when no favorite song is selected', async () => {
          // Given - testDailyListen has favoriteSong: null
          await mountDashboard();
          const modal = await openDailyListenModal();

          // Then - modal should show the placeholder text
          expect(modal.textContent).toContain('Song of the Day');
          expect(modal.textContent).toContain(
            'Select a track from an album below',
          );

          // And - should NOT show a "Clear" button (only shown when song is selected)
          const clearButton = Array.from(modal.querySelectorAll('button')).find(
            (btn) => btn.textContent?.includes('Clear'),
          );
          expect(clearButton).toBeUndefined();
        });

        describe('when a favorite song is selected', () => {
          const testFavoriteSong = {
            spotifyId: 'track-123',
            name: 'My Favorite Track',
            trackNumber: 5,
            albumId: 'test-album-spotify-id',
          };

          beforeEach(() => {
            // Set the favorite song on the test data
            mockListensData[0] = {
              ...testDailyListen,
              favoriteSong: testFavoriteSong,
            };
          });

          it('should display the current favorite song', async () => {
            // When
            await mountDashboard();
            const modal = await openDailyListenModal();

            // Then - modal should show the song name
            expect(modal.textContent).toContain(testFavoriteSong.name);

            // And - should show the track number
            expect(modal.textContent).toContain(
              `${testFavoriteSong.trackNumber}.`,
            );

            // And - should show a "Clear" button
            const clearButton = Array.from(
              modal.querySelectorAll('button'),
            ).find((btn) => btn.textContent?.includes('Clear'));
            expect(clearButton).toBeDefined();

            // And - should have a link to play the track on Spotify
            const spotifyTrackLink = modal.querySelector(
              `a[href="https://open.spotify.com/track/${testFavoriteSong.spotifyId}"]`,
            );
            expect(spotifyTrackLink).not.toBeNull();
          });
        });

        it('should expand track list when Song of the Day placeholder is clicked', async () => {
          // When
          await mountDashboard();
          const modal = await openDailyListenModal();

          // Initially, "View tracks" section should exist but tracks should not be expanded
          expect(modal.textContent).toContain('View tracks');

          // Find and click the Song of the Day placeholder (the clickable container div)
          // The clickable div has cursor-pointer class when no song is selected
          const placeholderContainer = modal.querySelector(
            'section div.cursor-pointer',
          );
          expect(placeholderContainer).not.toBeNull();
          (placeholderContainer as HTMLElement).click();

          // Then - the track list should be expanded and showing tracks
          await waitForText(modal, 'First Track');
        });

        describe('tracks section', () => {
          it('should render tracks from Spotify API when View tracks is clicked', async () => {
            // When
            await mountDashboard();
            const modal = await openDailyListenModal();

            // Expand the track list
            await expandTrackList(modal);

            // Then - Spotify API should have been called with the album ID
            expect(mockSpotifyAlbumsGet).toHaveBeenCalledWith(
              testDailyListen.albums[0]?.album.albumId,
            );

            // And - tracks should be rendered
            expect(modal.textContent).toContain('First Track');
            expect(modal.textContent).toContain('Second Track');
            expect(modal.textContent).toContain('Third Track');

            // And - track numbers should be displayed
            expect(modal.textContent).toContain('1');
            expect(modal.textContent).toContain('2');
            expect(modal.textContent).toContain('3');

            // And - durations should be formatted (3:00 for 180000ms)
            expect(modal.textContent).toContain('3:00');
            expect(modal.textContent).toContain('4:00');
          });

          it('should set favorite song when a track is clicked', async () => {
            const dateParam = testDailyListen.date.split('T')[0];

            // Register the favorite song update endpoint
            registerEndpoint(`/api/listens/${dateParam}/favorite-song`, {
              method: 'PATCH',
              handler: async (event) => {
                const body = await readBody(event);
                favoriteSongPatchCalls.push({ date: dateParam!, body });
                return {
                  favoriteSong: {
                    spotifyId: 'track-1',
                    name: 'First Track',
                    trackNumber: 1,
                    albumId: testDailyListen.albums[0]?.album.albumId,
                  },
                };
              },
            });

            // Ensure test starts with no favorite song
            mockListensData[0] = { ...testDailyListen, favoriteSong: null };
            clearNuxtData('listens');
            listensCallCount = 0;

            // When
            await mountDashboard();
            const modal = await openDailyListenModal();

            // Verify we start with the placeholder (no song selected)
            expect(modal.textContent).toContain(
              'Select a track from an album below',
            );

            // Expand the track list and click the first track
            await expandTrackList(modal);
            const trackButton = Array.from(
              modal.querySelectorAll('button'),
            ).find((btn) => btn.textContent?.includes('First Track'));
            expect(trackButton).toBeDefined();
            (trackButton as HTMLElement).click();

            // Wait for the Clear button to appear (indicates selection was processed)
            await waitFor(() =>
              Array.from(modal.querySelectorAll('button')).some((btn) =>
                btn.textContent?.includes('Clear'),
              ),
            );

            // Then - the PATCH endpoint should have been called
            expect(favoriteSongPatchCalls).toHaveLength(1);
            expect(favoriteSongPatchCalls[0]).toEqual({
              date: dateParam,
              body: {
                spotifyId: 'track-1',
                name: 'First Track',
                trackNumber: 1,
                albumId: testDailyListen.albums[0]?.album.albumId,
              },
            });

            // And - the Song of the Day should show the track number format "1."
            expect(modal.textContent).toContain('1.');
          });

          it('should allow changing the favorite track when one is already chosen', async () => {
            const dateParam = testDailyListen.date.split('T')[0];

            // Given - start with First Track as the favorite
            const initialFavoriteSong = favouriteSong({
              spotifyId: 'track-1',
              name: 'First Track',
              trackNumber: 1,
              albumId: testDailyListen.albums[0]!.album.albumId,
            });
            mockListensData[0] = {
              ...testDailyListen,
              favoriteSong: initialFavoriteSong,
            };
            clearNuxtData('listens');
            listensCallCount = 0;

            // Register the favorite song update endpoint
            registerEndpoint(`/api/listens/${dateParam}/favorite-song`, {
              method: 'PATCH',
              handler: async (event) => {
                const body = await readBody(event);
                favoriteSongPatchCalls.push({ date: dateParam!, body });
                return {
                  favoriteSong: {
                    spotifyId: 'track-2',
                    name: 'Second Track',
                    trackNumber: 2,
                    albumId: testDailyListen.albums[0]?.album.albumId,
                  },
                };
              },
            });

            // When
            await mountDashboard();
            const modal = await openDailyListenModal();

            // Verify we start with First Track selected
            expect(modal.textContent).toContain('First Track');
            expect(modal.textContent).toContain('1.');

            // Expand the track list and click the second track
            await expandTrackList(modal);
            const trackButton = Array.from(
              modal.querySelectorAll('button'),
            ).find((btn) => btn.textContent?.includes('Second Track'));
            expect(trackButton).toBeDefined();
            (trackButton as HTMLElement).click();

            // Wait for the Song of the Day section to show "2."
            await waitFor(() => {
              const songOfTheDaySection = modal.querySelector('section');
              return songOfTheDaySection?.textContent?.includes('2.') ?? false;
            });

            // Then - the PATCH endpoint should have been called with the new track
            expect(favoriteSongPatchCalls).toHaveLength(1);
            expect(favoriteSongPatchCalls[0]).toEqual({
              date: dateParam,
              body: {
                spotifyId: 'track-2',
                name: 'Second Track',
                trackNumber: 2,
                albumId: testDailyListen.albums[0]?.album.albumId,
              },
            });

            // And - First Track should no longer be shown in Song of the Day
            const songOfTheDaySection = modal.querySelector('section');
            expect(songOfTheDaySection?.textContent).not.toContain('1.');
          });

          it('should allow clearing the favorite track', async () => {
            const dateParam = testDailyListen.date.split('T')[0];

            // Given - start with First Track as the favorite
            const initialFavoriteSong = favouriteSong({
              albumId: testDailyListen.albums[0]?.album.albumId,
            });
            mockListensData[0] = {
              ...testDailyListen,
              favoriteSong: initialFavoriteSong,
            };
            clearNuxtData('listens');
            listensCallCount = 0;

            // Register the favorite song clear endpoint (returns null)
            registerEndpoint(`/api/listens/${dateParam}/favorite-song`, {
              method: 'PATCH',
              handler: async (event) => {
                const body = await readBody(event);
                favoriteSongPatchCalls.push({ date: dateParam!, body });
                return { favoriteSong: null };
              },
            });

            // When
            await mountDashboard();
            const modal = await openDailyListenModal();

            // Verify we start with First Track selected and Clear button visible
            expect(modal.textContent).toContain(initialFavoriteSong.name);
            const clearButton = Array.from(
              modal.querySelectorAll('button'),
            ).find((btn) => btn.textContent?.includes('Clear'));
            expect(clearButton).toBeDefined();

            // Click the Clear button
            (clearButton as HTMLElement).click();

            // Wait for the placeholder text to appear
            await waitForText(modal, 'Select a track from an album below');

            // Then - the PATCH endpoint should have been called with spotifyId: null
            expect(favoriteSongPatchCalls).toHaveLength(1);
            expect(favoriteSongPatchCalls[0]).toEqual({
              date: dateParam,
              body: { spotifyId: null },
            });

            // And - Clear button should no longer be visible
            const clearButtonAfter = Array.from(
              modal.querySelectorAll('button'),
            ).find((btn) => btn.textContent?.includes('Clear'));
            expect(clearButtonAfter).toBeUndefined();
          });
        });
      });
    });

    describe('today', () => {
      describe('when there is no data for today', () => {
        beforeEach(() => {
          // Set today (last item) to have no albums - this will render as FutureAlbumDay
          const todayIndex = mockListensData.length - 1;
          mockListensData[todayIndex]!.albums = [];
          mockListensData[todayIndex]!.favoriteSong = null;
        });

        it('should render today without data correctly', async () => {
          // When
          const wrapper = await mountDashboard();

          // Then - today with no albums shows FutureAlbumDay with add button
          const addButton = wrapper.find('[data-testid="add-listen-button"]');
          expect(addButton.exists()).toBe(true);

          // And - find the future album day (today without data)
          const futureAlbumDays = wrapper.findAll(
            '[data-testid="future-album-day"]',
          );
          const todayCard = futureAlbumDays[0];

          // And - no month label since Jan 15 is not the 1st
          const monthLabel = todayCard?.find('[data-testid="month-label"]');
          expect(monthLabel?.exists()).toBeFalsy();

          // And - should show day number 15
          const dayNumber = todayCard?.find('[data-testid="day-number"]');
          expect(dayNumber?.text()).toBe('15');
        });
      });

      describe('when there is listening data for today', () => {
        // Note: By default, mockListensData includes today with album data
        // Today is rendered as PastAlbumDay when it has albums

        it('should render the formattedMonth name for the 1st day of the month', async () => {
          // Given - TODAY is Jan 15, which is NOT the 1st, so no month label
          // When
          const wrapper = await mountDashboard();

          // Then - today has album data so renders as PastAlbumDay
          // The last PastAlbumDay is today (Jan 15) - no month label since not 1st
          const pastAlbumDays = wrapper.findAll(
            '[data-testid="past-album-day"]',
          );
          const todayCard = pastAlbumDays[pastAlbumDays.length - 1];
          const monthLabel = todayCard?.find('[data-testid="month-label"]');
          expect(monthLabel?.exists()).toBeFalsy();
        });

        it('should render the day of the month', async () => {
          // When
          const wrapper = await mountDashboard();

          // Then - today has album data so renders as PastAlbumDay
          const pastAlbumDays = wrapper.findAll(
            '[data-testid="past-album-day"]',
          );
          // The last PastAlbumDay is today (Jan 15)
          const todayCard = pastAlbumDays[pastAlbumDays.length - 1];
          const dayNumber = todayCard?.find('[data-testid="day-number"]');

          // TODAY is Jan 15
          expect(dayNumber?.text()).toBe('15');
        });
      });

      describe('when there is a scheduled album for today', () => {
        beforeEach(() => {
          // Set today (last item) to have no albums
          const todayIndex = mockListensData.length - 1;
          mockListensData[todayIndex]!.albums = [];
          mockListensData[todayIndex]!.favoriteSong = null;

          // Schedule an album for today
          mockFutureListensData = [
            futureListenItem({ date: TODAY.toISOString() }),
          ];
        });

        it('should render the formattedMonth name for the 1st day of the month', async () => {
          // Given - TODAY is Jan 15, which is NOT the 1st, so no month label
          // When
          const wrapper = await mountDashboard();

          // Then - today with scheduled album renders as FutureAlbumDay
          const futureAlbumDays = wrapper.findAll(
            '[data-testid="future-album-day"]',
          );
          const todayCard = futureAlbumDays[0];
          const monthLabel = todayCard?.find('[data-testid="month-label"]');
          expect(monthLabel?.exists()).toBeFalsy();
        });

        it('should render the day of the month', async () => {
          // When
          const wrapper = await mountDashboard();

          // Then - today with scheduled album renders as FutureAlbumDay
          const futureAlbumDays = wrapper.findAll(
            '[data-testid="future-album-day"]',
          );
          const todayCard = futureAlbumDays[0];
          const dayNumber = todayCard?.find('[data-testid="day-number"]');

          // TODAY is Jan 15
          expect(dayNumber?.text()).toBe('15');
        });
      });
    });

    describe('future listens', () => {
      describe('when there are scheduled albums', () => {
        beforeEach(() => {
          const { items } = getFutureListensResponse({ startDate: TODAY });
          mockFutureListensData = items;
        });

        it('should render scheduled future listens correctly', async () => {
          // When
          const wrapper = await mountDashboard();

          // Then - find future album days with scheduled albums
          const futureAlbumDays = wrapper.findAll(
            '[data-testid="future-album-day"]',
          );

          // Find days with album images (scheduled albums)
          const daysWithImages = futureAlbumDays.filter((day) =>
            day.find('[data-testid="album-image"]').exists(),
          );
          expect(daysWithImages.length).toBeGreaterThan(0);

          // And - verify image src matches one of the scheduled albums
          const firstImage = daysWithImages[0]?.find(
            '[data-testid="album-image"]',
          );
          const scheduledImageUrls = mockFutureListensData.map(
            (item) => item.album.imageUrl,
          );
          expect(scheduledImageUrls).toContain(firstImage?.attributes('src'));

          // And - should render day number (16-21 range for Jan 15 + 1-6 days)
          const dayNumber = daysWithImages[0]?.find(
            '[data-testid="day-number"]',
          );
          const dayNum = parseInt(dayNumber?.text() ?? '0', 10);
          expect(dayNum).toBeGreaterThanOrEqual(16);
          expect(dayNum).toBeLessThanOrEqual(21);
        });

        it('should render the formattedMonth name for the 1st day of the month', async () => {
          // Given - set TODAY to Jan 27 so Feb 1 is within the 6-day future window
          const laterToday = new Date('2026-01-27T12:00:00.000Z');
          vi.setSystemTime(laterToday);
          mockListensData = getListensReponse({ n: 14, startDate: laterToday });
          const { items } = getFutureListensResponse({ startDate: laterToday });
          mockFutureListensData = items;

          // When
          const wrapper = await mountDashboard();

          // Then - Feb 1st should show the month label "FEB"
          const monthLabels = wrapper.findAll('[data-testid="month-label"]');
          const hasFebruaryLabel = monthLabels.some(
            (label) => label.text() === 'FEB',
          );
          expect(hasFebruaryLabel).toBe(true);
        });

        describe('future listens modal', () => {
          // Define a fixed test item with known values to avoid random data issues
          const testFutureListen: FutureListenItem = {
            id: 'test-modal-future-listen-id',
            date: new Date('2026-01-16T12:00:00.000Z').toISOString(),
            album: {
              spotifyId: 'test-modal-album-spotify-id',
              name: 'Test Modal Album',
              imageUrl: 'https://example.com/album.jpg',
              artists: [{ name: 'Test Modal Artist', spotifyId: 'artist-id' }],
            },
          };

          /**
           * Opens the FutureListensModal by clicking a future listen that has an album.
           */
          const openFutureListenModal = async (): Promise<Element> => {
            const futureAlbumDays = wrapper!.findAll(
              '[data-testid="future-album-day"]',
            );
            const dayWithAlbum = futureAlbumDays.find((day) =>
              day.find('[data-testid="album-image"]').exists(),
            );
            expect(dayWithAlbum).toBeDefined();

            await dayWithAlbum!.trigger('click');

            return waitForElement('[role="dialog"]');
          };

          beforeEach(() => {
            clearNuxtData('listens');
            clearNuxtData('future-listens');
            listensCallCount = 0;

            // Override mock data with our fixed test item
            mockFutureListensData = [testFutureListen];

            // Register DELETE endpoint for the test item
            registerEndpoint(`/api/future-listens/${testFutureListen.id}`, {
              method: 'DELETE',
              handler: () => {
                deletedFutureListenIds.push(testFutureListen.id);
                return { success: true };
              },
            });
          });

          it('should render the FutureListensModal correctly', async () => {
            // When
            await mountDashboard();
            const modal = await openFutureListenModal();

            // Then - modal should display album artwork
            const albumImage = modal.querySelector(
              `img[src="${testFutureListen.album.imageUrl}"]`,
            );
            expect(albumImage).not.toBeNull();

            // And - modal should display album name
            expect(modal.textContent).toContain(testFutureListen.album.name);

            // And - modal should display artist name
            const expectedArtistNames = testFutureListen.album.artists
              .map((a) => a.name)
              .join(', ');
            expect(modal.textContent).toContain(expectedArtistNames);

            // And - modal should have a link to Spotify
            const expectedSpotifyUrl = `https://open.spotify.com/album/${testFutureListen.album.spotifyId}`;
            const spotifyLink = modal.querySelector(
              `a[href="${expectedSpotifyUrl}"]`,
            );
            expect(spotifyLink).not.toBeNull();
            expect(spotifyLink?.textContent).toContain('Open in Spotify');

            // And - modal should have remove from schedule button
            const removeButton = Array.from(
              modal.querySelectorAll('button'),
            ).find((btn) => btn.textContent?.includes('Remove from schedule'));
            expect(removeButton).not.toBeNull();

            // When - clicking remove from schedule
            (removeButton as HTMLElement).click();

            // Wait for the DELETE API call to complete
            await waitFor(() =>
              deletedFutureListenIds.includes(testFutureListen.id),
            );

            // Then - the DELETE API should have been called
            expect(deletedFutureListenIds).toContain(testFutureListen.id);
          });
        });
      });

      describe('when there are no scheduled albums', () => {
        // Future days without scheduled albums show empty/placeholder state
        beforeEach(() => {
          mockFutureListensData = [];
        });

        it('should render the formattedMonth name for the 1st day of the month', async () => {
          // Given - set TODAY to Jan 27 so Feb 1 is within the 6-day future window
          const laterToday = new Date('2026-01-27T12:00:00.000Z');
          vi.setSystemTime(laterToday);
          mockListensData = getListensReponse({ n: 14, startDate: laterToday });
          // mockFutureListensData stays empty from beforeEach

          // When
          const wrapper = await mountDashboard();

          // Then - Feb 1st should show the month label "FEB"
          const monthLabels = wrapper.findAll('[data-testid="month-label"]');
          const hasFebruaryLabel = monthLabels.some(
            (label) => label.text() === 'FEB',
          );
          expect(hasFebruaryLabel).toBe(true);
        });

        it('should render empty future days correctly', async () => {
          // When
          const wrapper = await mountDashboard();

          // Then - future days without scheduled albums show empty state
          const futureAlbumDays = wrapper.findAll(
            '[data-testid="future-album-day"]',
          );
          expect(futureAlbumDays.length).toBeGreaterThan(0);

          // At least some should have empty album cover (no image)
          let hasEmptyState = false;
          for (const day of futureAlbumDays) {
            const albumImage = day.find('[data-testid="album-image"]');
            const emptyState = day.find('[data-testid="empty-album-cover"]');
            if (!albumImage.exists() && emptyState.exists()) {
              hasEmptyState = true;
              break;
            }
          }
          expect(hasEmptyState).toBe(true);

          // And - should show day numbers (16, 17, 18, etc.)
          const dayNumbers = futureAlbumDays.map((day) =>
            day.find('[data-testid="day-number"]')?.text(),
          );
          expect(dayNumbers).toContain('16');
        });

        it('should not open the modal when the placeholder is clicked', async () => {
          // When
          const wrapper = await mountDashboard();

          // Find a future day without a scheduled album
          const futureAlbumDays = wrapper.findAll(
            '[data-testid="future-album-day"]',
          );

          // Find one with empty state (no scheduled album)
          for (const day of futureAlbumDays) {
            const emptyState = day.find('[data-testid="empty-album-cover"]');
            if (emptyState.exists()) {
              // Click it
              await day.trigger('click');
              await flushPromises();

              // Modal should not open - no UModal should be rendered
              // Since the modal is lazy-loaded, we check that no modal content appears
              const modal = wrapper.find('[role="dialog"]');
              expect(modal.exists()).toBe(false);
              break;
            }
          }
        });
      });
    });
  });
});
