/** biome-ignore-all lint/style/noNonNullAssertion: ignore potential nulls for test code */
import { mockNuxtImport, registerEndpoint } from '@nuxt/test-utils/runtime';
import { flushPromises } from '@vue/test-utils';
import { getDate } from 'date-fns';
import { readBody } from 'h3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, ref } from 'vue';
import type { DailyListens, FutureListenItem } from '~~/shared/schema';
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
// Returns data on first call, empty on subsequent calls (simulates no more history)
registerEndpoint('/api/listens', () => {
  listensCallCount++;
  if (shouldThrowListensError) {
    throw new Error('Failed to fetch listens');
  }
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
    shouldThrowListensError = false;
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
      await mountDashboard();

      const stickyHeader = screen.getByTestId('sticky-month-header');
      expect(stickyHeader.textContent).toBe('January 2026');
    });

    describe('past listens', () => {
      it('should render past listens correctly', async () => {
        await mountDashboard();

        const pastAlbumDays = screen.getAllByTestId('past-album-day');
        expect(pastAlbumDays).toHaveLength(mockListensData.length);

        // Verify each day shows correct date and image
        for (let i = 0; i < mockListensData.length; i++) {
          const dayNumber = pastAlbumDays[i]!.querySelector(
            '[data-testid="day-number"]',
          );
          const expectedDay = getDate(new Date(mockListensData[i]!.date));
          expect(dayNumber?.textContent).toEqual(String(expectedDay));

          const albumImage = pastAlbumDays[i]!.querySelector(
            '[data-testid="album-image"]',
          );
          const expectedImageUrl =
            mockListensData[i]?.albums[0]?.album.imageUrl;
          expect(albumImage?.getAttribute('src')).toEqual(expectedImageUrl);
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
        mockListensData[0]!.date = new Date(
          '2026-01-01T12:00:00.000Z',
        ).toISOString();

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
          mockListensData[0]!.date = new Date(
            '2026-01-01T12:00:00.000Z',
          ).toISOString();

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

          const pastAlbumDays = screen.getAllByTestId('past-album-day');
          const dayWithMultiple = pastAlbumDays[0]!;
          const albumImages = dayWithMultiple.querySelectorAll(
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

          // Should show album count badge
          const countBadge = dayWithMultiple.querySelector(
            '[data-testid="album-count-badge"]',
          );
          expect(countBadge).not.toBeNull();
          expect(countBadge?.textContent).toBe('3');
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
         */
        const openDailyListenModal = async (): Promise<Element> => {
          const pastAlbumDays = screen.getAllByTestId('past-album-day');
          const dayWithAlbum = pastAlbumDays.find((day) =>
            day.querySelector('[data-testid="album-image"]'),
          );
          expect(dayWithAlbum).toBeDefined();

          await fireEvent.click(dayWithAlbum!);

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
          // Override first listen with our fixed test data
          mockListensData[0] = testDailyListen;
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
            mockListensData[0] = {
              ...testDailyListen,
              favoriteSong: testFavoriteSong,
            };
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
            mockListensData[0] = {
              ...testDailyListen,
              favoriteSong: initialFavoriteSong,
            };
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
            mockListensData[0] = {
              ...testDailyListen,
              favoriteSong: initialFavoriteSong,
            };
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
          const todayIndex = mockListensData.length - 1;
          mockListensData[todayIndex]!.albums = [];
          mockListensData[todayIndex]!.favoriteSong = null;
        });

        it('should render today without data correctly', async () => {
          await mountDashboard();

          // Today with no albums shows FutureAlbumDay with add button
          expect(screen.getByTestId('add-listen-button')).toBeDefined();

          const futureAlbumDays = screen.getAllByTestId('future-album-day');
          const todayCard = futureAlbumDays[0]!;

          // No month label since Jan 15 is not the 1st
          const monthLabel = todayCard.querySelector(
            '[data-testid="month-label"]',
          );
          expect(monthLabel).toBeNull();

          // Should show day number 15
          const dayNumber = todayCard.querySelector(
            '[data-testid="day-number"]',
          );
          expect(dayNumber?.textContent).toBe('15');
        });
      });

      describe('when there is listening data for today', () => {
        it('should render the formattedMonth name for the 1st day of the month', async () => {
          await mountDashboard();

          // Today (Jan 15) has album data so renders as PastAlbumDay - no month label
          const pastAlbumDays = screen.getAllByTestId('past-album-day');
          const todayCard = pastAlbumDays[pastAlbumDays.length - 1]!;
          const monthLabel = todayCard.querySelector(
            '[data-testid="month-label"]',
          );
          expect(monthLabel).toBeNull();
        });

        it('should render the day of the month', async () => {
          await mountDashboard();

          const pastAlbumDays = screen.getAllByTestId('past-album-day');
          const todayCard = pastAlbumDays[pastAlbumDays.length - 1]!;
          const dayNumber = todayCard.querySelector(
            '[data-testid="day-number"]',
          );

          expect(dayNumber?.textContent).toBe('15');
        });
      });

      describe('when there is a scheduled album for today', () => {
        beforeEach(() => {
          const todayIndex = mockListensData.length - 1;
          mockListensData[todayIndex]!.albums = [];
          mockListensData[todayIndex]!.favoriteSong = null;

          mockFutureListensData = [
            futureListenItem({ date: TODAY.toISOString() }),
          ];
        });

        it('should render the formattedMonth name for the 1st day of the month', async () => {
          await mountDashboard();

          const futureAlbumDays = screen.getAllByTestId('future-album-day');
          const todayCard = futureAlbumDays[0]!;
          const monthLabel = todayCard.querySelector(
            '[data-testid="month-label"]',
          );
          expect(monthLabel).toBeNull();
        });

        it('should render the day of the month', async () => {
          await mountDashboard();

          const futureAlbumDays = screen.getAllByTestId('future-album-day');
          const todayCard = futureAlbumDays[0]!;
          const dayNumber = todayCard.querySelector(
            '[data-testid="day-number"]',
          );

          expect(dayNumber?.textContent).toBe('15');
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
          await mountDashboard();

          const futureAlbumDays = screen.getAllByTestId('future-album-day');

          // Find days with album images (scheduled albums)
          const daysWithImages = futureAlbumDays.filter((day) =>
            day.querySelector('[data-testid="album-image"]'),
          );
          expect(daysWithImages.length).toBeGreaterThan(0);

          // Verify image src matches one of the scheduled albums
          const firstImage = daysWithImages[0]!.querySelector(
            '[data-testid="album-image"]',
          );
          const scheduledImageUrls = mockFutureListensData.map(
            (item) => item.album.imageUrl,
          );
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
          const { items } = getFutureListensResponse({ startDate: laterToday });
          mockFutureListensData = items;

          await mountDashboard();

          const monthLabels = screen.getAllByTestId('month-label');
          const hasFebruaryLabel = monthLabels.some(
            (label) => label.textContent === 'FEB',
          );
          expect(hasFebruaryLabel).toBe(true);
        });

        describe('future listens modal', () => {
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

          const openFutureListenModal = async (): Promise<Element> => {
            const futureAlbumDays = screen.getAllByTestId('future-album-day');
            const dayWithAlbum = futureAlbumDays.find((day) =>
              day.querySelector('[data-testid="album-image"]'),
            );
            expect(dayWithAlbum).toBeDefined();

            await fireEvent.click(dayWithAlbum!);

            return waitForElement('[role="dialog"]');
          };

          beforeEach(() => {
            clearNuxtData('listens');
            clearNuxtData('future-listens');
            listensCallCount = 0;

            mockFutureListensData = [testFutureListen];

            registerEndpoint(`/api/future-listens/${testFutureListen.id}`, {
              method: 'DELETE',
              handler: () => {
                deletedFutureListenIds.push(testFutureListen.id);
                return { success: true };
              },
            });
          });

          it('should render the FutureListensModal correctly', async () => {
            await mountDashboard();
            const modal = await openFutureListenModal();

            // Modal should display album artwork
            const albumImage = modal.querySelector(
              `img[src="${testFutureListen.album.imageUrl}"]`,
            );
            expect(albumImage).not.toBeNull();

            // Modal should display album name
            expect(modal.textContent).toContain(testFutureListen.album.name);

            // Modal should display artist name
            const expectedArtistNames = testFutureListen.album.artists
              .map((a) => a.name)
              .join(', ');
            expect(modal.textContent).toContain(expectedArtistNames);

            // Modal should have a link to Spotify
            const spotifyLink = modal.querySelector(
              `a[href="https://open.spotify.com/album/${testFutureListen.album.spotifyId}"]`,
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
              deletedFutureListenIds.includes(testFutureListen.id),
            );

            expect(deletedFutureListenIds).toContain(testFutureListen.id);
          });
        });
      });

      describe('when there are no scheduled albums', () => {
        beforeEach(() => {
          mockFutureListensData = [];
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

          const futureAlbumDays = screen.getAllByTestId('future-album-day');
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

          const futureAlbumDays = screen.getAllByTestId('future-album-day');

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
      mockFutureListensData = [];
    });

    it('should render empty state message', async () => {
      // When
      const wrapper = await mountDashboard();

      // Then - should show empty state message
      const emptyMessage = wrapper.find('.text-center.py-12');
      expect(emptyMessage.exists()).toBe(true);
      expect(emptyMessage.text()).toBe('No listens yet for this month');
    });

    it('should not render the sticky month header', async () => {
      // When
      const wrapper = await mountDashboard();

      // Then - sticky header should not be visible
      const stickyHeader = wrapper.find('[data-testid="sticky-month-header"]');
      expect(stickyHeader.exists()).toBe(false);
    });

    it('should not render any album days', async () => {
      // When
      const wrapper = await mountDashboard();

      // Then - no past or future album days
      const pastDays = wrapper.findAll('[data-testid="past-album-day"]');
      const futureDays = wrapper.findAll('[data-testid="future-album-day"]');
      expect(pastDays).toHaveLength(0);
      expect(futureDays).toHaveLength(0);
    });
  });

  describe('when the API returns an error', () => {
    beforeEach(() => {
      shouldThrowListensError = true;
    });

    it('should render error state with error message', async () => {
      // When
      const wrapper = await mountDashboard();

      // Then - should show error message (Nuxt formats fetch errors as "[GET] /api/... : 500")
      await waitFor(() => wrapper.text().includes('Error:'));
      expect(wrapper.text()).toContain('Error:');
      // The error message includes the failed endpoint
      expect(wrapper.text()).toContain('/api/listens');
    });

    it('should not render the sticky month header', async () => {
      // When
      const wrapper = await mountDashboard();

      // Wait for error state to render
      await waitFor(() => wrapper.text().includes('Error:'));

      // Then - sticky header should not be visible
      const stickyHeader = wrapper.find('[data-testid="sticky-month-header"]');
      expect(stickyHeader.exists()).toBe(false);
    });

    it('should not render any album days', async () => {
      // When
      const wrapper = await mountDashboard();

      // Wait for error state to render
      await waitFor(() => wrapper.text().includes('Error:'));

      // Then - no past or future album days
      const pastDays = wrapper.findAll('[data-testid="past-album-day"]');
      const futureDays = wrapper.findAll('[data-testid="future-album-day"]');
      expect(pastDays).toHaveLength(0);
      expect(futureDays).toHaveLength(0);
    });
  });

  describe('infinite scroll', () => {
    beforeEach(() => {
      mockListensData = getListensReponse({ n: 14, startDate: TODAY });
    });

    it('should show "You\'ve reached the beginning" message when no more history', async () => {
      // When - mount and trigger a scroll to load more (which returns empty)
      const wrapper = await mountDashboard();

      // Wait for the initial render and for hasMore to become false
      // The endpoint returns empty array on subsequent calls, triggering hasMore = false
      await waitFor(
        () =>
          wrapper
            .text()
            .includes("You've reached the beginning of your listening history"),
        { timeout: 3000 },
      );

      // Then - should show end of history message
      expect(
        wrapper
          .text()
          .includes("You've reached the beginning of your listening history"),
      ).toBe(true);
    });
  });
});
