/** biome-ignore-all lint/style/noNonNullAssertion: we are in control of test data */
import { mockNuxtImport, registerEndpoint } from '@nuxt/test-utils/runtime';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, ref } from 'vue';
import type { BacklogAlbum, GetBacklogResponse } from '~~/shared/schema';
import {
  cleanupAfterTest,
  mountPage,
  waitFor,
  wrapper,
} from '~~/tests/component';
import { backlogAlbum, backlogArtist } from '~~/tests/factories/api.factory';

const mountBacklog = () => mountPage('/backlog');

// Shared mock state that tests can modify
let mockBacklogData: GetBacklogResponse = { albums: [] };

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

// Register endpoint mock for /api/backlog (GET)
registerEndpoint('/api/backlog', () => mockBacklogData);

describe('Backlog Page', () => {
  const TODAY = new Date('2026-01-15T12:00:00.000Z');

  beforeEach(() => {
    vi.setSystemTime(TODAY);
    mockBacklogData = { albums: [] };
    clearNuxtData('backlog');
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanupAfterTest();
  });

  describe('page header', () => {
    it('should render the page title', async () => {
      // When
      await mountBacklog();

      // Then
      expect(wrapper!.text()).toContain('Backlog');
    });
  });

  describe('when the backlog is empty', () => {
    beforeEach(() => {
      mockBacklogData = { albums: [] };
    });

    it('should render the empty state message', async () => {
      // When
      await mountBacklog();

      // Then
      await waitFor(() => wrapper!.text().includes('Your backlog is empty'));
      expect(wrapper!.text()).toContain('Add albums you want to listen to later');
    });

    it('should render Add Your First Album button in empty state', async () => {
      // When
      await mountBacklog();

      // Then - wait for empty state to render
      await waitFor(() => wrapper!.text().includes('Your backlog is empty'));
      expect(wrapper!.text()).toContain('Add Your First Album');
    });
  });

  describe('when the backlog has albums', () => {
    const testAlbums: BacklogAlbum[] = [
      backlogAlbum({
        id: 'album-1',
        spotifyId: 'spotify-1',
        name: 'Test Album One',
        artists: [backlogArtist({ spotifyId: 'artist-a', name: 'Artist Alpha' })],
        addedAt: new Date('2026-01-10T12:00:00.000Z').toISOString(),
      }),
      backlogAlbum({
        id: 'album-2',
        spotifyId: 'spotify-2',
        name: 'Test Album Two',
        artists: [backlogArtist({ spotifyId: 'artist-b', name: 'Artist Beta' })],
        addedAt: new Date('2026-01-14T12:00:00.000Z').toISOString(),
      }),
      backlogAlbum({
        id: 'album-3',
        spotifyId: 'spotify-3',
        name: 'Another Album',
        artists: [backlogArtist({ spotifyId: 'artist-a', name: 'Artist Alpha' })],
        addedAt: new Date('2026-01-12T12:00:00.000Z').toISOString(),
      }),
    ];

    beforeEach(() => {
      mockBacklogData = { albums: testAlbums };
    });

    describe('artists view mode (default)', () => {
      it('should group albums by artist', async () => {
        // When - artists view is the default
        await mountBacklog();

        // Then - should show artist names as group headers
        await waitFor(() => wrapper!.text().includes('Artist Alpha'));
        expect(wrapper!.text()).toContain('Artist Alpha');
        expect(wrapper!.text()).toContain('Artist Beta');
      });

      it('should show album count per artist', async () => {
        // When
        await mountBacklog();

        // Then - Artist Alpha has 2 albums, Artist Beta has 1
        await waitFor(() => wrapper!.text().includes('2 albums'));
        expect(wrapper!.text()).toContain('2 albums');
        expect(wrapper!.text()).toContain('1 album');
      });

      it('should expand artist group when clicked', async () => {
        // When
        await mountBacklog();
        await waitFor(() => wrapper!.text().includes('Artist Alpha'));

        // Find and click Artist Alpha group
        const artistGroups = wrapper!.findAll('button');
        const alphaGroup = artistGroups.find((btn) =>
          btn.text().includes('Artist Alpha'),
        );
        expect(alphaGroup).toBeDefined();
        await alphaGroup!.trigger('click');

        // Then - should show albums under that artist
        await waitFor(() => wrapper!.text().includes('Test Album One'));
        expect(wrapper!.text()).toContain('Test Album One');
        expect(wrapper!.text()).toContain('Another Album');
      });

      it('should filter artists by search term', async () => {
        // When
        await mountBacklog();
        await waitFor(() => wrapper!.text().includes('Artist Alpha'));

        const searchInput = wrapper!.find('input[placeholder*="Search"]');
        expect(searchInput.exists()).toBe(true);
        await searchInput.setValue('Beta');

        // Then - should only show Artist Beta group
        await waitFor(() => !wrapper!.text().includes('Artist Alpha'));
        expect(wrapper!.text()).toContain('Artist Beta');
        expect(wrapper!.text()).not.toContain('Artist Alpha');
      });

      it('should filter by album name', async () => {
        // When
        await mountBacklog();
        await waitFor(() => wrapper!.text().includes('Artist Alpha'));

        const searchInput = wrapper!.find('input[placeholder*="Search"]');
        await searchInput.setValue('Another');

        // Then - should show Artist Alpha (who has "Another Album") but not Artist Beta
        await waitFor(() => !wrapper!.text().includes('Artist Beta'));
        expect(wrapper!.text()).toContain('Artist Alpha');
        expect(wrapper!.text()).not.toContain('Artist Beta');
      });

      it('should show no results message when search has no matches', async () => {
        // When
        await mountBacklog();
        await waitFor(() => wrapper!.text().includes('Artist Alpha'));

        const searchInput = wrapper!.find('input[placeholder*="Search"]');
        await searchInput.setValue('NonexistentAlbum');

        // Then
        await waitFor(() =>
          wrapper!.text().includes('No albums found matching your search'),
        );
      });
    });

  });
});
