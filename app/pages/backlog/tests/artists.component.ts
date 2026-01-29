/**
 * Component tests for the backlog page - Artist Display Mode.
 * Tests artist view functionality including display, expanding/collapsing,
 * filtering, sorting, scheduled indicators, and deletion.
 */
import { registerEndpoint } from '@nuxt/test-utils/runtime';
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
} from './setup';

describe('Artist Display Mode', () => {
  const TODAY = new Date('2026-01-15T12:00:00.000Z');

  // Shared Artist has 2 albums
  const sharedArtistAlbum1: BacklogAlbum = backlogAlbum({
    id: 'shared-album-1',
    spotifyId: 'spotify-shared-1',
    name: 'First Shared Album',
    imageUrl: 'https://example.com/shared1.jpg',
    artists: [
      artist({
        name: 'Shared Artist',
        spotifyId: 'shared-artist',
        imageUrl: 'https://example.com/shared-artist.jpg',
      }),
    ],
    addedAt: '2026-01-10T12:00:00.000Z',
  });

  const sharedArtistAlbum2: BacklogAlbum = backlogAlbum({
    id: 'shared-album-2',
    spotifyId: 'spotify-shared-2',
    name: 'Second Shared Album',
    imageUrl: 'https://example.com/shared2.jpg',
    artists: [
      artist({
        name: 'Shared Artist',
        spotifyId: 'shared-artist',
        imageUrl: 'https://example.com/shared-artist.jpg',
      }),
    ],
    addedAt: '2026-01-14T12:00:00.000Z',
  });

  // Alpha Artist has 1 album
  const alphaArtistAlbum: BacklogAlbum = backlogAlbum({
    id: 'alpha-album-1',
    spotifyId: 'spotify-alpha-1',
    name: 'Alpha Artist Album',
    imageUrl: 'https://example.com/alpha1.jpg',
    artists: [
      artist({
        name: 'Alpha Artist',
        spotifyId: 'alpha-artist',
        imageUrl: 'https://example.com/alpha-artist.jpg',
      }),
    ],
    addedAt: '2026-01-12T12:00:00.000Z',
  });

  // Zeta Artist has 1 album
  const zetaArtistAlbum: BacklogAlbum = backlogAlbum({
    id: 'zeta-album-1',
    spotifyId: 'spotify-zeta-1',
    name: 'Zeta Artist Album',
    imageUrl: 'https://example.com/zeta1.jpg',
    artists: [
      artist({
        name: 'Zeta Artist',
        spotifyId: 'zeta-artist',
        imageUrl: 'https://example.com/zeta-artist.jpg',
      }),
    ],
    addedAt: '2026-01-08T12:00:00.000Z',
  });

  beforeEach(async () => {
    vi.setSystemTime(TODAY);
    resetMockState();
    setMockBacklogData({
      albums: [
        sharedArtistAlbum1,
        sharedArtistAlbum2,
        alphaArtistAlbum,
        zetaArtistAlbum,
      ],
    });
    clearNuxtData('backlog');
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanupAfterTest();
  });

  describe('shows artists', () => {
    it('should render artist groups with names, album counts, and avatars', async () => {
      await mountBacklog();
      await waitFor(() => screen.queryByText('Shared Artist') !== null);

      // Artist names visible as headers
      expect(screen.getByText('Shared Artist')).toBeDefined();
      expect(screen.getByText('Alpha Artist')).toBeDefined();
      expect(screen.getByText('Zeta Artist')).toBeDefined();

      // Album counts visible (Shared Artist has 2, others have 1)
      expect(screen.getByText('2 albums')).toBeDefined();
      expect(screen.getAllByText('1 album').length).toBe(2);

      // Artist avatars present
      const avatars = document.querySelectorAll('span[class*="rounded-full"]');
      expect(avatars.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('can expand', () => {
    it('should expand artist group to show albums when clicked', async () => {
      await mountBacklog();

      await waitFor(() => screen.queryByText('Shared Artist') !== null);

      // Albums should not be visible initially (collapsed)
      expect(screen.queryByText('First Shared Album')).toBeNull();

      // Click on the Shared Artist group to expand
      const artistGroup = screen.getByText('Shared Artist').closest('button');
      expect(artistGroup).not.toBeNull();
      await fireEvent.click(artistGroup as HTMLElement);

      // Wait for albums to appear
      await waitFor(() => screen.queryByText('First Shared Album') !== null);

      expect(screen.getByText('First Shared Album')).toBeDefined();
      expect(screen.getByText('Second Shared Album')).toBeDefined();
    });

    it('should collapse artist group when clicked again', async () => {
      await mountBacklog();

      await waitFor(() => screen.queryByText('Shared Artist') !== null);

      // Expand first
      const artistGroup = screen.getByText('Shared Artist').closest('button');
      await fireEvent.click(artistGroup as HTMLElement);

      await waitFor(() => screen.queryByText('First Shared Album') !== null);
      expect(screen.getByText('First Shared Album')).toBeDefined();

      // Collapse
      await fireEvent.click(artistGroup as HTMLElement);

      await waitFor(() => screen.queryByText('First Shared Album') === null);
      expect(screen.queryByText('First Shared Album')).toBeNull();
    });

    it('should open modal with correct info when clicking album in expanded group', async () => {
      await mountBacklog();

      await waitFor(() => screen.queryByText('Shared Artist') !== null);

      // Expand the artist group
      const artistGroup = screen.getByText('Shared Artist').closest('button');
      await fireEvent.click(artistGroup as HTMLElement);

      await waitFor(() => screen.queryByText('First Shared Album') !== null);

      // Click on the album to open modal
      const albumItem = screen
        .getByText('First Shared Album')
        .closest('[data-testid="backlog-item"]');
      await fireEvent.click(albumItem as HTMLElement);

      // Wait for modal to open
      await waitFor(() => screen.queryByRole('dialog') !== null);

      const modal = screen.getByRole('dialog');
      // Modal should show album name and artist
      expect(modal.textContent).toContain('First Shared Album');
      expect(modal.textContent).toContain('Shared Artist');
    });
  });

  describe('shows scheduled on artist and specific album', () => {
    beforeEach(() => {
      // Schedule one of the shared artist's albums
      const scheduledItem = scheduledListenItem({
        id: 'scheduled-shared-1',
        date: '2026-01-20',
        album: {
          spotifyId: sharedArtistAlbum1.spotifyId,
          name: sharedArtistAlbum1.name,
          imageUrl: sharedArtistAlbum1.imageUrl ?? '',
          artists: sharedArtistAlbum1.artists,
          releaseDate: null,
        },
      });
      setMockScheduledListensData({
        [scheduledItem.date]: scheduledItem,
      });
    });

    it('should show scheduled indicator on artist group header', async () => {
      await mountBacklog();

      await waitFor(() => screen.queryByText('Shared Artist') !== null);

      // The artist group should have a scheduled indicator
      const artistSection = screen.getByText('Shared Artist').closest('button');
      const scheduledIndicator = artistSection?.querySelector(
        '[data-testid="scheduled-indicator"]',
      );
      expect(scheduledIndicator).not.toBeNull();
    });

    it('should show scheduled indicator on specific album when expanded', async () => {
      await mountBacklog();

      await waitFor(() => screen.queryByText('Shared Artist') !== null);

      // Expand the artist group
      const artistGroup = screen.getByText('Shared Artist').closest('button');
      await fireEvent.click(artistGroup as HTMLElement);

      await waitFor(() => screen.queryByText('First Shared Album') !== null);

      // Find the scheduled album card
      const albumCard = screen
        .getByText('First Shared Album')
        .closest('[data-testid="backlog-item"]');

      // Should have scheduled indicator
      const scheduledIndicator = albumCard?.querySelector(
        '[data-testid="scheduled-indicator"]',
      );
      expect(scheduledIndicator).not.toBeNull();
    });
  });

  describe('can delete', () => {
    beforeEach(() => {
      registerEndpoint('/api/backlog/shared-album-1', {
        method: 'DELETE',
        handler: () => {
          addDeletedBacklogId('shared-album-1');
          return { success: true };
        },
      });
    });

    it('should delete album from expanded artist group', async () => {
      await mountBacklog();

      await waitFor(() => screen.queryByText('Shared Artist') !== null);

      // Expand the artist group
      const artistGroup = screen.getByText('Shared Artist').closest('button');
      await fireEvent.click(artistGroup as HTMLElement);

      await waitFor(() => screen.queryByText('First Shared Album') !== null);

      // Find the BacklogItem and its delete button
      const albumItem = screen
        .getByText('First Shared Album')
        .closest('[data-testid="backlog-item"]');
      const deleteButton = albumItem?.querySelector('button');

      expect(deleteButton).not.toBeNull();
      await fireEvent.click(deleteButton as HTMLElement);

      await waitFor(() => deletedBacklogIds.includes('shared-album-1'));

      expect(deletedBacklogIds).toContain('shared-album-1');
    });
  });

  describe('filters work', () => {
    it('should filter artists by artist name when searching', async () => {
      await mountBacklog();

      await waitFor(() => screen.queryByText('Shared Artist') !== null);

      // Initially all artists should be visible
      expect(screen.getByText('Shared Artist')).toBeDefined();
      expect(screen.getByText('Alpha Artist')).toBeDefined();
      expect(screen.getByText('Zeta Artist')).toBeDefined();

      const searchInput = screen.getByPlaceholderText(
        /Search albums or artists/i,
      );
      await fireEvent.update(searchInput, 'Alpha Artist');

      // Wait for Shared Artist to be filtered out
      await waitFor(() => screen.queryByText('Shared Artist') === null);

      expect(screen.queryByText('Shared Artist')).toBeNull();
      expect(screen.getByText('Alpha Artist')).toBeDefined();
      expect(screen.queryByText('Zeta Artist')).toBeNull();
    });

    it('should filter artists by album name when searching', async () => {
      await mountBacklog();

      await waitFor(() => screen.queryByText('Shared Artist') !== null);

      const searchInput = screen.getByPlaceholderText(
        /Search albums or artists/i,
      );
      await fireEvent.update(searchInput, 'First Shared');

      await waitFor(() => screen.queryByText('Alpha Artist') === null);

      // Shared Artist should remain because they have "First Shared Album"
      expect(screen.getByText('Shared Artist')).toBeDefined();
      expect(screen.queryByText('Alpha Artist')).toBeNull();
    });

    it('should show no results message when search has no matches', async () => {
      await mountBacklog();

      await waitFor(() => screen.queryByText('Shared Artist') !== null);

      const searchInput = screen.getByPlaceholderText(
        /Search albums or artists/i,
      );
      await fireEvent.update(searchInput, 'nonexistent xyz');

      await waitFor(
        () =>
          screen.queryByText('No albums found matching your search') !== null,
      );

      expect(
        screen.getByText('No albums found matching your search'),
      ).toBeDefined();
    });
  });

  describe('sort order works', () => {
    it('should display artists in default sort order with sort dropdown available', async () => {
      await mountBacklog();
      await waitFor(() => screen.queryByText('Shared Artist') !== null);

      // Default sort is date-added-desc
      // Shared Artist has newest album (Jan 14), then Alpha (Jan 12), then Zeta (Jan 8)
      const artistButtons = screen.getAllByRole('button').filter((btn) => {
        const text = btn.textContent;
        return (
          text?.includes('Shared Artist') ||
          text?.includes('Alpha Artist') ||
          text?.includes('Zeta Artist')
        );
      });
      expect(artistButtons[0]?.textContent).toContain('Shared Artist');

      // Sort dropdown should be available
      const buttons = screen.getAllByRole('button');
      const sortButton = buttons.find((btn) => {
        const text = btn.textContent || '';
        return (
          text.includes('Newest') ||
          text.includes('Oldest') ||
          text.includes('A →') ||
          text.includes('Z →')
        );
      });
      expect(sortButton).toBeDefined();
    });
  });
});
