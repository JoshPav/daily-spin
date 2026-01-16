# Auto-Generate Spotify Playlist from Tomorrow's Scheduled Album

## Overview

This feature automatically creates a Spotify playlist containing all tracks from the album scheduled for today (from the FutureListen table). The playlist is created/updated by a daily CRON job, allowing users to have their planned listening ready in their Spotify app.

**GitHub Issue:** [#82](https://github.com/JoshPav/daily-spin/issues/82)
**Parent Issue:** [#16 - Future Listens (Backlog System)](https://github.com/JoshPav/daily-spin/issues/16)

---

## Implementation Status

| Phase | Description | Status | PR |
|-------|-------------|--------|-----|
| 1 | Database Schema - UserPlaylist model | 🔲 Not Started | - |
| 2 | UserPlaylistRepository - Data access layer | 🔲 Not Started | - |
| 3 | PlaylistService - Core playlist creation logic | 🔲 Not Started | - |
| 4 | Scheduled Task - Daily CRON job | 🔲 Not Started | - |
| 5 | User Service Extension - Feature flag filtering | 🔲 Not Started | - |
| 6 | Integration Tests | 🔲 Not Started | - |
| 7 | Unit Tests | 🔲 Not Started | - |

---

## Prerequisites

### OAuth Scopes (Already Configured)

The required Spotify OAuth scopes are already configured in `/shared/auth.ts`:

```typescript
scope: [
  'user-read-recently-played',
  'playlist-modify-public',      // Can create playlists
  'playlist-modify-private',     // Can modify playlists
]
```

No OAuth changes needed.

### Feature Flag (Already Exists)

The User model already has a feature flag:

```prisma
model User {
  createTodaysAlbumPlaylist Boolean @default(true)
}
```

---

## 1. Database Schema

### UserPlaylist Model

Track user playlists in the database to enable reuse (update instead of create) and support multiple playlist types.

**File:** `prisma/schema.prisma`

```prisma
enum PlaylistType {
  album_of_the_day
  song_of_the_day
}

model UserPlaylist {
  id                String       @id @default(cuid())
  userId            String
  playlistType      PlaylistType
  spotifyPlaylistId String       // Spotify's playlist ID
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, playlistType])  // One playlist per type per user
  @@index([userId])
  @@map("user_playlist")
}
```

**Key Points:**
- `PlaylistType` enum supports future expansion (song_of_the_day, etc.)
- Unique constraint on `userId + playlistType` ensures one playlist per type per user
- Stores `spotifyPlaylistId` to update existing playlist instead of creating new ones
- `updatedAt` tracks when playlist was last modified

### Migration Strategy

1. Add new enum and model to `prisma/schema.prisma`
2. Run `bun run db:migrate` to create migration
3. Regenerate Prisma client: `bunx prisma generate`

---

## 2. UserPlaylistRepository

**File:** `server/repositories/userPlaylist.repository.ts`

```typescript
import { createTaggedLogger } from '../utils/logger';
import { prisma } from '../clients/prisma';
import type { PlaylistType } from '@prisma/client';

const logger = createTaggedLogger('Repository:UserPlaylist');

export class UserPlaylistRepository {
  /**
   * Get user's playlist by type
   */
  async getByType(
    userId: string,
    playlistType: PlaylistType,
  ): Promise<{ spotifyPlaylistId: string } | null> {
    logger.debug('Fetching user playlist', { userId, playlistType });

    const playlist = await prisma.userPlaylist.findUnique({
      where: {
        userId_playlistType: { userId, playlistType },
      },
      select: {
        spotifyPlaylistId: true,
      },
    });

    return playlist;
  }

  /**
   * Create or update user's playlist
   */
  async upsert(
    userId: string,
    playlistType: PlaylistType,
    spotifyPlaylistId: string,
  ): Promise<void> {
    logger.debug('Upserting user playlist', { userId, playlistType, spotifyPlaylistId });

    await prisma.userPlaylist.upsert({
      where: {
        userId_playlistType: { userId, playlistType },
      },
      create: {
        userId,
        playlistType,
        spotifyPlaylistId,
      },
      update: {
        spotifyPlaylistId,
        updatedAt: new Date(),
      },
    });

    logger.info('Upserted user playlist', { userId, playlistType });
  }
}
```

---

## 3. PlaylistService

**File:** `server/services/playlist.service.ts`

### Responsibilities

- Get today's FutureListen for a user
- Fetch album tracks from Spotify API
- Create a new playlist OR update existing playlist
- Store/retrieve playlist IDs from database
- Handle errors gracefully

### Interface

```typescript
import { createTaggedLogger } from '../utils/logger';
import type { SpotifyApi } from '@spotify/web-api-ts-sdk';
import { FutureListenRepository } from '../repositories/futureListen.repository';
import { UserPlaylistRepository } from '../repositories/userPlaylist.repository';
import { PlaylistType } from '@prisma/client';

const logger = createTaggedLogger('Service:Playlist');

export class PlaylistService {
  constructor(
    private futureListenRepo = new FutureListenRepository(),
    private userPlaylistRepo = new UserPlaylistRepository(),
  ) {}

  /**
   * Creates or updates the album-of-the-day playlist for today's scheduled album
   * @returns Playlist details or null if no album scheduled
   */
  async updateTodaysAlbumPlaylist(
    userId: string,
    spotifyUserId: string,
    spotifyClient: SpotifyApi,
  ): Promise<{ playlistId: string; playlistUrl: string; trackCount: number; isNew: boolean } | null> {
    logger.info('Updating today\'s album playlist', { userId });

    // Get today's scheduled album
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const futureListen = await this.futureListenRepo.getFutureListenByDate(userId, today);

    if (!futureListen) {
      logger.debug('No album scheduled for today', { userId, date: today.toISOString() });
      return null;
    }

    const { album } = futureListen;
    logger.info('Found scheduled album', {
      userId,
      albumId: album.spotifyId,
      albumName: album.name,
    });

    // Fetch album tracks from Spotify
    const tracks = await this.getAlbumTracks(spotifyClient, album.spotifyId);

    if (tracks.length === 0) {
      logger.warn('Album has no tracks', { userId, albumId: album.spotifyId });
      return null;
    }

    const trackUris = tracks.map(track => track.uri);

    // Check if user already has an album-of-the-day playlist
    const existingPlaylist = await this.userPlaylistRepo.getByType(
      userId,
      PlaylistType.album_of_the_day,
    );

    let playlistId: string;
    let playlistUrl: string;
    let isNew = false;

    if (existingPlaylist) {
      // Update existing playlist
      playlistId = existingPlaylist.spotifyPlaylistId;
      logger.info('Updating existing playlist', { userId, playlistId });

      // Update playlist name and clear tracks
      const playlistName = this.generatePlaylistName(album.name, album.artists);
      await this.updateSpotifyPlaylist(spotifyClient, playlistId, playlistName);
      await this.replacePlaylistTracks(spotifyClient, playlistId, trackUris);

      playlistUrl = `https://open.spotify.com/playlist/${playlistId}`;
    } else {
      // Create new playlist
      isNew = true;
      const playlistName = this.generatePlaylistName(album.name, album.artists);
      const playlist = await this.createSpotifyPlaylist(
        spotifyClient,
        spotifyUserId,
        playlistName,
      );

      playlistId = playlist.id;
      playlistUrl = playlist.external_urls.spotify;

      // Add tracks to new playlist
      await this.addTracksToPlaylist(spotifyClient, playlistId, trackUris);

      // Save playlist ID to database
      await this.userPlaylistRepo.upsert(
        userId,
        PlaylistType.album_of_the_day,
        playlistId,
      );

      logger.info('Created new playlist and saved to database', { userId, playlistId });
    }

    logger.info('Successfully updated playlist', {
      userId,
      playlistId,
      trackCount: tracks.length,
      isNew,
    });

    return {
      playlistId,
      playlistUrl,
      trackCount: tracks.length,
      isNew,
    };
  }

  private async getAlbumTracks(
    spotifyClient: SpotifyApi,
    albumSpotifyId: string,
  ): Promise<{ uri: string; name: string }[]> {
    logger.debug('Fetching album tracks', { albumSpotifyId });

    const albumTracks = await spotifyClient.albums.tracks(albumSpotifyId);

    return albumTracks.items.map(track => ({
      uri: track.uri,
      name: track.name,
    }));
  }

  private async createSpotifyPlaylist(
    spotifyClient: SpotifyApi,
    spotifyUserId: string,
    name: string,
  ): Promise<{ id: string; external_urls: { spotify: string } }> {
    logger.debug('Creating Spotify playlist', { spotifyUserId, name });

    const playlist = await spotifyClient.playlists.createPlaylist(
      spotifyUserId,
      {
        name,
        description: 'Auto-generated by Daily Spin - Your album of the day',
        public: false,
      },
    );

    return playlist;
  }

  private async updateSpotifyPlaylist(
    spotifyClient: SpotifyApi,
    playlistId: string,
    name: string,
  ): Promise<void> {
    logger.debug('Updating Spotify playlist details', { playlistId, name });

    await spotifyClient.playlists.changePlaylistDetails(playlistId, {
      name,
      description: 'Auto-generated by Daily Spin - Your album of the day',
    });
  }

  private async replacePlaylistTracks(
    spotifyClient: SpotifyApi,
    playlistId: string,
    trackUris: string[],
  ): Promise<void> {
    logger.debug('Replacing playlist tracks', { playlistId, trackCount: trackUris.length });

    // Use PUT to replace all tracks (clears and adds in one call)
    // Spotify allows max 100 tracks per request
    if (trackUris.length <= 100) {
      await spotifyClient.playlists.updatePlaylistItems(playlistId, { uris: trackUris });
    } else {
      // For albums with 100+ tracks, replace first 100 then add rest
      const firstBatch = trackUris.slice(0, 100);
      await spotifyClient.playlists.updatePlaylistItems(playlistId, { uris: firstBatch });

      // Add remaining tracks in batches
      for (let i = 100; i < trackUris.length; i += 100) {
        const batch = trackUris.slice(i, i + 100);
        await spotifyClient.playlists.addItemsToPlaylist(playlistId, batch);
      }
    }
  }

  private async addTracksToPlaylist(
    spotifyClient: SpotifyApi,
    playlistId: string,
    trackUris: string[],
  ): Promise<void> {
    logger.debug('Adding tracks to playlist', { playlistId, trackCount: trackUris.length });

    // Spotify allows max 100 tracks per request
    const BATCH_SIZE = 100;

    for (let i = 0; i < trackUris.length; i += BATCH_SIZE) {
      const batch = trackUris.slice(i, i + BATCH_SIZE);
      await spotifyClient.playlists.addItemsToPlaylist(playlistId, batch);
    }
  }

  private generatePlaylistName(
    albumName: string,
    artists: { name: string }[],
  ): string {
    const artistNames = artists.map(a => a.name).join(', ');
    return `Daily Spin: ${albumName} - ${artistNames}`;
  }
}
```

### Key Design Decisions

1. **Reuse existing playlist** - Updates the same playlist daily instead of creating new ones, preventing account clutter
2. **Playlist is private by default** - Users can make it public in Spotify if desired
3. **Batch track additions** - Spotify API limits 100 tracks per request
4. **Descriptive playlist name** - Format: `Daily Spin: {Album} - {Artists}` for easy identification
5. **Graceful handling** - Returns null if no album scheduled (not an error)
6. **Extensible design** - `PlaylistType` enum supports future playlist types (song_of_the_day, etc.)

---

## 4. Scheduled Task

**File:** `server/tasks/updateTodaysAlbumPlaylist.ts`

### Implementation

```typescript
import { createTaggedLogger } from '../utils/logger';
import { UserService } from '../services/user.service';
import { PlaylistService } from '../services/playlist.service';
import { SpotifyService } from '../services/spotify.service';

const logger = createTaggedLogger('Task:UpdateTodaysAlbumPlaylist');

export default defineTask({
  meta: {
    name: 'updateTodaysAlbumPlaylist',
    description: 'Creates or updates Spotify playlists for users with albums scheduled for today',
  },
  run: async () => {
    const startTime = Date.now();
    logger.info('Starting updateTodaysAlbumPlaylist task');

    const userService = new UserService();
    const playlistService = new PlaylistService();
    const spotifyService = new SpotifyService();

    // Fetch users with the feature enabled
    const users = await userService.fetchUsersForPlaylistCreation();
    logger.info('Found users for playlist creation', { userCount: users.length });

    if (users.length === 0) {
      return {
        result: 'No users with playlist creation enabled',
        duration: Date.now() - startTime,
      };
    }

    // Process users in parallel
    const results = await Promise.allSettled(
      users.map(async (user) => {
        const { id: userId, accounts } = user;
        const spotifyAccount = accounts[0];

        if (!spotifyAccount) {
          logger.warn('User has no Spotify account', { userId });
          return { userId, status: 'skipped', reason: 'no_spotify_account' };
        }

        try {
          // Get Spotify client for user
          const spotifyClient = await spotifyService.getClientForUser(
            userId,
            spotifyAccount,
          );

          // Get Spotify user ID
          const spotifyUser = await spotifyClient.currentUser.profile();
          const spotifyUserId = spotifyUser.id;

          // Create or update playlist
          const result = await playlistService.updateTodaysAlbumPlaylist(
            userId,
            spotifyUserId,
            spotifyClient,
          );

          if (result) {
            return {
              userId,
              status: result.isNew ? 'created' : 'updated',
              playlistId: result.playlistId,
              trackCount: result.trackCount,
            };
          } else {
            return { userId, status: 'skipped', reason: 'no_album_scheduled' };
          }
        } catch (error) {
          logger.error('Failed to update playlist for user', {
            userId,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
          });
          return { userId, status: 'failed', error: String(error) };
        }
      }),
    );

    // Aggregate results
    const summary = {
      total: results.length,
      created: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
    };

    for (const result of results) {
      if (result.status === 'fulfilled') {
        const value = result.value;
        if (value.status === 'created') summary.created++;
        else if (value.status === 'updated') summary.updated++;
        else if (value.status === 'skipped') summary.skipped++;
        else if (value.status === 'failed') summary.failed++;
      } else {
        summary.failed++;
      }
    }

    const duration = Date.now() - startTime;
    logger.info('Completed updateTodaysAlbumPlaylist task', { ...summary, duration });

    return {
      result: `Created ${summary.created}, updated ${summary.updated}, skipped ${summary.skipped}, failed ${summary.failed}`,
      ...summary,
      duration,
    };
  },
});
```

### CRON Registration

**File:** `nuxt.config.ts`

Add to `nitro.scheduledTasks`:

```typescript
scheduledTasks: {
  '0 * * * *': ['processListens'],
  '0 3 * * *': ['scheduleBacklogListens'],
  '0 6 * * *': ['updateTodaysAlbumPlaylist'],  // Daily at 6 AM UTC
}
```

The 6 AM UTC timing ensures:
- FutureListen scheduling (3 AM) has already run
- Playlist is ready before most users start their day

---

## 5. User Service Extension

**File:** `server/services/user.service.ts`

### New Method

```typescript
/**
 * Fetches users who have the createTodaysAlbumPlaylist feature enabled
 */
async fetchUsersForPlaylistCreation(): Promise<UserWithAuthTokens[]> {
  logger.debug('Fetching users for playlist creation');

  const users = await this.userRepo.getUsersWithFeatureEnabled('createTodaysAlbumPlaylist');

  logger.info('Found users for playlist creation', { count: users.length });
  return users;
}
```

### Repository Method

**File:** `server/repositories/user.repository.ts`

```typescript
/**
 * Gets users with a specific feature flag enabled
 */
async getUsersWithFeatureEnabled(
  featureName: 'createTodaysAlbumPlaylist',
): Promise<UserWithAuthTokens[]> {
  logger.debug('Fetching users with feature enabled', { featureName });

  const users = await prisma.user.findMany({
    where: {
      [featureName]: true,
      accounts: {
        some: {
          provider: 'spotify',
        },
      },
    },
    include: {
      accounts: {
        where: { provider: 'spotify' },
        select: {
          accessToken: true,
          refreshToken: true,
          accessTokenExpiresAt: true,
        },
      },
    },
  });

  return users;
}
```

---

## 6. Integration Tests

**File:** `server/tasks/updateTodaysAlbumPlaylist.integration.ts`

### Test Cases

```typescript
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockRuntimeConfig } from '~~/tests/integration.setup';
import { createUser, createFutureListen, createUserPlaylist } from '~~/tests/db/utils';
import { mockSpotifyApi, mockWithAccessToken } from '~~/tests/mocks/spotifyMock';
import { simplifiedAlbum } from '~~/tests/factories/spotify.factory';
import { PlaylistType } from '@prisma/client';

describe('updateTodaysAlbumPlaylist Task', () => {
  let handler: () => Promise<any>;
  let userId: string;
  let userAccount: any;

  const mockCreatePlaylist = vi.mocked(mockSpotifyApi.playlists.createPlaylist);
  const mockChangePlaylistDetails = vi.mocked(mockSpotifyApi.playlists.changePlaylistDetails);
  const mockUpdatePlaylistItems = vi.mocked(mockSpotifyApi.playlists.updatePlaylistItems);
  const mockAddItemsToPlaylist = vi.mocked(mockSpotifyApi.playlists.addItemsToPlaylist);
  const mockGetAlbumTracks = vi.mocked(mockSpotifyApi.albums.tracks);
  const mockCurrentUserProfile = vi.mocked(mockSpotifyApi.currentUser.profile);

  beforeAll(async () => {
    vi.setSystemTime(new Date('2026-01-17T08:00:00.000Z'));
    mockRuntimeConfig.spotifyClientId = 'test-spotify-client-id';
  });

  beforeEach(async () => {
    const user = await createUser({ createTodaysAlbumPlaylist: true });
    userId = user.id;
    userAccount = user.accounts[0];

    // Default mocks
    mockCurrentUserProfile.mockResolvedValue({ id: 'spotify-user-123' });
    mockGetAlbumTracks.mockResolvedValue({
      items: [
        { uri: 'spotify:track:1', name: 'Track 1' },
        { uri: 'spotify:track:2', name: 'Track 2' },
      ],
    });
    mockCreatePlaylist.mockResolvedValue({
      id: 'playlist-123',
      external_urls: { spotify: 'https://open.spotify.com/playlist/123' },
    });
    mockChangePlaylistDetails.mockResolvedValue(undefined);
    mockUpdatePlaylistItems.mockResolvedValue({ snapshot_id: 'snapshot-1' });
    mockAddItemsToPlaylist.mockResolvedValue({ snapshot_id: 'snapshot-1' });

    handler = (await import('./updateTodaysAlbumPlaylist')).default.run;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('new playlist creation', () => {
    it('should create playlist for user with no existing playlist', async () => {
      // Given
      const album = simplifiedAlbum({ id: 'album-123', name: 'Test Album' });
      const today = new Date('2026-01-17T00:00:00.000Z');
      await createFutureListen({ userId, albumSpotifyId: album.id, date: today });

      // When
      const result = await handler();

      // Then
      expect(result.created).toBe(1);
      expect(result.updated).toBe(0);
      expect(mockCreatePlaylist).toHaveBeenCalledWith(
        'spotify-user-123',
        expect.objectContaining({
          name: expect.stringContaining('Test Album'),
          public: false,
        }),
      );
    });
  });

  describe('existing playlist update', () => {
    it('should update existing playlist instead of creating new one', async () => {
      // Given
      const album = simplifiedAlbum({ id: 'album-123', name: 'New Album' });
      const today = new Date('2026-01-17T00:00:00.000Z');
      await createFutureListen({ userId, albumSpotifyId: album.id, date: today });
      await createUserPlaylist({
        userId,
        playlistType: PlaylistType.album_of_the_day,
        spotifyPlaylistId: 'existing-playlist-456',
      });

      // When
      const result = await handler();

      // Then
      expect(result.updated).toBe(1);
      expect(result.created).toBe(0);
      expect(mockCreatePlaylist).not.toHaveBeenCalled();
      expect(mockChangePlaylistDetails).toHaveBeenCalledWith(
        'existing-playlist-456',
        expect.objectContaining({
          name: expect.stringContaining('New Album'),
        }),
      );
      expect(mockUpdatePlaylistItems).toHaveBeenCalledWith(
        'existing-playlist-456',
        { uris: ['spotify:track:1', 'spotify:track:2'] },
      );
    });
  });

  describe('edge cases', () => {
    it('should skip user with no scheduled album', async () => {
      // Given - no FutureListen for today

      // When
      const result = await handler();

      // Then
      expect(result.skipped).toBe(1);
      expect(result.created).toBe(0);
      expect(mockCreatePlaylist).not.toHaveBeenCalled();
    });

    it('should skip user with feature disabled', async () => {
      // Given
      await prisma.user.update({
        where: { id: userId },
        data: { createTodaysAlbumPlaylist: false },
      });

      // When
      const result = await handler();

      // Then
      expect(result.total).toBe(0);
    });

    it('should handle Spotify API errors gracefully', async () => {
      // Given
      const album = simplifiedAlbum();
      await createFutureListen({ userId, albumSpotifyId: album.id, date: new Date() });
      mockCreatePlaylist.mockRejectedValue(new Error('Spotify API error'));

      // When
      const result = await handler();

      // Then
      expect(result.failed).toBe(1);
      expect(result.created).toBe(0);
    });
  });
});
```

---

## 7. Data Flow Diagram

```
6:00 AM UTC Daily CRON Trigger
    │
    ▼
updateTodaysAlbumPlaylist Task runs
    │
    ▼
UserService.fetchUsersForPlaylistCreation()
    │  ↳ Returns users with createTodaysAlbumPlaylist = true
    │
    ▼
For each user (parallel with Promise.allSettled):
    │
    ├─ SpotifyService.getClientForUser(userId, auth)
    │
    ├─ spotifyClient.currentUser.profile()
    │  ↳ Get Spotify user ID
    │
    ├─ FutureListenRepository.getFutureListenByDate(userId, today)
    │  ↳ If no album scheduled → skip user
    │
    ├─ spotifyClient.albums.tracks(albumSpotifyId)
    │  ↳ Get all tracks from album
    │
    ├─ UserPlaylistRepository.getByType(userId, 'album_of_the_day')
    │  ↳ Check if user has existing playlist
    │
    ├─ IF existing playlist:
    │  ├─ spotifyClient.playlists.changePlaylistDetails(playlistId, name)
    │  │  ↳ Update playlist name
    │  └─ spotifyClient.playlists.updatePlaylistItems(playlistId, uris)
    │     ↳ Replace all tracks
    │
    ├─ IF no existing playlist:
    │  ├─ spotifyClient.playlists.createPlaylist(spotifyUserId, name, options)
    │  │  ↳ Create new private playlist
    │  ├─ spotifyClient.playlists.addItemsToPlaylist(playlistId, trackUris)
    │  │  ↳ Add tracks in batches of 100
    │  └─ UserPlaylistRepository.upsert(userId, type, spotifyPlaylistId)
    │     ↳ Save playlist ID to database
    │
    └─ Log success/failure
    │
    ▼
Return summary: { created, updated, skipped, failed, duration }
```

---

## 8. Error Handling

| Scenario | Handling |
|----------|----------|
| No album scheduled for today | Skip user, return `null` |
| Album has 0 tracks | Skip user, log warning |
| Spotify API rate limit | Caught, logged, user marked as failed |
| Invalid/expired token | SpotifyService handles refresh automatically |
| User revoked permissions | Caught, logged, user marked as failed |
| Network errors | Caught, logged, user marked as failed |
| Playlist deleted by user | Spotify API returns 404, create new playlist and update DB |

All errors are caught per-user so one failure doesn't block other users.

**Note on deleted playlists:** If a user manually deletes their playlist in Spotify, the next update will fail with a 404. The service should catch this specific error and create a new playlist, updating the database with the new playlist ID.

---

## 9. Future Enhancements (Out of Scope)

These are potential improvements for future iterations:

1. **Song of the day playlist** - Use `PlaylistType.song_of_the_day` for a different playlist type
2. **User preferences** - Allow custom playlist names, public/private toggle
3. **Notification** - Notify user when playlist is created/updated (push notification, email)
4. **Playlist history** - Track what albums were added to the playlist over time

---

## 10. Files Summary

### New Files

| File | Description |
|------|-------------|
| `server/repositories/userPlaylist.repository.ts` | Data access for UserPlaylist model |
| `server/services/playlist.service.ts` | Core playlist creation/update logic |
| `server/tasks/updateTodaysAlbumPlaylist.ts` | CRON task implementation |
| `server/services/playlist.service.test.ts` | Unit tests |
| `server/tasks/updateTodaysAlbumPlaylist.integration.ts` | Integration tests |

### Modified Files

| File | Changes |
|------|---------|
| `prisma/schema.prisma` | Add `PlaylistType` enum and `UserPlaylist` model |
| `nuxt.config.ts` | Add CRON task registration |
| `server/services/user.service.ts` | Add `fetchUsersForPlaylistCreation()` method |
| `server/repositories/user.repository.ts` | Add `getUsersWithFeatureEnabled()` method |

---

## 11. Dependencies

- FutureListen scheduling must be working (#16 core functionality)
- Users must have connected Spotify account with `playlist-modify-private` scope
- `createTodaysAlbumPlaylist` feature flag must exist in User model (already exists)
