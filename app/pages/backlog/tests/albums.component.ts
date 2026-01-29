/**
 * Component tests for the backlog page - Album Display Mode.
 * Tests album view functionality including display, filtering, sorting, and deletion.
 * Modal interaction tests (scheduling, removing) are in modal.component.ts.
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
  switchToAlbumsView,
} from './setup';

describe('Album Display Mode', () => {
  const TODAY = new Date('2026-01-15T12:00:00.000Z');

  // Test albums with specific data for sorting tests
  const albumA: BacklogAlbum = backlogAlbum({
    id: 'album-a-id',
    spotifyId: 'spotify-a',
    name: 'Alpha Album',
    imageUrl: 'https://example.com/alpha.jpg',
    artists: [artist({ name: 'Zeta Artist', spotifyId: 'artist-z' })],
    addedAt: '2026-01-10T12:00:00.000Z', // oldest
  });

  const albumB: BacklogAlbum = backlogAlbum({
    id: 'album-b-id',
    spotifyId: 'spotify-b',
    name: 'Beta Album',
    imageUrl: 'https://example.com/beta.jpg',
    artists: [artist({ name: 'Alpha Artist', spotifyId: 'artist-a' })],
    addedAt: '2026-01-14T12:00:00.000Z', // newest
  });

  const albumC: BacklogAlbum = backlogAlbum({
    id: 'album-c-id',
    spotifyId: 'spotify-c',
    name: 'Gamma Album',
    imageUrl: 'https://example.com/gamma.jpg',
    artists: [artist({ name: 'Mu Artist', spotifyId: 'artist-m' })],
    addedAt: '2026-01-12T12:00:00.000Z', // middle
  });

  beforeEach(async () => {
    vi.setSystemTime(TODAY);
    resetMockState();
    setMockBacklogData({ albums: [albumA, albumB, albumC] });
    clearNuxtData('backlog');
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanupAfterTest();
  });

  describe('shows albums', () => {
    it('should render albums with names, artists, images, and dates', async () => {
      await mountBacklog();
      await waitFor(() => screen.queryByText('Zeta Artist') !== null);
      await switchToAlbumsView();
      await waitFor(() => screen.queryByText('Alpha Album') !== null);

      // Album names visible
      expect(screen.getByText('Alpha Album')).toBeDefined();
      expect(screen.getByText('Beta Album')).toBeDefined();
      expect(screen.getByText('Gamma Album')).toBeDefined();

      // Artist names visible under each album
      expect(screen.getByText('Zeta Artist')).toBeDefined();
      expect(screen.getByText('Alpha Artist')).toBeDefined();
      expect(screen.getByText('Mu Artist')).toBeDefined();

      // Album images present
      const images = document.querySelectorAll('img');
      const albumImages = Array.from(images).filter(
        (img) =>
          img.getAttribute('src')?.includes('alpha.jpg') ||
          img.getAttribute('src')?.includes('beta.jpg') ||
          img.getAttribute('src')?.includes('gamma.jpg'),
      );
      expect(albumImages.length).toBe(3);

      // Added dates visible (Alpha 5 days ago, Beta 1 day ago, Gamma 3 days ago)
      expect(screen.getByText(/Added 5 days ago/i)).toBeDefined();
      expect(screen.getByText(/Added yesterday/i)).toBeDefined();
      expect(screen.getByText(/Added 3 days ago/i)).toBeDefined();
    });
  });

  describe('filters work', () => {
    it('should filter albums by name when searching', async () => {
      await mountBacklog();
      await waitFor(() => screen.queryByText('Zeta Artist') !== null);
      await switchToAlbumsView();
      await waitFor(() => screen.queryByText('Alpha Album') !== null);

      // Verify all albums are visible before filtering
      expect(screen.getByText('Alpha Album')).toBeDefined();
      expect(screen.getByText('Beta Album')).toBeDefined();
      expect(screen.getByText('Gamma Album')).toBeDefined();

      const searchInput = screen.getByPlaceholderText(
        /Search albums or artists/i,
      );
      await fireEvent.update(searchInput, 'Beta Album');

      // Wait for the filter to apply and Alpha to disappear
      await waitFor(() => screen.queryByText('Alpha Album') === null);

      expect(screen.queryByText('Alpha Album')).toBeNull();
      expect(screen.getByText('Beta Album')).toBeDefined();
      expect(screen.queryByText('Gamma Album')).toBeNull();
    });

    it('should filter albums by artist name when searching', async () => {
      await mountBacklog();
      await waitFor(() => screen.queryByText('Zeta Artist') !== null);
      await switchToAlbumsView();
      await waitFor(() => screen.queryByText('Alpha Album') !== null);

      const searchInput = screen.getByPlaceholderText(
        /Search albums or artists/i,
      );
      await fireEvent.update(searchInput, 'Zeta Artist');

      await waitFor(() => screen.queryByText('Beta Album') === null);

      expect(screen.getByText('Alpha Album')).toBeDefined();
      expect(screen.queryByText('Beta Album')).toBeNull();
      expect(screen.queryByText('Gamma Album')).toBeNull();
    });

    it('should show no results message when search has no matches', async () => {
      await mountBacklog();
      await waitFor(() => screen.queryByText('Zeta Artist') !== null);
      await switchToAlbumsView();
      await waitFor(() => screen.queryByText('Alpha Album') !== null);

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

  describe('shows scheduled', () => {
    beforeEach(() => {
      const scheduledItem = scheduledListenItem({
        id: 'scheduled-a',
        date: '2026-01-20',
        album: {
          spotifyId: albumA.spotifyId,
          name: albumA.name,
          imageUrl: albumA.imageUrl ?? '',
          artists: albumA.artists,
          releaseDate: null,
        },
      });
      setMockScheduledListensData({
        [scheduledItem.date]: scheduledItem,
      });
    });

    it('should show scheduled indicator for scheduled albums', async () => {
      await mountBacklog();
      await waitFor(() => screen.queryByText('Zeta Artist') !== null);
      await switchToAlbumsView();
      await waitFor(() => screen.queryByText('Alpha Album') !== null);

      // The scheduled indicator is a calendar icon
      const scheduledIndicators = screen.queryAllByTestId(
        'scheduled-indicator',
      );
      expect(scheduledIndicators.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('can delete', () => {
    beforeEach(() => {
      registerEndpoint('/api/backlog/album-a-id', {
        method: 'DELETE',
        handler: () => {
          addDeletedBacklogId('album-a-id');
          return { success: true };
        },
      });
    });

    it('should delete album when clicking delete button', async () => {
      await mountBacklog();
      await waitFor(() => screen.queryByText('Zeta Artist') !== null);
      await switchToAlbumsView();
      await waitFor(() => screen.queryByText('Alpha Album') !== null);

      // Find the delete button for Alpha Album
      const albumItem = screen
        .getByText('Alpha Album')
        .closest('[data-testid="backlog-item"]');
      const deleteButton = albumItem?.querySelector('button');

      expect(deleteButton).not.toBeNull();
      await fireEvent.click(deleteButton as HTMLElement);

      await waitFor(() => deletedBacklogIds.includes('album-a-id'));

      expect(deletedBacklogIds).toContain('album-a-id');
    });
  });

  describe('album modal', () => {
    it('should open modal with correct album details when clicking an album', async () => {
      await mountBacklog();
      await waitFor(() => screen.queryByText('Zeta Artist') !== null);
      await switchToAlbumsView();
      await waitFor(() => screen.queryByText('Alpha Album') !== null);

      // Click on the Alpha Album item
      const albumItem = screen
        .getByText('Alpha Album')
        .closest('[data-testid="backlog-item"]');
      expect(albumItem).not.toBeNull();
      await fireEvent.click(albumItem as HTMLElement);

      // Wait for modal to open
      await waitFor(() => screen.queryByRole('dialog') !== null);

      const modal = screen.getByRole('dialog');

      // Verify modal displays album name
      expect(modal.textContent).toContain('Alpha Album');

      // Verify modal displays artist name
      expect(modal.textContent).toContain('Zeta Artist');

      // Verify modal displays added date
      expect(modal.textContent).toContain('Added on 10 January 2026');

      // Verify modal displays album image
      const albumImage = modal.querySelector('img[alt="Alpha Album cover"]');
      expect(albumImage).not.toBeNull();
      expect(albumImage?.getAttribute('src')).toContain('alpha.jpg');
    });
  });

  describe('sort order works', () => {
    it('should display albums in default sort order with sort dropdown available', async () => {
      await mountBacklog();
      await waitFor(() => screen.queryByText('Zeta Artist') !== null);
      await switchToAlbumsView();
      await waitFor(() => screen.queryByText('Alpha Album') !== null);

      // Default sort is date-added-desc (newest first)
      // Beta (Jan 14) should be first, then Gamma (Jan 12), then Alpha (Jan 10)
      const albumCards = document.querySelectorAll('[class*="bg-elevated"]');
      const albumTexts = Array.from(albumCards).map((card) =>
        card.textContent?.includes('Beta Album')
          ? 'Beta'
          : card.textContent?.includes('Gamma Album')
            ? 'Gamma'
            : card.textContent?.includes('Alpha Album')
              ? 'Alpha'
              : null,
      );
      const filteredTexts = albumTexts.filter((t) => t !== null);
      expect(filteredTexts[0]).toBe('Beta');

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
