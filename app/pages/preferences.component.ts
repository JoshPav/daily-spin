/** biome-ignore-all lint/style/noNonNullAssertion: ignore potential nulls for test code */
import { mockNuxtImport, registerEndpoint } from '@nuxt/test-utils/runtime';
import { readBody } from 'h3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { GetPreferencesResponse } from '~~/shared/schema';
import {
  cleanupAfterTest,
  createMockPushSubscription,
  fireEvent,
  mountPage,
  resetPushNotificationMocks,
  screen,
  setMockNotificationPermission,
  setMockPushSubscription,
  setupPushNotificationMocks,
  TEST_VAPID_PUBLIC_KEY,
  waitFor,
} from '~~/tests/component';
import { mockUseAuth } from '~~/tests/component/authMock';
import {
  getPreferencesResponse,
  linkedPlaylist,
  userPreferences,
} from '~~/tests/factories/api.factory';

const mountPreferences = () => mountPage('/preferences');

// Shared mock state that tests can modify
let mockPreferencesData: GetPreferencesResponse | null = null;
let patchCalls: { body: unknown }[] = [];
let subscribeCalls: { body: unknown }[] = [];
let unsubscribeCalls: { body: unknown }[] = [];

// Mock useAuth to bypass auth loading (must be at module level)
mockUseAuth();

// Mock useRuntimeConfig to provide VAPID key for push notifications
mockNuxtImport('useRuntimeConfig', () => {
  return () => ({
    public: {
      vapidPublicKey: TEST_VAPID_PUBLIC_KEY,
    },
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

// Register endpoint mocks for push notifications
registerEndpoint('/api/push/subscribe', {
  method: 'POST',
  handler: async (event) => {
    const body = await readBody(event);
    subscribeCalls.push({ body });
    return { success: true };
  },
});

registerEndpoint('/api/push/unsubscribe', {
  method: 'POST',
  handler: async (event) => {
    const body = await readBody(event);
    unsubscribeCalls.push({ body });
    return { success: true };
  },
});

describe('Preferences Page', () => {
  beforeEach(() => {
    mockPreferencesData = getPreferencesResponse();
    patchCalls = [];
    subscribeCalls = [];
    unsubscribeCalls = [];
    // Reset and setup push notification browser API mocks
    resetPushNotificationMocks();
    setupPushNotificationMocks();
    // Clear Nuxt data cache to ensure fresh fetch
    clearNuxtData('preferences');
  });

  afterEach(() => {
    cleanupAfterTest();
  });

  describe('page header', () => {
    it('should render the page title', async () => {
      await mountPreferences();

      expect(
        screen.getByRole('heading', { name: 'Preferences' }),
      ).toBeDefined();
    });
  });

  describe('features card', () => {
    it('should render the Features card with correct title and description', async () => {
      await mountPreferences();

      expect(screen.getByText('Features')).toBeDefined();
      expect(
        screen.getByText(/Control how DailySpin tracks and manages/),
      ).toBeDefined();
    });

    it('should render all three preference toggles', async () => {
      await mountPreferences();

      // Track Listening History toggle
      expect(screen.getByText('Track Listening History')).toBeDefined();
      expect(
        screen.getByText(
          'Automatically detect and record albums you listen to on Spotify',
        ),
      ).toBeDefined();

      // Create Today's Album Playlist toggle
      expect(screen.getByText("Create Today's Album Playlist")).toBeDefined();
      expect(
        screen.getByText(
          'Automatically create/update a Spotify playlist for your scheduled album',
        ),
      ).toBeDefined();

      // Create Song of the Day Playlist toggle
      expect(screen.getByText('Create Song of the Day Playlist')).toBeDefined();
      expect(
        screen.getByText(
          'Automatically create/update a Spotify playlist for daily song picks',
        ),
      ).toBeDefined();
    });

    it('should render Save Changes button', async () => {
      await mountPreferences();

      expect(
        screen.getByRole('button', { name: /Save Changes/ }),
      ).toBeDefined();
    });

    it('should disable Save Changes button when there are no changes', async () => {
      await mountPreferences();

      const saveButton = screen.getByRole('button', { name: /Save Changes/ });
      expect(saveButton.hasAttribute('disabled')).toBe(true);
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
        await mountPreferences();

        const switchButtons = screen.getAllByRole('switch');
        // 3 feature toggles + 1 push notification toggle = 4 switches
        expect(switchButtons).toHaveLength(4);

        const saveButton = screen.getByRole('button', { name: /Save Changes/ });
        expect(saveButton.hasAttribute('disabled')).toBe(true);

        // Click the second switch (createTodaysAlbumPlaylist, currently false)
        await fireEvent.click(switchButtons[1]!);

        // Save Changes button should be enabled
        await waitFor(() => !saveButton.hasAttribute('disabled'));
        expect(saveButton.hasAttribute('disabled')).toBe(false);
      });

      it('should call PATCH API with updated preferences when saving', async () => {
        await mountPreferences();

        const switchButtons = screen.getAllByRole('switch');
        const saveButton = screen.getByRole('button', { name: /Save Changes/ });

        // Toggle the second preference (createTodaysAlbumPlaylist: false -> true)
        await fireEvent.click(switchButtons[1]!);

        // Wait for Save Changes to be enabled
        await waitFor(() => !saveButton.hasAttribute('disabled'));

        // Click Save Changes
        await fireEvent.click(saveButton);

        // PATCH API should have been called with updated preferences
        await waitFor(() => patchCalls.length > 0);
        expect(patchCalls).toHaveLength(1);
        expect(patchCalls[0]?.body).toEqual({
          trackListeningHistory: true,
          createTodaysAlbumPlaylist: true, // toggled from false to true
          createSongOfDayPlaylist: false,
        });
      });
    });
  });

  describe('linked playlists card', () => {
    it('should render the Linked Playlists card title', async () => {
      await mountPreferences();

      await waitFor(() => screen.queryByText('Linked Playlists') !== null);
      expect(screen.getByText('Linked Playlists')).toBeDefined();
    });

    describe('when there are no linked playlists', () => {
      beforeEach(() => {
        mockPreferencesData = getPreferencesResponse({
          linkedPlaylists: [],
        });
        clearNuxtData('preferences');
      });

      it('should show empty state message', async () => {
        await mountPreferences();

        expect(screen.getByText('No playlists linked yet')).toBeDefined();
        expect(
          screen.getByText(
            'Enable playlist features above to automatically create and link Spotify playlists',
          ),
        ).toBeDefined();
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
        await mountPreferences();

        await waitFor(() => screen.queryByText('Album of the Day') !== null);
        expect(screen.getByText('Album of the Day')).toBeDefined();
        expect(
          screen.getByText('Updated daily with your scheduled album'),
        ).toBeDefined();
      });

      it('should display Song of the Day playlist with correct label and description', async () => {
        await mountPreferences();

        await waitFor(
          () =>
            screen.queryByText(
              'A growing collection of your daily song picks',
            ) !== null,
        );
        expect(screen.getByText('Song of the Day')).toBeDefined();
        expect(
          screen.getByText('A growing collection of your daily song picks'),
        ).toBeDefined();
      });

      it('should render Open in Spotify links for each playlist', async () => {
        await mountPreferences();

        await waitFor(() => screen.queryByText('Album of the Day') !== null);

        // Find all links - the Spotify buttons have "Open" text
        const allLinks = screen.getAllByRole('link');
        const spotifyLinks = allLinks.filter((link) =>
          link.getAttribute('href')?.includes('open.spotify.com/playlist/'),
        );
        expect(spotifyLinks).toHaveLength(2);

        const hrefs = spotifyLinks.map((link) => link.getAttribute('href'));
        expect(hrefs).toContain(
          `https://open.spotify.com/playlist/${albumOfTheDayPlaylist.spotifyPlaylistId}`,
        );
        expect(hrefs).toContain(
          `https://open.spotify.com/playlist/${songOfTheDayPlaylist.spotifyPlaylistId}`,
        );
      });

      it('should not show empty state message when playlists exist', async () => {
        await mountPreferences();

        await waitFor(() => screen.queryByText('Album of the Day') !== null);

        expect(screen.queryByText('No playlists linked yet')).toBeNull();
      });
    });
  });

  describe('notifications card', () => {
    it('should render the Notifications card with Push Notifications toggle when push is supported', async () => {
      await mountPreferences();

      await waitFor(() => screen.queryByText('Notifications') !== null);

      // Card title and description
      expect(screen.getByText('Notifications')).toBeDefined();
      expect(
        screen.getByText('Get notified about important updates'),
      ).toBeDefined();

      // Push Notifications toggle
      expect(screen.getByText('Push Notifications')).toBeDefined();
      expect(
        screen.getByText(
          'Receive notifications when you need to reconnect your Spotify account',
        ),
      ).toBeDefined();
    });

    describe('when notifications are blocked', () => {
      beforeEach(() => {
        setMockNotificationPermission('denied');
        setupPushNotificationMocks();
      });

      it('should show blocked warning message', async () => {
        await mountPreferences();

        await waitFor(() => screen.queryByText('Notifications') !== null);
        expect(
          screen.getByText(
            'Notifications are blocked. Please enable them in your browser settings.',
          ),
        ).toBeDefined();
      });
    });

    describe('when toggling push notifications', () => {
      beforeEach(() => {
        // Pre-grant permission so subscribe doesn't need to request it
        setMockNotificationPermission('granted');
        setMockPushSubscription(null);
        setupPushNotificationMocks();
      });

      it('should subscribe when toggling on', async () => {
        await mountPreferences();

        await waitFor(() => screen.queryByText('Push Notifications') !== null);

        const switches = screen.getAllByRole('switch');
        const pushSwitch = switches[3]!;

        expect(pushSwitch.getAttribute('aria-checked')).toBe('false');

        await fireEvent.click(pushSwitch);

        // Should call subscribe endpoint
        await waitFor(() => subscribeCalls.length > 0);
        expect(subscribeCalls).toHaveLength(1);
        expect(subscribeCalls[0]?.body).toMatchObject({
          endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint',
          keys: {
            p256dh: 'test-p256dh-key',
            auth: 'test-auth-key',
          },
        });
      });

      it('should unsubscribe when toggling off', async () => {
        // Start with an existing subscription
        setMockPushSubscription(createMockPushSubscription());
        setupPushNotificationMocks();

        await mountPreferences();

        await waitFor(() => screen.queryByText('Push Notifications') !== null);

        // Find the push notifications switch
        const switches = screen.getAllByRole('switch');
        const pushSwitch = switches[3]!;

        // Click to unsubscribe
        await fireEvent.click(pushSwitch);

        // Should call unsubscribe endpoint
        await waitFor(() => unsubscribeCalls.length > 0);
        expect(unsubscribeCalls).toHaveLength(1);
        expect(unsubscribeCalls[0]?.body).toMatchObject({
          endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint',
        });
      });
    });

    describe('when push notifications are not supported', () => {
      beforeEach(() => {
        // Remove browser APIs to simulate unsupported environment
        // @ts-expect-error - intentionally removing for test
        delete window.PushManager;
        // @ts-expect-error - intentionally removing for test
        delete window.Notification;
        // @ts-expect-error - intentionally removing for test
        delete navigator.serviceWorker;
      });

      it('should not render the Notifications card', async () => {
        await mountPreferences();

        // Wait for page to load (check for Features card)
        await waitFor(() => screen.queryByText('Features') !== null);

        // Notifications card should not be present
        expect(screen.queryByText('Notifications')).toBeNull();
      });
    });
  });
});
