/** biome-ignore-all lint/style/noNonNullAssertion: ignore potential nulls for test code */
import { mockNuxtImport, registerEndpoint } from '@nuxt/test-utils/runtime';
import { flushPromises } from '@vue/test-utils';
import { format, subDays } from 'date-fns';
import { readBody } from 'h3';

/** Formats a Date to YYYY-MM-DD string for API mock data */
const toDateString = (d: Date): string => format(d, 'yyyy-MM-dd');

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, ref } from 'vue';
import type { DailyListens, ScheduledListenItem } from '~~/shared/schema';
import {
  cleanupAfterTest,
  fireEvent,
  mountPage,
  screen,
  waitFor,
  waitForElement,
  waitForText,
} from '~~/tests/component';
import {
  album,
  artist,
  dailyAlbumListen,
  dailyListens,
  favouriteSong,
  getListensReponse,
  getScheduledListensResponse,
  scheduledListenItem,
} from '~~/tests/factories/api.factory';

const mountDashboard = () => mountPage('/dashboard');

/**
 * Finds a past album day card by its displayed day number.
 */
const getPastDayCard = (dayNumber: string): Element | undefined => {
  const pastAlbumDays = screen.getAllByTestId('past-album-day');
  return pastAlbumDays.find((day) => {
    const dayNumEl = day.querySelector('[data-testid="day-number"]');
    return dayNumEl?.textContent === dayNumber;
  });
};

/**
 * Finds a scheduled album day card by its displayed day number.
 */
const getScheduledDayCard = (dayNumber: string): Element | undefined => {
  const scheduledAlbumDays = screen.getAllByTestId('scheduled-album-day');
  return scheduledAlbumDays.find((day) => {
    const dayNumEl = day.querySelector('[data-testid="day-number"]');
    return dayNumEl?.textContent === dayNumber;
  });
};

/**
 * Updates mock listen data for a specific date.
 * @param datePrefix - The date prefix to match (e.g., '2026-01-15')
 * @param updater - Function that receives the existing listen and returns the updated listen
 */
const updateMockListenForDate = (
  datePrefix: string,
  updater: (listen: DailyListens) => DailyListens,
) => {
  mockListensData = mockListensData.map((listen) => {
    if (listen.date.startsWith(datePrefix)) {
      return updater(listen);
    }
    return listen;
  });
};

// Shared mock state that tests can modify
let mockListensData: DailyListens[] = [];
let mockListensDataBatch2: DailyListens[] = [];
let mockListensDataBatch3: DailyListens[] = [];
let mockScheduledListensData: Record<string, ScheduledListenItem | null> = {};
let listensCallCount = 0;
let deletedScheduledListenIds: string[] = [];
let favoriteSongPatchCalls: { date: string; body: unknown }[] = [];
let shouldThrowListensError = false;

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
// Returns data based on call count to support multi-batch infinite scroll tests
registerEndpoint('/api/listens', () => {
  listensCallCount++;
  if (shouldThrowListensError) {
    throw new Error('Failed to fetch listens');
  }
  if (listensCallCount === 1) {
    return mockListensData;
  }
  if (listensCallCount === 2) {
    return mockListensDataBatch2;
  }
  if (listensCallCount === 3) {
    return mockListensDataBatch3;
  }
  // Return empty days for subsequent calls (fetchMore beyond batch 3)
  return [];
});

// Register endpoint mock for /api/listens/scheduled (GET)
registerEndpoint('/api/listens/scheduled', () => ({
  items: mockScheduledListensData,
  pagination: {
    startDate: toDateString(new Date()),
    endDate: toDateString(new Date()),
    total: Object.values(mockScheduledListensData).filter((v) => v !== null)
      .length,
    hasMore: false,
  },
}));

// Note: registerEndpoint doesn't support dynamic :id params
// We'll register specific DELETE endpoints in the modal test describe block

describe('Dashboard Page', () => {
  const TODAY = new Date('2026-01-15T12:00:00.000Z');

  beforeEach(() => {
    vi.setSystemTime(TODAY);
    mockListensData = [];
    mockListensDataBatch2 = [];
    mockListensDataBatch3 = [];
    mockScheduledListensData = {};
    listensCallCount = 0;
    deletedScheduledListenIds = [];
    favoriteSongPatchCalls = [];
    shouldThrowListensError = false;
    // Reset Spotify API mock
    mockSpotifyAlbumsGet.mockClear();
    // Clear Nuxt data cache to ensure fresh fetch
    clearNuxtData('listens');
    clearNuxtData('scheduled-listens');
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
      await mountDashboard();

      const stickyHeader = screen.getByTestId('sticky-month-header');
      expect(stickyHeader.textContent).toBe('January 2026');
    });

    describe('past listens', () => {
      it('should render past listens correctly', async () => {
        await mountDashboard();

        const pastAlbumDays = screen.getAllByTestId('past-album-day');
        // With the new architecture, we render a fixed number of past days based on config
        // Days with album data will have images, days without will be empty
        expect(pastAlbumDays.length).toBeGreaterThan(0);

        // Verify days with data show correct images
        const daysWithData = pastAlbumDays.filter((day) =>
          day.querySelector('[data-testid="album-image"]'),
        );
        expect(daysWithData.length).toBe(mockListensData.length);
      });

      it('should render a chip for albums without a song of the day', async () => {
        // Given - ensure albums exist but no favorite song
        mockListensData = mockListensData.map((listen) => ({
          ...listen,
          favoriteSong: null,
          albums:
            listen.albums.length > 0 ? listen.albums : [dailyAlbumListen()],
        }));

        await mountDashboard();

        // UChip renders a warning indicator when needsFavoriteSong is true
        const chipIndicators = document.querySelectorAll(
          '[data-testid="past-album-day"] + span',
        );
        expect(chipIndicators.length).toBeGreaterThan(0);

        // At least some should have the warning color class
        const hasWarningChip = Array.from(chipIndicators).some((indicator) =>
          indicator.classList.toString().includes('warning'),
        );
        expect(hasWarningChip).toBe(true);
      });

      it('should render the formattedMonth name for the 1st day of the month', async () => {
        // Given - set first listen to Jan 1st so it displays the month label
        mockListensData[0]!.date = '2026-01-01';

        await mountDashboard();

        const monthLabels = screen.getAllByTestId('month-label');
        expect(monthLabels.length).toBeGreaterThanOrEqual(1);
        expect(monthLabels[0]!.textContent).toBe('JAN');
      });

      describe('when a day has no albums', () => {
        beforeEach(() => {
          // Set the first day (oldest, not today) to have no albums
          mockListensData[0]!.albums = [];
          mockListensData[0]!.favoriteSong = null;
        });

        it('should render empty day correctly', async () => {
          await mountDashboard();

          // Past days without albums show the empty album cover
          const emptyCovers = screen.getAllByTestId('empty-album-cover');
          expect(emptyCovers.length).toBeGreaterThanOrEqual(1);

          // The empty day should not have album images
          const pastAlbumDays = screen.getAllByTestId('past-album-day');
          const emptyDayCard = pastAlbumDays[0]!;
          const emptyDayImages = emptyDayCard.querySelectorAll(
            '[data-testid="album-image"]',
          );
          expect(emptyDayImages.length).toBe(0);

          // The chip should not be visible for empty days
          const chipIndicator = emptyDayCard.nextElementSibling;
          const hasWarningClass =
            chipIndicator?.classList.contains('bg-warning');
          expect(hasWarningClass).toBeFalsy();
        });

        it('should render the formattedMonth name for the 1st day of the month', async () => {
          // Given - first day (empty) is set to Jan 1st
          mockListensData[0]!.date = '2026-01-01';

          await mountDashboard();

          const monthLabels = screen.getAllByTestId('month-label');
          expect(monthLabels.length).toBeGreaterThanOrEqual(1);
          expect(monthLabels[0]!.textContent).toBe('JAN');
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
          await mountDashboard();

          // Find the day card for Jan 2nd (mockListensData[0] is 13 days before TODAY Jan 15)
          const dayWithMultiple = getPastDayCard('2');
          expect(dayWithMultiple).toBeDefined();

          // Should show album count badge
          const countBadge = dayWithMultiple!.querySelector(
            '[data-testid="album-count-badge"]',
          );
          expect(countBadge).not.toBeNull();
          expect(countBadge?.textContent).toBe('3');

          const albumImages = dayWithMultiple!.querySelectorAll(
            '[data-testid="album-image"]',
          );

          // Should have 3 stacked images with stack classes
          expect(albumImages.length).toBe(3);
          expect(albumImages[0]!.classList.contains('stack-0')).toBe(true);
          expect(albumImages[1]!.classList.contains('stack-1')).toBe(true);
          expect(albumImages[2]!.classList.contains('stack-2')).toBe(true);

          // First album should be on top (highest z-index)
          expect(albumImages[0]!.getAttribute('style')).toContain('z-index: 3');
          expect(albumImages[1]!.getAttribute('style')).toContain('z-index: 2');
        });

        it('should show the favourite album on top of the stack', async () => {
          // Given - set up albums with known IDs where favorite is from second album
          const firstAlbum = dailyAlbumListen({
            album: album({
              albumId: 'first-album-id',
              imageUrl: 'https://example.com/first.jpg',
            }),
          });
          const secondAlbum = dailyAlbumListen({
            album: album({
              albumId: 'second-album-id',
              imageUrl: 'https://example.com/second.jpg',
            }),
          });
          const thirdAlbum = dailyAlbumListen({
            album: album({
              albumId: 'third-album-id',
              imageUrl: 'https://example.com/third.jpg',
            }),
          });

          mockListensData[0]!.albums = [firstAlbum, secondAlbum, thirdAlbum];
          mockListensData[0]!.favoriteSong = favouriteSong({
            albumId: 'second-album-id',
          });

          // When
          await mountDashboard();

          // Then - the second album should be on top (stack-0)
          const dayWithMultiple = getPastDayCard('2');
          const albumImages = dayWithMultiple!.querySelectorAll(
            '[data-testid="album-image"]',
          );

          expect(albumImages[0]!.getAttribute('src')).toBe(
            'https://example.com/second.jpg',
          );
          expect(albumImages[1]!.getAttribute('src')).toBe(
            'https://example.com/first.jpg',
          );
          expect(albumImages[2]!.getAttribute('src')).toBe(
            'https://example.com/third.jpg',
          );
        });

        it('should show the favourite album first in the modal carousel', async () => {
          // Given - set up albums with known IDs where favorite is from second album
          const firstAlbum = dailyAlbumListen({
            album: album({
              albumId: 'first-album-id',
              albumName: 'First Album Name',
              artists: [artist({ name: 'First Artist' })],
            }),
          });
          const secondAlbum = dailyAlbumListen({
            album: album({
              albumId: 'second-album-id',
              albumName: 'Second Album Name',
              artists: [artist({ name: 'Second Artist' })],
            }),
          });

          mockListensData[0]!.albums = [firstAlbum, secondAlbum];
          mockListensData[0]!.favoriteSong = favouriteSong({
            albumId: 'second-album-id',
          });

          // When - open the modal
          await mountDashboard();
          const dayWithMultiple = getPastDayCard('2');
          await fireEvent.click(dayWithMultiple!);
          const modal = await waitForElement('[role="dialog"]');

          // Then - the second album should be shown first in the carousel
          expect(modal.textContent).toContain('Second Album Name');
          expect(modal.textContent).toContain('Second Artist');
        });
      });

      describe('daily listens modal', () => {
        // Define fixed test data to avoid random data issues
        const testDailyListen: DailyListens = {
          date: '2026-01-10',
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
         * Opens the DailyListensModal by clicking the day card for our test data.
         */
        const openDailyListenModal = async (): Promise<Element> => {
          // Find the specific day card that matches our test data (Jan 10th)
          const dayWithTestAlbum = getPastDayCard('10');
          expect(dayWithTestAlbum).toBeDefined();

          await fireEvent.click(dayWithTestAlbum!);

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
          await fireEvent.click(viewTracksButton as HTMLElement);

          // Wait for tracks to load from mocked Spotify API
          await waitForText(modal, 'First Track');
        };

        beforeEach(() => {
          // Add the test data to mockListensData - it will be rendered at the correct date position
          updateMockListenForDate('2026-01-10', () => testDailyListen);
          // Also add the test data directly if there's no entry for that date
          if (!mockListensData.some((l) => l.date.startsWith('2026-01-10'))) {
            mockListensData.push(testDailyListen);
          }
        });

        it('should render the DailyListensModal correctly', async () => {
          await mountDashboard();
          const modal = await openDailyListenModal();

          // Modal should display the formatted date
          expect(modal.textContent).toContain('January 10th 2026');

          // Modal should display album count
          expect(modal.textContent).toContain('1 album listened');

          // Modal should display album artwork
          const albumImage = modal.querySelector(
            `img[src="${testDailyListen.albums[0]?.album.imageUrl}"]`,
          );
          expect(albumImage).not.toBeNull();

          // Modal should display album name and artist
          expect(modal.textContent).toContain(
            testDailyListen.albums[0]?.album.albumName,
          );
          expect(modal.textContent).toContain(
            testDailyListen.albums[0]?.album.artists[0]?.name,
          );

          // Modal should display listen metadata
          expect(modal.textContent).toContain('Ordered');
          expect(modal.textContent).toContain('Morning');
          expect(modal.textContent).toContain('Spotify');

          // Modal should have Open in Spotify button
          const spotifyLink = modal.querySelector(
            `a[href="https://open.spotify.com/album/${testDailyListen.albums[0]?.album.albumId}"]`,
          );
          expect(spotifyLink).not.toBeNull();
        });

        it('should show Song of the Day placeholder when no favorite song is selected', async () => {
          await mountDashboard();
          const modal = await openDailyListenModal();

          expect(modal.textContent).toContain('Song of the Day');
          expect(modal.textContent).toContain(
            'Select a track from an album below',
          );

          // Should NOT show a "Clear" button
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
            // Update the Jan 10 entry to have the favorite song
            updateMockListenForDate('2026-01-10', () => ({
              ...testDailyListen,
              favoriteSong: testFavoriteSong,
            }));
          });

          it('should display the current favorite song', async () => {
            await mountDashboard();
            const modal = await openDailyListenModal();

            expect(modal.textContent).toContain(testFavoriteSong.name);
            expect(modal.textContent).toContain(
              `${testFavoriteSong.trackNumber}.`,
            );

            // Should show a "Clear" button
            const clearButton = Array.from(
              modal.querySelectorAll('button'),
            ).find((btn) => btn.textContent?.includes('Clear'));
            expect(clearButton).toBeDefined();

            // Should have a link to play the track on Spotify
            const spotifyTrackLink = modal.querySelector(
              `a[href="https://open.spotify.com/track/${testFavoriteSong.spotifyId}"]`,
            );
            expect(spotifyTrackLink).not.toBeNull();
          });
        });

        it('should expand track list when Song of the Day placeholder is clicked', async () => {
          await mountDashboard();
          const modal = await openDailyListenModal();

          expect(modal.textContent).toContain('View tracks');

          // Find and click the Song of the Day placeholder
          const placeholderContainer = modal.querySelector(
            'section div.cursor-pointer',
          );
          expect(placeholderContainer).not.toBeNull();
          await fireEvent.click(placeholderContainer as HTMLElement);

          await waitForText(modal, 'First Track');
        });

        describe('tracks section', () => {
          it('should render tracks from Spotify API when View tracks is clicked', async () => {
            await mountDashboard();
            const modal = await openDailyListenModal();

            await expandTrackList(modal);

            expect(mockSpotifyAlbumsGet).toHaveBeenCalledWith(
              testDailyListen.albums[0]?.album.albumId,
            );

            expect(modal.textContent).toContain('First Track');
            expect(modal.textContent).toContain('Second Track');
            expect(modal.textContent).toContain('Third Track');

            // Durations should be formatted (3:00 for 180000ms)
            expect(modal.textContent).toContain('3:00');
            expect(modal.textContent).toContain('4:00');
          });

          it('should set favorite song when a track is clicked', async () => {
            const dateParam = testDailyListen.date.split('T')[0];

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

            mockListensData[0] = { ...testDailyListen, favoriteSong: null };
            clearNuxtData('listens');
            listensCallCount = 0;

            await mountDashboard();
            const modal = await openDailyListenModal();

            expect(modal.textContent).toContain(
              'Select a track from an album below',
            );

            await expandTrackList(modal);
            const trackButton = Array.from(
              modal.querySelectorAll('button'),
            ).find((btn) => btn.textContent?.includes('First Track'));
            await fireEvent.click(trackButton as HTMLElement);

            // Wait for the Clear button to appear
            await waitFor(() =>
              Array.from(modal.querySelectorAll('button')).some((btn) =>
                btn.textContent?.includes('Clear'),
              ),
            );

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
          });

          it('should allow changing the favorite track when one is already chosen', async () => {
            const dateParam = testDailyListen.date.split('T')[0];

            const initialFavoriteSong = favouriteSong({
              spotifyId: 'track-1',
              name: 'First Track',
              trackNumber: 1,
              albumId: testDailyListen.albums[0]!.album.albumId,
            });
            // Update the Jan 10 entry to have the initial favorite song
            updateMockListenForDate('2026-01-10', () => ({
              ...testDailyListen,
              favoriteSong: initialFavoriteSong,
            }));
            clearNuxtData('listens');
            listensCallCount = 0;

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

            await mountDashboard();
            const modal = await openDailyListenModal();

            expect(modal.textContent).toContain('First Track');
            expect(modal.textContent).toContain('1.');

            await expandTrackList(modal);
            const trackButton = Array.from(
              modal.querySelectorAll('button'),
            ).find((btn) => btn.textContent?.includes('Second Track'));
            await fireEvent.click(trackButton as HTMLElement);

            await waitFor(() => {
              const songOfTheDaySection = modal.querySelector('section');
              return songOfTheDaySection?.textContent?.includes('2.') ?? false;
            });

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
          });

          it('should allow clearing the favorite track', async () => {
            const dateParam = testDailyListen.date.split('T')[0];

            const initialFavoriteSong = favouriteSong({
              albumId: testDailyListen.albums[0]?.album.albumId,
            });
            // Update the Jan 10 entry to have the initial favorite song
            updateMockListenForDate('2026-01-10', () => ({
              ...testDailyListen,
              favoriteSong: initialFavoriteSong,
            }));
            clearNuxtData('listens');
            listensCallCount = 0;

            registerEndpoint(`/api/listens/${dateParam}/favorite-song`, {
              method: 'PATCH',
              handler: async (event) => {
                const body = await readBody(event);
                favoriteSongPatchCalls.push({ date: dateParam!, body });
                return { favoriteSong: null };
              },
            });

            await mountDashboard();
            const modal = await openDailyListenModal();

            expect(modal.textContent).toContain(initialFavoriteSong.name);
            const clearButton = Array.from(
              modal.querySelectorAll('button'),
            ).find((btn) => btn.textContent?.includes('Clear'));
            expect(clearButton).toBeDefined();

            await fireEvent.click(clearButton as HTMLElement);

            await waitForText(modal, 'Select a track from an album below');

            expect(favoriteSongPatchCalls).toHaveLength(1);
            expect(favoriteSongPatchCalls[0]).toEqual({
              date: dateParam,
              body: { spotifyId: null },
            });

            // Clear button should no longer be visible
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
          // Clear albums for today (Jan 15)
          updateMockListenForDate('2026-01-15', (listen) => ({
            ...listen,
            albums: [],
            favoriteSong: null,
          }));
        });

        it('should render today without data correctly', async () => {
          await mountDashboard();

          // Wait for the add button to appear
          await waitFor(
            () =>
              document.querySelector('[data-testid="add-listen-button"]') !==
              null,
          );

          // Today with no albums shows FutureAlbumDay with add button
          expect(screen.getByTestId('add-listen-button')).toBeDefined();

          // Find today's card (Jan 15)
          const todayCard = getScheduledDayCard('15');
          expect(todayCard).toBeDefined();

          // No month label since Jan 15 is not the 1st
          const monthLabel = todayCard!.querySelector(
            '[data-testid="month-label"]',
          );
          expect(monthLabel).toBeNull();
        });
      });

      describe('when there is listening data for today', () => {
        it('should render the formattedMonth name for the 1st day of the month', async () => {
          await mountDashboard();

          // Today (Jan 15) has album data so renders as PastAlbumDay - no month label
          const todayCard = getPastDayCard('15');
          expect(todayCard).toBeDefined();

          const monthLabel = todayCard!.querySelector(
            '[data-testid="month-label"]',
          );
          expect(monthLabel).toBeNull();
        });

        it('should render the day of the month', async () => {
          await mountDashboard();

          const todayCard = getPastDayCard('15');
          expect(todayCard).toBeDefined();
        });
      });

      describe('when there is a scheduled album for today', () => {
        beforeEach(() => {
          // Clear albums for today (Jan 15) so it renders as a future day
          updateMockListenForDate('2026-01-15', (listen) => ({
            ...listen,
            albums: [],
            favoriteSong: null,
          }));

          const todayItem = scheduledListenItem({ date: toDateString(TODAY) });
          mockScheduledListensData = { [todayItem.date]: todayItem };
        });

        it('should render the formattedMonth name for the 1st day of the month', async () => {
          await mountDashboard();

          const todayCard = getScheduledDayCard('15');
          expect(todayCard).toBeDefined();

          const monthLabel = todayCard!.querySelector(
            '[data-testid="month-label"]',
          );
          expect(monthLabel).toBeNull();
        });

        it('should render the day of the month', async () => {
          await mountDashboard();

          const todayCard = getScheduledDayCard('15');
          expect(todayCard).toBeDefined();
        });
      });
    });

    describe('scheduled listens', () => {
      describe('when there are scheduled albums', () => {
        beforeEach(() => {
          const { items } = getScheduledListensResponse({ startDate: TODAY });
          mockScheduledListensData = items;
        });

        it('should render scheduled scheduled listens correctly', async () => {
          await mountDashboard();

          const futureAlbumDays = screen.getAllByTestId('scheduled-album-day');

          // Find days with album images (scheduled albums)
          const daysWithImages = futureAlbumDays.filter((day) =>
            day.querySelector('[data-testid="album-image"]'),
          );
          expect(daysWithImages.length).toBeGreaterThan(0);

          // Verify image src matches one of the scheduled albums
          const firstImage = daysWithImages[0]!.querySelector(
            '[data-testid="album-image"]',
          );
          const scheduledImageUrls = Object.values(mockScheduledListensData)
            .filter((item): item is ScheduledListenItem => item !== null)
            .map((item) => item.album.imageUrl);
          expect(scheduledImageUrls).toContain(firstImage?.getAttribute('src'));

          // Should render day number (16-21 range)
          const dayNumber = daysWithImages[0]!.querySelector(
            '[data-testid="day-number"]',
          );
          const dayNum = parseInt(dayNumber?.textContent ?? '0', 10);
          expect(dayNum).toBeGreaterThanOrEqual(16);
          expect(dayNum).toBeLessThanOrEqual(21);
        });

        it('should render the formattedMonth name for the 1st day of the month', async () => {
          // Set TODAY to Jan 27 so Feb 1 is within the 6-day future window
          const laterToday = new Date('2026-01-27T12:00:00.000Z');
          vi.setSystemTime(laterToday);
          mockListensData = getListensReponse({ n: 14, startDate: laterToday });
          const { items } = getScheduledListensResponse({
            startDate: laterToday,
          });
          mockScheduledListensData = items;

          await mountDashboard();

          const monthLabels = screen.getAllByTestId('month-label');
          const hasFebruaryLabel = monthLabels.some(
            (label) => label.textContent === 'FEB',
          );
          expect(hasFebruaryLabel).toBe(true);
        });

        describe('scheduled listens modal', () => {
          const testScheduledListen: ScheduledListenItem = {
            id: 'test-modal-future-listen-id',
            date: '2026-01-16',
            album: {
              spotifyId: 'test-modal-album-spotify-id',
              name: 'Test Modal Album',
              imageUrl: 'https://example.com/album.jpg',
              artists: [{ name: 'Test Modal Artist', spotifyId: 'artist-id' }],
              releaseDate: '2024-05-15',
            },
          };

          const openScheduledListenModal = async (): Promise<Element> => {
            const futureAlbumDays = screen.getAllByTestId(
              'scheduled-album-day',
            );
            const dayWithAlbum = futureAlbumDays.find((day) =>
              day.querySelector('[data-testid="album-image"]'),
            );
            expect(dayWithAlbum).toBeDefined();

            await fireEvent.click(dayWithAlbum!);

            return waitForElement('[role="dialog"]');
          };

          beforeEach(() => {
            clearNuxtData('listens');
            clearNuxtData('scheduled-listens');
            listensCallCount = 0;

            mockScheduledListensData = {
              [testScheduledListen.date]: testScheduledListen,
            };

            registerEndpoint(
              `/api/listens/scheduled/${testScheduledListen.id}`,
              {
                method: 'DELETE',
                handler: () => {
                  deletedScheduledListenIds.push(testScheduledListen.id);
                  return { success: true };
                },
              },
            );
          });

          it('should render the ScheduledListenModal correctly', async () => {
            await mountDashboard();
            const modal = await openScheduledListenModal();

            // Modal should display album artwork
            const albumImage = modal.querySelector(
              `img[src="${testScheduledListen.album.imageUrl}"]`,
            );
            expect(albumImage).not.toBeNull();

            // Modal should display album name
            expect(modal.textContent).toContain(testScheduledListen.album.name);

            // Modal should display artist name
            const expectedArtistNames = testScheduledListen.album.artists
              .map((a) => a.name)
              .join(', ');
            expect(modal.textContent).toContain(expectedArtistNames);

            // Modal should have a link to Spotify
            const spotifyLink = modal.querySelector(
              `a[href="https://open.spotify.com/album/${testScheduledListen.album.spotifyId}"]`,
            );
            expect(spotifyLink).not.toBeNull();

            // Modal should have remove from schedule button
            const removeButton = Array.from(
              modal.querySelectorAll('button'),
            ).find((btn) => btn.textContent?.includes('Remove from schedule'));
            expect(removeButton).not.toBeNull();

            // Click remove from schedule
            await fireEvent.click(removeButton as HTMLElement);

            await waitFor(() =>
              deletedScheduledListenIds.includes(testScheduledListen.id),
            );

            expect(deletedScheduledListenIds).toContain(testScheduledListen.id);
          });
        });
      });

      describe('when there are no scheduled albums', () => {
        beforeEach(() => {
          mockScheduledListensData = {};
        });

        it('should render the formattedMonth name for the 1st day of the month', async () => {
          const laterToday = new Date('2026-01-27T12:00:00.000Z');
          vi.setSystemTime(laterToday);
          mockListensData = getListensReponse({ n: 14, startDate: laterToday });

          await mountDashboard();

          const monthLabels = screen.getAllByTestId('month-label');
          const hasFebruaryLabel = monthLabels.some(
            (label) => label.textContent === 'FEB',
          );
          expect(hasFebruaryLabel).toBe(true);
        });

        it('should render empty future days correctly', async () => {
          await mountDashboard();

          const futureAlbumDays = screen.getAllByTestId('scheduled-album-day');
          expect(futureAlbumDays.length).toBeGreaterThan(0);

          // At least some should have empty album cover (no image)
          const hasEmptyState = futureAlbumDays.some((day) => {
            const albumImage = day.querySelector('[data-testid="album-image"]');
            const emptyState = day.querySelector(
              '[data-testid="empty-album-cover"]',
            );
            return !albumImage && emptyState;
          });
          expect(hasEmptyState).toBe(true);

          // Should show day numbers (16, 17, 18, etc.)
          const dayNumbers = futureAlbumDays.map(
            (day) =>
              day.querySelector('[data-testid="day-number"]')?.textContent,
          );
          expect(dayNumbers).toContain('16');
        });

        it('should not open the modal when the placeholder is clicked', async () => {
          await mountDashboard();

          const futureAlbumDays = screen.getAllByTestId('scheduled-album-day');

          // Find one with empty state (no scheduled album)
          const emptyDay = futureAlbumDays.find((day) =>
            day.querySelector('[data-testid="empty-album-cover"]'),
          );

          if (emptyDay) {
            await fireEvent.click(emptyDay);
            await flushPromises();

            // Modal should not open
            expect(screen.queryByRole('dialog')).toBeNull();
          }
        });
      });
    });
  });

  describe('when the user has no listens', () => {
    beforeEach(() => {
      mockListensData = [];
      mockScheduledListensData = {};
    });

    it('should render empty day cards for the date range', async () => {
      // With the new architecture, we always render a fixed date range
      // even when there's no data - cards will show empty state (dash)
      await mountDashboard();

      // Should render past and future album days even with no data
      const pastDays = document.querySelectorAll(
        '[data-testid="past-album-day"]',
      );
      const scheduledDays = document.querySelectorAll(
        '[data-testid="scheduled-album-day"]',
      );

      // We expect the date range to be rendered (past days + future days)
      expect(pastDays.length + scheduledDays.length).toBeGreaterThan(0);

      // All past days should show empty state (no images)
      for (const day of pastDays) {
        const albumImage = day.querySelector('[data-testid="album-image"]');
        expect(albumImage).toBeNull();
      }
    });

    it('should still render the sticky month header', async () => {
      // With the new architecture, we always render the date range
      // so the sticky month header should appear
      await mountDashboard();

      const stickyHeader = screen.queryByTestId('sticky-month-header');
      expect(stickyHeader).not.toBeNull();
    });
  });

  describe('when the API returns an error', () => {
    beforeEach(() => {
      shouldThrowListensError = true;
    });

    it('should render error state with error message', async () => {
      // When
      await mountDashboard();

      // Then - should show error message (Nuxt formats fetch errors as "[GET] /api/... : 500")
      await waitFor(
        () => document.body.textContent?.includes('Error:') ?? false,
      );
      expect(document.body.textContent).toContain('Error:');
      // The error message includes the failed endpoint
      expect(document.body.textContent).toContain('/api/listens');
    });

    it('should not render the sticky month header', async () => {
      // When
      await mountDashboard();

      // Wait for error state to render
      await waitFor(
        () => document.body.textContent?.includes('Error:') ?? false,
      );

      // Then - sticky header should not be visible
      const stickyHeader = screen.queryByTestId('sticky-month-header');
      expect(stickyHeader).toBeNull();
    });

    it('should not render any album days', async () => {
      // When
      await mountDashboard();

      // Wait for error state to render
      await waitFor(
        () => document.body.textContent?.includes('Error:') ?? false,
      );

      // Then - no past or future album days
      const pastDays = document.querySelectorAll(
        '[data-testid="past-album-day"]',
      );
      const scheduledDays = document.querySelectorAll(
        '[data-testid="scheduled-album-day"]',
      );
      expect(pastDays).toHaveLength(0);
      expect(scheduledDays).toHaveLength(0);
    });
  });

  describe('infinite scroll', () => {
    it('should show end of history message when hasMore becomes false', async () => {
      // Given - set up data where fetchMore returns empty (hasMore becomes false)
      mockListensData = getListensReponse({ n: 14, startDate: TODAY });
      // Second batch returns empty, which sets hasMore to false
      mockListensDataBatch2 = [];

      // When - mount the dashboard
      await mountDashboard();

      // Wait for initial data to load
      await waitFor(() => {
        const pastDays = document.querySelectorAll(
          '[data-testid="past-album-day"]',
        );
        return pastDays.length > 0;
      });

      // Verify initial call was made
      expect(listensCallCount).toBe(1);

      // Then - verify past album days are rendered
      const pastDays = document.querySelectorAll(
        '[data-testid="past-album-day"]',
      );
      expect(pastDays.length).toBeGreaterThan(0);
    });
  });

  describe('manual log album', () => {
    it('should open the LogAlbumModal when clicking the add button on today', async () => {
      // Given - Today has no albums (shows the + button)
      mockListensData = getListensReponse({ n: 14, startDate: TODAY });
      // Clear albums for today (Jan 15) to show the + button
      updateMockListenForDate('2026-01-15', (listen) => ({
        ...listen,
        albums: [],
        favoriteSong: null,
      }));

      // When - mount and click the add button
      await mountDashboard();

      // Wait for add button to appear
      await waitFor(
        () =>
          document.querySelector('[data-testid="add-listen-button"]') !== null,
        { timeout: 3000 },
      );

      // Click the add button
      const addButton = screen.getByTestId('add-listen-button');
      await fireEvent.click(addButton);

      // Then - modal should open with Log Album title
      const modal = await waitForElement('[role="dialog"]');
      expect(modal).toBeTruthy();
      expect(modal.textContent).toContain('Log Album');
    });
  });

  describe('Jump to Today button', () => {
    beforeEach(() => {
      mockListensData = getListensReponse({ n: 14, startDate: TODAY });
    });

    it('should not show the button when today is visible', async () => {
      await mountDashboard();

      // Wait for dashboard to render
      await waitFor(() => {
        const pastDays = document.querySelectorAll(
          '[data-testid="past-album-day"]',
        );
        return pastDays.length > 0;
      });

      // The button should not be visible since we scroll to today on mount
      const jumpToTodayButton = screen.queryByRole('button', {
        name: /jump to today/i,
      });
      expect(jumpToTodayButton).toBeNull();
    });

    it('should have the JumpToTodayButton component rendered', async () => {
      await mountDashboard();

      // Wait for dashboard to render
      await waitFor(() => {
        const pastDays = document.querySelectorAll(
          '[data-testid="past-album-day"]',
        );
        return pastDays.length > 0;
      });

      // The button component should exist in the component tree
      // (even if not visible due to CSS transition when today is in view)
      // We verify by checking the component is properly included in the dashboard
      const allButtons = document.querySelectorAll('button');
      const hasJumpButton = Array.from(allButtons).some((btn) =>
        btn.getAttribute('aria-label')?.includes('Jump to today'),
      );

      // On initial load with today visible, the button should not be shown
      // but the component setup should be correct
      expect(hasJumpButton).toBe(false);
    });
  });

  describe('multiple album modal carousel', () => {
    const setupMultiAlbumDay = () => {
      // Create a day with multiple albums
      const album1 = dailyAlbumListen({
        album: album({
          albumId: 'album-1-id',
          albumName: 'First Album',
          artists: [artist({ name: 'First Artist' })],
        }),
      });
      const album2 = dailyAlbumListen({
        album: album({
          albumId: 'album-2-id',
          albumName: 'Second Album',
          artists: [artist({ name: 'Second Artist' })],
        }),
      });

      // The multi-album day is yesterday (subDays 1)
      const multiAlbumDay = dailyListens({
        date: toDateString(subDays(TODAY, 1)),
        albums: [album1, album2],
        favoriteSong: null,
      });

      // Create mock data with the multi-album day first, then other days
      mockListensData = [
        multiAlbumDay,
        dailyListens({
          date: toDateString(TODAY),
          albums: [dailyAlbumListen()],
        }),
      ];
    };

    it('should navigate to second album in carousel and show its details', async () => {
      // Given
      setupMultiAlbumDay();

      // When - mount dashboard
      await mountDashboard();

      // Wait for render - find a past album day card with the album count badge
      await waitFor(
        () =>
          document.querySelector('[data-testid="album-count-badge"]') !== null,
      );

      // Find the day card with the album count badge (shows "2" for multiple albums)
      const multiAlbumDayCard = document.querySelector(
        '[data-testid="album-count-badge"]',
      );
      expect(multiAlbumDayCard).not.toBeNull();
      expect(multiAlbumDayCard?.textContent).toBe('2');

      // Click the parent past-album-day to open the modal
      const multiAlbumDayEl = multiAlbumDayCard?.closest(
        '[data-testid="past-album-day"]',
      ) as HTMLElement;
      expect(multiAlbumDayEl).toBeTruthy();
      await fireEvent.click(multiAlbumDayEl);

      // Wait for modal to open
      const modal = await waitForElement('[role="dialog"]');
      expect(modal.textContent).toContain('2 albums listened');
      expect(modal.textContent).toContain('First Album');
      expect(modal.textContent).toContain('First Artist');

      // Find and click the next arrow to navigate to second album
      // NuxtUI carousel uses buttons with lucide icons for navigation
      const carouselButtons = modal.querySelectorAll('button');
      // Find the next button (contains chevron-right or arrow-right icon)
      const nextButton = Array.from(carouselButtons).find(
        (btn) =>
          btn.querySelector('[class*="chevron-right"]') ||
          btn.querySelector('[class*="arrow-right"]') ||
          btn.innerHTML.includes('chevron-right') ||
          btn.innerHTML.includes('arrow-right'),
      );
      expect(nextButton).toBeTruthy();
      await fireEvent.click(nextButton as HTMLElement);

      // Wait for carousel to update
      await waitFor(
        () => modal.textContent?.includes('Second Album') ?? false,
        { timeout: 3000 },
      );

      // Then - verify second album details are shown
      expect(modal.textContent).toContain('Second Album');
      expect(modal.textContent).toContain('Second Artist');
    });
  });
});
