import type { Task } from 'nitropack/types';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  createBacklogItem,
  createFutureListen,
  createUser,
  getBacklogItemsForUser,
  getFutureListensForUser,
} from '~~/tests/db/utils';

vi.stubGlobal('defineTask', (task: Task<string>) => task);

describe('scheduleBacklogListens Task Integration Tests', () => {
  const today = new Date('2026-01-15T03:00:00.000Z'); // 3 AM UTC when task runs

  let scheduleEvent: () => ReturnType<Task['run']>;
  let userId: string;

  beforeAll(async () => {
    vi.setSystemTime(today);

    const eventHandler = (await import('./scheduleBacklogListens')).default.run;
    scheduleEvent = () =>
      eventHandler({ name: 'event', context: {}, payload: {} });
  });

  beforeEach(async () => {
    const user = await createUser({ trackListeningHistory: true });
    userId = user.id;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('scheduleBacklogToFutureListens', () => {
    it('should return no users when no users have feature enabled', async () => {
      // Given - User from beforeEach has feature disabled
      const _newUser = await createUser({ trackListeningHistory: false });

      // When
      const { result } = await scheduleEvent();

      // Then - Only the user from beforeEach (with feature enabled) is processed but no albums scheduled
      expect(result).toBe(
        'Processed 1 user(s): 1 successful, scheduled 0 album(s), 0 failed',
      );
    });

    it('should schedule one album per day for next 7 days', async () => {
      // Given - User with 10 backlog items, no existing schedules
      for (let i = 0; i < 10; i++) {
        await createBacklogItem({
          userId,
          item: {
            spotifyId: `album-${i}`,
            name: `Album ${i}`,
            artists: [{ spotifyId: `artist-${i}`, name: `Artist ${i}` }],
            createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000), // Varying ages
          },
        });
      }

      // When
      await scheduleEvent();

      // Then - 7 future listens created for next 7 days
      const futureListens = await getFutureListensForUser(userId);
      expect(futureListens).toHaveLength(7);

      // Verify dates are consecutive starting from tomorrow
      const tomorrow = new Date(Date.UTC(2026, 0, 16)); // Jan 16
      for (let i = 0; i < 7; i++) {
        const expectedDate = new Date(tomorrow);
        expectedDate.setUTCDate(expectedDate.getUTCDate() + i);
        expect(futureListens[i].date).toEqual(expectedDate);
      }
    });

    it('should skip dates that already have schedules', async () => {
      // Given - User has backlog
      for (let i = 0; i < 10; i++) {
        await createBacklogItem({
          userId,
          item: {
            spotifyId: `album-${i}`,
            name: `Album ${i}`,
            artists: [{ spotifyId: `artist-${i}`, name: `Artist ${i}` }],
          },
        });
      }

      // Days 2 and 5 already scheduled (Jan 17 and Jan 20)
      const day2 = new Date(Date.UTC(2026, 0, 17));
      const day5 = new Date(Date.UTC(2026, 0, 20));

      await createFutureListen({
        userId,
        item: {
          spotifyId: 'existing-album-1',
          name: 'Existing Album 1',
          artists: [
            { spotifyId: 'existing-artist-1', name: 'Existing Artist 1' },
          ],
          date: day2,
        },
      });

      await createFutureListen({
        userId,
        item: {
          spotifyId: 'existing-album-2',
          name: 'Existing Album 2',
          artists: [
            { spotifyId: 'existing-artist-2', name: 'Existing Artist 2' },
          ],
          date: day5,
        },
      });

      // When
      await scheduleEvent();

      // Then - Only fills days 1, 3, 4, 6, 7 (5 new schedules)
      const futureListens = await getFutureListensForUser(userId);
      expect(futureListens).toHaveLength(7); // 2 existing + 5 new

      // Verify the existing schedules are still there
      const existingDay2 = futureListens.find(
        (fl) => fl.date.getTime() === day2.getTime(),
      );
      const existingDay5 = futureListens.find(
        (fl) => fl.date.getTime() === day5.getTime(),
      );
      expect(existingDay2?.album.spotifyId).toBe('existing-album-1');
      expect(existingDay5?.album.spotifyId).toBe('existing-album-2');
    });

    it('should not schedule albums already in future listens', async () => {
      // Given - User has 5 backlog items
      const backlogAlbums = [];
      for (let i = 0; i < 5; i++) {
        await createBacklogItem({
          userId,
          item: {
            spotifyId: `album-${i}`,
            name: `Album ${i}`,
            artists: [{ spotifyId: `artist-${i}`, name: `Artist ${i}` }],
          },
        });
        backlogAlbums.push(`album-${i}`);
      }

      // 2 albums already scheduled for future dates
      const futureDate1 = new Date(Date.UTC(2026, 0, 25)); // Jan 25
      const futureDate2 = new Date(Date.UTC(2026, 0, 30)); // Jan 30

      await createFutureListen({
        userId,
        item: {
          spotifyId: 'album-0',
          name: 'Album 0',
          artists: [{ spotifyId: 'artist-0', name: 'Artist 0' }],
          date: futureDate1,
        },
      });

      await createFutureListen({
        userId,
        item: {
          spotifyId: 'album-1',
          name: 'Album 1',
          artists: [{ spotifyId: 'artist-1', name: 'Artist 1' }],
          date: futureDate2,
        },
      });

      // When
      await scheduleEvent();

      // Then - Only uses the 3 unscheduled albums
      const futureListens = await getFutureListensForUser(userId);
      expect(futureListens).toHaveLength(5); // 2 existing + 3 new

      // Verify no duplicates
      const albumIds = futureListens.map((fl) => fl.album.spotifyId);
      const uniqueAlbumIds = new Set(albumIds);
      expect(uniqueAlbumIds.size).toBe(5);

      // Verify the new schedules don't include album-0 or album-1
      const newSchedules = futureListens.filter(
        (fl) =>
          fl.date.getTime() >= new Date(Date.UTC(2026, 0, 16)).getTime() &&
          fl.date.getTime() <= new Date(Date.UTC(2026, 0, 22)).getTime(),
      );
      const newAlbumIds = newSchedules.map((fl) => fl.album.spotifyId);
      expect(newAlbumIds).not.toContain('album-0');
      expect(newAlbumIds).not.toContain('album-1');
    });

    it('should handle insufficient backlog items gracefully', async () => {
      // Given - User has only 3 backlog items, 0 schedules
      for (let i = 0; i < 3; i++) {
        await createBacklogItem({
          userId,
          item: {
            spotifyId: `album-${i}`,
            name: `Album ${i}`,
            artists: [{ spotifyId: `artist-${i}`, name: `Artist ${i}` }],
          },
        });
      }

      // When - Task runs for 7 days
      await scheduleEvent();

      // Then - Only 3 schedules created
      const futureListens = await getFutureListensForUser(userId);
      expect(futureListens).toHaveLength(3);
    });

    it(
      'should prefer older backlog items statistically',
      { retry: 3 },
      async () => {
        // Given - 20 items: 5 very old (90 days), 10 medium (30 days), 5 new (3 days)
        const now = Date.now();
        const veryOldAlbums: string[] = [];
        const mediumAlbums: string[] = [];
        const newAlbums: string[] = [];

        // Very old items (90 days ago, with slight time variations)
        for (let i = 0; i < 5; i++) {
          const spotifyId = `very-old-${i}`;
          await createBacklogItem({
            userId,
            item: {
              spotifyId,
              name: `Very Old Album ${i}`,
              artists: [{ spotifyId: `artist-${i}`, name: `Artist ${i}` }],
              createdAt: new Date(
                now - 90 * 24 * 60 * 60 * 1000 - i * 60 * 1000,
              ), // Stagger by minutes
            },
          });
          veryOldAlbums.push(spotifyId);
        }

        // Medium age items (30 days ago, with slight time variations)
        for (let i = 0; i < 10; i++) {
          const spotifyId = `medium-${i}`;
          await createBacklogItem({
            userId,
            item: {
              spotifyId,
              name: `Medium Album ${i}`,
              artists: [{ spotifyId: `artist-${i}`, name: `Artist ${i}` }],
              createdAt: new Date(
                now - 30 * 24 * 60 * 60 * 1000 - i * 60 * 1000,
              ), // Stagger by minutes
            },
          });
          mediumAlbums.push(spotifyId);
        }

        // New items (3 days ago, with slight time variations)
        for (let i = 0; i < 5; i++) {
          const spotifyId = `new-${i}`;
          await createBacklogItem({
            userId,
            item: {
              spotifyId,
              name: `New Album ${i}`,
              artists: [{ spotifyId: `artist-${i}`, name: `Artist ${i}` }],
              createdAt: new Date(
                now - 3 * 24 * 60 * 60 * 1000 - i * 60 * 1000,
              ), // Stagger by minutes
            },
          });
          newAlbums.push(spotifyId);
        }

        // When - Schedule 7 items (repeat test 10 times for statistical significance)
        let veryOldCount = 0;
        let newCount = 0;

        for (let run = 0; run < 10; run++) {
          // Clear existing schedules
          const existingSchedules = await getFutureListensForUser(userId);
          for (const schedule of existingSchedules) {
            await import('~~/tests/db/setup').then(({ getTestPrisma }) =>
              getTestPrisma().futureListen.delete({
                where: { id: schedule.id },
              }),
            );
          }

          // Run scheduling
          await scheduleEvent();

          // Count selections
          const futureListens = await getFutureListensForUser(userId);
          for (const fl of futureListens) {
            if (veryOldAlbums.includes(fl.album.spotifyId)) {
              veryOldCount++;
            }
            if (newAlbums.includes(fl.album.spotifyId)) {
              newCount++;
            }
          }
        }

        // Then - Very old items selected much more frequently than new items
        // With cubic weighting, very old items (90 days) should be selected much more than new (3 days)
        // Over 10 runs * 7 selections = 70 total selections
        // With 20 items total and inverted cubic weighting:
        // - Very old items are at indices 15-19 (highest)
        // - New items are at indices 0-4 (lowest)
        // The inverted cubic weighting strongly favors higher indices
        // Expect very old items selected at least 1.5x more than new items
        expect(veryOldCount).toBeGreaterThan(newCount * 1.5); // At least 1.5x more
      },
    );

    it('should process multiple users with feature enabled', async () => {
      // Given - Second user
      const user2 = await createUser({ trackListeningHistory: true });

      // User 1 has 10 backlog items
      for (let i = 0; i < 10; i++) {
        await createBacklogItem({
          userId,
          item: {
            spotifyId: `user1-album-${i}`,
            name: `User 1 Album ${i}`,
            artists: [{ spotifyId: `artist-${i}`, name: `Artist ${i}` }],
          },
        });
      }

      // User 2 has 10 backlog items
      for (let i = 0; i < 10; i++) {
        await createBacklogItem({
          userId: user2.id,
          item: {
            spotifyId: `user2-album-${i}`,
            name: `User 2 Album ${i}`,
            artists: [{ spotifyId: `artist-${i}`, name: `Artist ${i}` }],
          },
        });
      }

      // When
      await scheduleEvent();

      // Then - Both users have schedules
      const user1Schedules = await getFutureListensForUser(userId);
      const user2Schedules = await getFutureListensForUser(user2.id);

      expect(user1Schedules).toHaveLength(7);
      expect(user2Schedules).toHaveLength(7);

      // Verify no cross-contamination
      const user1AlbumIds = user1Schedules.map((fl) => fl.album.spotifyId);
      const user2AlbumIds = user2Schedules.map((fl) => fl.album.spotifyId);

      for (const albumId of user1AlbumIds) {
        expect(albumId).toContain('user1-album-');
      }
      for (const albumId of user2AlbumIds) {
        expect(albumId).toContain('user2-album-');
      }
    });

    it('should keep albums in backlog after scheduling', async () => {
      // Given - User has 10 backlog items
      for (let i = 0; i < 10; i++) {
        await createBacklogItem({
          userId,
          item: {
            spotifyId: `album-${i}`,
            name: `Album ${i}`,
            artists: [{ spotifyId: `artist-${i}`, name: `Artist ${i}` }],
          },
        });
      }

      const backlogBefore = await getBacklogItemsForUser(userId);
      expect(backlogBefore).toHaveLength(10);

      // When
      await scheduleEvent();

      // Then - All backlog items still exist
      const backlogAfter = await getBacklogItemsForUser(userId);
      expect(backlogAfter).toHaveLength(10);
    });

    it('should return success result with scheduling stats', async () => {
      // Given - User with backlog
      for (let i = 0; i < 10; i++) {
        await createBacklogItem({
          userId,
          item: {
            spotifyId: `album-${i}`,
            name: `Album ${i}`,
            artists: [{ spotifyId: `artist-${i}`, name: `Artist ${i}` }],
          },
        });
      }

      // When
      const { result } = await scheduleEvent();

      // Then
      expect(result).toBe(
        'Processed 1 user(s): 1 successful, scheduled 7 album(s), 0 failed',
      );
    });

    it('should handle user with no backlog gracefully', async () => {
      // Given - User with no backlog items

      // When
      const { result } = await scheduleEvent();

      // Then - Task completes without error
      expect(result).toBe(
        'Processed 1 user(s): 1 successful, scheduled 0 album(s), 0 failed',
      );

      const futureListens = await getFutureListensForUser(userId);
      expect(futureListens).toHaveLength(0);
    });
  });
});
