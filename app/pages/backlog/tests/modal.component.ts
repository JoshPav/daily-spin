/**
 * Component tests for the backlog page - Album Modal interactions.
 * Tests modal functionality including remove from backlog, scheduling, and removing schedules.
 * These tests use the albums view but the modal behavior is the same regardless of view mode.
 */
import { registerEndpoint } from '@nuxt/test-utils/runtime';
import { readBody } from 'h3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BacklogAlbum } from '~~/shared/schema';
import {
  cleanupAfterTest,
  fireEvent,
  screen,
  waitFor,
} from '~~/tests/component';
import {
  artist,
  backlogAlbum,
  scheduledListenItem,
} from '~~/tests/factories/api.factory';
import {
  addDeletedBacklogId,
  deletedBacklogIds,
  mountBacklog,
  resetMockState,
  setMockBacklogData,
  setMockScheduledListensData,
  switchToAlbumsView,
} from './setup';

describe('Album Modal Actions', () => {
  const TODAY = new Date('2026-01-15T12:00:00.000Z');

  const testAlbum: BacklogAlbum = backlogAlbum({
    id: 'test-album-id',
    spotifyId: 'spotify-test',
    name: 'Test Album',
    imageUrl: 'https://example.com/test.jpg',
    artists: [artist({ name: 'Test Artist', spotifyId: 'artist-test' })],
    addedAt: '2026-01-10T12:00:00.000Z',
  });

  beforeEach(async () => {
    vi.setSystemTime(TODAY);
    resetMockState();
    setMockBacklogData({ albums: [testAlbum] });
    clearNuxtData('backlog');
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanupAfterTest();
  });

  /**
   * Helper to open the modal for the test album
   */
  const openAlbumModal = async () => {
    await mountBacklog();
    await waitFor(() => screen.queryByText('Test Artist') !== null);
    await switchToAlbumsView();
    await waitFor(() => screen.queryByText('Test Album') !== null);

    const albumItem = screen
      .getByText('Test Album')
      .closest('[data-testid="backlog-item"]');
    await fireEvent.click(albumItem as HTMLElement);

    await waitFor(() => screen.queryByRole('dialog') !== null);
    return screen.getByRole('dialog');
  };

  describe('remove from backlog', () => {
    beforeEach(() => {
      registerEndpoint('/api/backlog/test-album-id', {
        method: 'DELETE',
        handler: () => {
          addDeletedBacklogId('test-album-id');
          return { success: true };
        },
      });
    });

    it('should remove album from backlog when clicking remove button', async () => {
      const modal = await openAlbumModal();

      const removeButton = Array.from(
        modal?.querySelectorAll('button') ?? [],
      ).find((btn) => btn.textContent?.includes('Remove from backlog'));

      expect(removeButton).not.toBeNull();
      await fireEvent.click(removeButton as HTMLElement);

      await waitFor(() => deletedBacklogIds.includes('test-album-id'));
      expect(deletedBacklogIds).toContain('test-album-id');
    });
  });

  describe('schedule album', () => {
    let scheduledAlbums: Array<{
      spotifyId: string;
      date: string;
      name: string;
    }>;

    beforeEach(() => {
      scheduledAlbums = [];

      registerEndpoint('/api/listens/scheduled', {
        method: 'POST',
        handler: async (event) => {
          const body = (await readBody(event)) as {
            spotifyId: string;
            date: string;
            name: string;
          };
          scheduledAlbums.push({
            spotifyId: body.spotifyId,
            date: body.date,
            name: body.name,
          });
          return scheduledListenItem({
            id: `scheduled-${body.spotifyId}`,
            date: body.date,
            album: {
              spotifyId: body.spotifyId,
              name: body.name,
              imageUrl: 'https://example.com/image.jpg',
              artists: [{ name: 'Test Artist', spotifyId: 'test-artist' }],
              releaseDate: null,
            },
          });
        },
      });
    });

    it('should show schedule picker when clicking Schedule button', async () => {
      const modal = await openAlbumModal();

      const scheduleButton = Array.from(
        modal?.querySelectorAll('button') ?? [],
      ).find((btn) => btn.textContent?.includes('Schedule'));

      expect(scheduleButton).not.toBeNull();
      await fireEvent.click(scheduleButton as HTMLElement);

      await waitFor(
        () => modal?.textContent?.includes('Choose a day to schedule') ?? false,
      );

      expect(modal?.textContent).toContain('Choose a day to schedule');
    });

    it('should schedule album on an empty day', async () => {
      const modal = await openAlbumModal();

      const scheduleButton = Array.from(
        modal?.querySelectorAll('button') ?? [],
      ).find((btn) => btn.textContent?.includes('Schedule'));
      await fireEvent.click(scheduleButton as HTMLElement);

      await waitFor(() => {
        const dayCardsLoaded = modal?.querySelectorAll('.album-day-card');
        return (dayCardsLoaded?.length ?? 0) > 0;
      });

      const dayCards = modal?.querySelectorAll('.album-day-card');
      expect(dayCards?.length).toBeGreaterThan(0);
      if (dayCards && dayCards.length > 0) {
        await fireEvent.click(dayCards[0] as HTMLElement);
      }

      await waitFor(() => scheduledAlbums.length > 0);
      expect(scheduledAlbums[0]?.spotifyId).toBe('spotify-test');
      expect(scheduledAlbums[0]?.date).toBe('2026-01-16');
    });

    it('should replace existing scheduled album when scheduling on occupied day', async () => {
      const existingScheduled = scheduledListenItem({
        id: 'existing-scheduled',
        date: '2026-01-16',
        album: {
          spotifyId: 'existing-album',
          name: 'Existing Album',
          imageUrl: 'https://example.com/existing.jpg',
          artists: [{ name: 'Existing Artist', spotifyId: 'existing-artist' }],
          releaseDate: null,
        },
      });
      setMockScheduledListensData({
        '2026-01-16': existingScheduled,
      });

      let removedScheduleId: string | null = null;
      registerEndpoint('/api/listens/scheduled/existing-scheduled', {
        method: 'DELETE',
        handler: () => {
          removedScheduleId = 'existing-scheduled';
          return { success: true };
        },
      });

      const modal = await openAlbumModal();

      const scheduleButton = Array.from(
        modal?.querySelectorAll('button') ?? [],
      ).find((btn) => btn.textContent?.includes('Schedule'));
      await fireEvent.click(scheduleButton as HTMLElement);

      await waitFor(() => {
        const dayCardsLoaded = modal?.querySelectorAll('.album-day-card');
        return (dayCardsLoaded?.length ?? 0) > 0;
      });

      const dayCards = modal?.querySelectorAll('.album-day-card');
      if (dayCards && dayCards.length > 0) {
        await fireEvent.click(dayCards[0] as HTMLElement);
      }

      await waitFor(() => scheduledAlbums.length > 0);
      expect(removedScheduleId).toBe('existing-scheduled');
      expect(scheduledAlbums[0]?.spotifyId).toBe('spotify-test');
      expect(scheduledAlbums[0]?.date).toBe('2026-01-16');
    });
  });

  describe('remove from schedule', () => {
    let removedScheduleId: string | null;

    beforeEach(() => {
      removedScheduleId = null;

      const scheduledItem = scheduledListenItem({
        id: 'scheduled-test',
        date: '2026-01-20',
        album: {
          spotifyId: testAlbum.spotifyId,
          name: testAlbum.name,
          imageUrl: testAlbum.imageUrl ?? '',
          artists: testAlbum.artists,
          releaseDate: null,
        },
      });
      setMockScheduledListensData({
        [scheduledItem.date]: scheduledItem,
      });

      registerEndpoint('/api/listens/scheduled/scheduled-test', {
        method: 'DELETE',
        handler: () => {
          removedScheduleId = 'scheduled-test';
          return { success: true };
        },
      });
    });

    it('should show scheduled status in modal for scheduled album', async () => {
      const modal = await openAlbumModal();

      expect(modal?.textContent).toContain('Scheduled for');
      expect(modal?.textContent).toContain('January 20th 2026');
    });

    it('should show remove from schedule button for scheduled album', async () => {
      const modal = await openAlbumModal();

      const removeFromScheduleButton = Array.from(
        modal?.querySelectorAll('button') ?? [],
      ).find((btn) => btn.textContent?.includes('Remove from schedule'));

      expect(removeFromScheduleButton).not.toBeNull();
    });

    it('should remove album from schedule when clicking remove from schedule button', async () => {
      const modal = await openAlbumModal();

      const removeFromScheduleButton = Array.from(
        modal?.querySelectorAll('button') ?? [],
      ).find((btn) => btn.textContent?.includes('Remove from schedule'));

      expect(removeFromScheduleButton).not.toBeNull();
      await fireEvent.click(removeFromScheduleButton as HTMLElement);

      await waitFor(() => removedScheduleId === 'scheduled-test');
      expect(removedScheduleId).toBe('scheduled-test');
    });
  });
});
