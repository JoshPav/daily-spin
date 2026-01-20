/** biome-ignore-all lint/style/noNonNullAssertion: we are in control of test data */
import { mockNuxtImport, registerEndpoint } from '@nuxt/test-utils/runtime';
import { readBody } from 'h3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { computed, ref } from 'vue';
import type { GetPreferencesResponse } from '~~/shared/schema';
import {
  cleanupAfterTest,
  mountPage,
  waitFor,
  wrapper,
} from '~~/tests/component';
import {
  getPreferencesResponse,
  linkedPlaylist,
  userPreferences,
} from '~~/tests/factories/api.factory';

const mountPreferences = () => mountPage('/preferences');

// Shared mock state that tests can modify
let mockPreferencesData: GetPreferencesResponse | null = null;
let patchCalls: { body: unknown }[] = [];

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

// Register endpoint mock for /api/preferences (GET) - simple form like dashboard tests
registerEndpoint('/api/preferences', () => mockPreferencesData);

// Register endpoint mock for /api/preferences (PATCH)
registerEndpoint('/api/preferences', {
  method: 'PATCH',
  handler: async (event) => {
    const body = await readBody(event);
    patchCalls.push({ body });
    // Return updated preferences
    return {
      preferences: { ...mockPreferencesData?.preferences, ...body },
      linkedPlaylists: mockPreferencesData?.linkedPlaylists ?? [],
    };
  },
});

describe('Preferences Page', () => {
  beforeEach(() => {
    mockPreferencesData = getPreferencesResponse();
    patchCalls = [];
    // Clear Nuxt data cache to ensure fresh fetch
    clearNuxtData('preferences');
  });

  afterEach(() => {
    cleanupAfterTest();
  });

  describe('page header', () => {
    it('should render the page title', async () => {
      // When
      await mountPreferences();

      // Then
      const title = wrapper!.find('h1');
      expect(title.exists()).toBe(true);
      expect(title.text()).toBe('Preferences');
    });
  });

  describe('features card', () => {
    it('should render the Features card with correct title and description', async () => {
      // When
      await mountPreferences();

      // Then
      expect(wrapper!.text()).toContain('Features');
      // The description may have whitespace due to template formatting, so check for key parts
      expect(wrapper!.text()).toContain('Control how DailySpin tracks');
      expect(wrapper!.text()).toContain('manages your');
    });

    it('should render all three preference toggles', async () => {
      // When
      await mountPreferences();

      // Then - Track Listening History toggle
      expect(wrapper!.text()).toContain('Track Listening History');
      expect(wrapper!.text()).toContain(
        'Automatically detect and record albums you listen to on Spotify',
      );

      // And - Create Today's Album Playlist toggle
      expect(wrapper!.text()).toContain("Create Today's Album Playlist");
      expect(wrapper!.text()).toContain(
        'Automatically create/update a Spotify playlist for your scheduled album',
      );

      // And - Create Song of the Day Playlist toggle
      expect(wrapper!.text()).toContain('Create Song of the Day Playlist');
      expect(wrapper!.text()).toContain(
        'Automatically create/update a Spotify playlist for daily song picks',
      );
    });

    it('should render Save Changes button', async () => {
      // When
      await mountPreferences();

      // Then
      const saveButton = wrapper!
        .findAll('button')
        .find((btn) => btn.text().includes('Save Changes'));
      expect(saveButton).toBeDefined();
    });

    it('should disable Save Changes button when there are no changes', async () => {
      // When
      await mountPreferences();

      // Then
      const saveButton = wrapper!
        .findAll('button')
        .find((btn) => btn.text().includes('Save Changes'));
      expect(saveButton?.attributes('disabled')).toBeDefined();
    });

    describe('when toggling a preference', () => {
      beforeEach(() => {
        mockPreferencesData = getPreferencesResponse({
          preferences: userPreferences({
            trackListeningHistory: true,
            createTodaysAlbumPlaylist: false,
            createSongOfDayPlaylist: false,
          }),
        });
        clearNuxtData('preferences');
      });

      it('should enable Save Changes button after toggling a preference', async () => {
        // When
        await mountPreferences();

        // Find the switch buttons (buttons with role="switch")
        const buttons = wrapper!.findAll('button');
        const switchButtons = buttons.filter(
          (btn) => btn.attributes('role') === 'switch',
        );
        expect(switchButtons.length).toBe(3);

        // Verify Save Changes is initially disabled
        const getSaveButton = () =>
          wrapper!
            .findAll('button')
            .find((btn) => btn.text().includes('Save Changes'));
        expect(getSaveButton()?.attributes('disabled')).toBeDefined();

        // Click the second switch (createTodaysAlbumPlaylist, currently false)
        await switchButtons[1]!.trigger('click');

        // Then - Save Changes button should be enabled
        await waitFor(
          () => getSaveButton()?.attributes('disabled') === undefined,
        );
        expect(getSaveButton()?.attributes('disabled')).toBeUndefined();
      });

      it('should call PATCH API with updated preferences when saving', async () => {
        // Given
        await mountPreferences();

        // Find switch buttons and Save Changes button
        const buttons = wrapper!.findAll('button');
        const switchButtons = buttons.filter(
          (btn) => btn.attributes('role') === 'switch',
        );
        const getSaveButton = () =>
          wrapper!
            .findAll('button')
            .find((btn) => btn.text().includes('Save Changes'));

        // Toggle the second preference (createTodaysAlbumPlaylist: false -> true)
        await switchButtons[1]!.trigger('click');

        // Wait for Save Changes to be enabled
        await waitFor(
          () => getSaveButton()?.attributes('disabled') === undefined,
        );

        // When - click Save Changes
        await getSaveButton()!.trigger('click');

        // Then - PATCH API should have been called with updated preferences
        await waitFor(() => patchCalls.length > 0);
        expect(patchCalls).toHaveLength(1);
        expect(patchCalls[0]!.body).toEqual({
          trackListeningHistory: true,
          createTodaysAlbumPlaylist: true, // toggled from false to true
          createSongOfDayPlaylist: false,
        });
      });
    });
  });

  describe('linked playlists card', () => {
    it('should render the Linked Playlists card title', async () => {
      // When
      await mountPreferences();

      // Wait for data to load
      await waitFor(() => wrapper!.text().includes('Linked Playlists'));

      // Then
      expect(wrapper!.text()).toContain('Linked Playlists');
    });

    describe('when there are no linked playlists', () => {
      beforeEach(() => {
        mockPreferencesData = getPreferencesResponse({
          linkedPlaylists: [],
        });
        clearNuxtData('preferences');
      });

      it('should show empty state message', async () => {
        // When
        await mountPreferences();

        // Then
        expect(wrapper!.text()).toContain('No playlists linked yet');
        expect(wrapper!.text()).toContain(
          'Enable playlist features above to automatically create and link Spotify playlists',
        );
      });
    });

    describe('when there are linked playlists', () => {
      const albumOfTheDayPlaylist = linkedPlaylist({
        type: 'album_of_the_day',
        spotifyPlaylistId: 'album-playlist-id',
        spotifyUrl: 'https://open.spotify.com/playlist/album-playlist-id',
      });

      const songOfTheDayPlaylist = linkedPlaylist({
        type: 'song_of_the_day',
        spotifyPlaylistId: 'song-playlist-id',
        spotifyUrl: 'https://open.spotify.com/playlist/song-playlist-id',
      });

      beforeEach(() => {
        mockPreferencesData = getPreferencesResponse({
          linkedPlaylists: [albumOfTheDayPlaylist, songOfTheDayPlaylist],
        });
        clearNuxtData('preferences');
      });

      it('should display Album of the Day playlist with correct label and description', async () => {
        // When
        await mountPreferences();

        // Then
        await waitFor(() => wrapper!.text().includes('Album of the Day'));
        expect(wrapper!.text()).toContain('Album of the Day');
        expect(wrapper!.text()).toContain(
          'Updated daily with your scheduled album',
        );
      });

      it('should display Song of the Day playlist with correct label and description', async () => {
        // When
        await mountPreferences();

        // Then - wait for data to load and render
        await waitFor(() =>
          wrapper!
            .text()
            .includes('A growing collection of your daily song picks'),
        );
        expect(wrapper!.text()).toContain('Song of the Day');
        expect(wrapper!.text()).toContain(
          'A growing collection of your daily song picks',
        );
      });

      it('should render Open in Spotify buttons for each playlist', async () => {
        // When
        await mountPreferences();

        // Wait for playlists to render
        await waitFor(() => wrapper!.text().includes('Album of the Day'));

        // Then - find links to Spotify playlists
        const spotifyLinks = wrapper!
          .findAll('a')
          .filter((link) =>
            link
              .attributes('href')
              ?.includes('https://open.spotify.com/playlist/'),
          );
        expect(spotifyLinks.length).toBe(2);

        // Verify the playlist IDs are in the URLs
        const hrefs = spotifyLinks.map((link) => link.attributes('href'));
        expect(hrefs).toContain(
          `https://open.spotify.com/playlist/${albumOfTheDayPlaylist.spotifyPlaylistId}`,
        );
        expect(hrefs).toContain(
          `https://open.spotify.com/playlist/${songOfTheDayPlaylist.spotifyPlaylistId}`,
        );
      });

      it('should not show empty state message when playlists exist', async () => {
        // When
        await mountPreferences();

        // Wait for playlists to render
        await waitFor(() => wrapper!.text().includes('Album of the Day'));

        // Then
        expect(wrapper!.text()).not.toContain('No playlists linked yet');
      });
    });
  });
});
