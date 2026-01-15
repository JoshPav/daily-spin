# Backlog Feature Implementation Plan (Updated)

## Overview

The Backlog feature allows users to queue albums for future listening. The system stores only albums in the database, with the frontend handling the complexity of adding multiple albums from an artist. The backlog will automatically clean up listened albums and use backlog items when generating future listens.

## Key Changes from Original Plan

**Simplified Approach:**
- Database stores **only albums** (no separate artist tracking)
- Frontend handles "add artist" flow by fetching all albums and adding them in bulk
- POST endpoint accepts **array of albums** for bulk operations (includes bulk delete support)
- GET endpoint returns **flat list of albums** only
- Artist context tracked via optional `addedFromArtistId` field

---

## Implementation Status

| Phase | Description | Status | PR |
|-------|-------------|--------|-----|
| 1 | Database Schema (Albums Only) | ✅ Complete | - |
| 2 | Shared Types & API Contracts | ✅ Complete | - |
| 3 | Repository Layer | ✅ Complete | - |
| 4 | Service Layer | ✅ Complete | - |
| 5 | API Endpoints | ⏸️ On Hold (Being worked on separately) | - |
| 6 | Integration with Listen Tracking | 🔲 Not Started | - |
| 7 | Frontend Composables | 🔲 Not Started | - |
| 8 | Frontend UI Components | 🔲 Not Started | - |
| 9 | Future Listen Generation Task | 🔲 Not Started | - |
| 10 | Testing & Polish | 🔲 Not Started | - |

**Next up:** API Endpoints (being handled separately), then Integration with Listen Tracking

---

## 1. Database Schema (✅ Complete)

### Prisma Model

**BacklogItem Model:**
```prisma
model BacklogItem {
  id                  String   @id @default(cuid())
  userId              String
  spotifyId           String    // Album ID from Spotify
  name                String
  imageUrl            String?
  artistNames         String    // Comma-separated artist names from album
  addedFromArtistId   String?   // Optional: Artist ID if added via "add artist" flow
  addedFromArtistName String?   // Optional: Artist name for display context
  addedAt             DateTime @default(now())
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, spotifyId])
  @@index([userId])
  @@index([addedFromArtistId])
  @@map("backlog_item")
}
```

**Key Points:**
- No `BacklogType` enum - all items are albums
- `artistNames` is required (all items have artists)
- `addedFromArtistId` and `addedFromArtistName` are optional for tracking which artist the album was added from
- Unique constraint on `userId + spotifyId` prevents duplicate albums

### Migration Strategy (✅ Complete)

1. ✅ Updated Prisma schema in `prisma/schema.prisma`
2. ✅ Applied schema changes to development database using `prisma db push --accept-data-loss`
3. ✅ Regenerated Prisma client: `bunx prisma generate`
4. ✅ Fixed docker-compose.yml to expose port 5433 for test database
5. ✅ Applied schema changes to test database using `prisma db push --accept-data-loss`

**Note:** Used `prisma db push` instead of migrations since we're restructuring an existing schema in development.

---

## 2. Shared Types and API Contracts (✅ Complete)

**File:** `shared/schema.ts`

**Implemented types:**

```typescript
// Backlog types
export type BacklogAlbum = {
  id: string;
  spotifyId: string;
  name: string;
  imageUrl: string | null;
  artistNames: string;  // Required - all items are albums
  addedFromArtistId: string | null;
  addedFromArtistName: string | null;
  addedAt: string;
};

// API endpoint types
export type GetBacklogResponse = {
  albums: BacklogAlbum[];  // Flat list, no artists array
};

export type GetBacklog = {
  query: never;
  params: never;
  body: never;
  response: GetBacklogResponse;
};

export type AddBacklogItemBody = {
  spotifyId: string;
  name: string;
  imageUrl?: string;
  artistNames: string;  // Required
  addedFromArtistId?: string;
  addedFromArtistName?: string;
};

export type AddBacklogItemsBody = AddBacklogItemBody[];  // Array for bulk operations

export type AddBacklogItemsResponse = {
  added: BacklogAlbum[];
  skipped: string[];  // Album IDs that were already in backlog
};

export type AddBacklogItems = {
  query: never;
  params: never;
  body: AddBacklogItemsBody;
  response: AddBacklogItemsResponse;
};

export type DeleteBacklogItem = {
  query: never;
  params: { id: string };
  body: never;
  response: never;
};

// Type for background task suggestions
export type BacklogSuggestion = {
  albumId: string;
  albumName: string;
  artistNames: string;
  imageUrl: string;
  source: 'backlog';  // Simplified - no differentiation needed
};
```

**Changes from Original Plan:**
- Removed `BacklogType` and `BacklogArtist`
- `artistNames` is required in `BacklogAlbum`
- Added artist context fields (`addedFromArtistId`, `addedFromArtistName`)
- Bulk endpoint accepts array: `AddBacklogItemsBody`
- Response includes `skipped` array for duplicate tracking

---

## 3. Repository Layer (✅ Complete)

**File:** `server/repositories/backlog.repository.ts`

**Implemented with the following key methods:**
- `createBacklogItems()` - Bulk insert with `skipDuplicates: true`
- `getExistingAlbumIds()` - Check for duplicates before bulk insert
- **`deleteBacklogItems()`** - Bulk delete by IDs
- `deleteBacklogItemBySpotifyId()` - Cleanup by Spotify ID (for listen tracking integration)
- Removed all type-specific methods (`getBacklogAlbums`, `getBacklogArtists`)

**Implementation notes:**
- Uses Prisma's `createMany` with `skipDuplicates` for efficient bulk inserts
- Unique constraint on `[userId, spotifyId]` prevents duplicates
- All methods filter by `userId` for security

```typescript
import type { BacklogType, PrismaClient } from '@prisma/client';
import prisma from '../clients/prisma';

export type CreateBacklogItem = {
  userId: string;
  type: BacklogType;
  spotifyId: string;
  name: string;
  imageUrl?: string;
  artistNames?: string;
};

export class BacklogRepository {
  constructor(private prismaClient: PrismaClient = prisma) {}

  async getBacklogItems(userId: string) {
    return await this.prismaClient.backlogItem.findMany({
      where: { userId },
      orderBy: { addedAt: 'desc' },
    });
  }

  async getBacklogItemById(id: string, userId: string) {
    return await this.prismaClient.backlogItem.findFirst({
      where: { id, userId },
    });
  }

  async createBacklogItem(data: CreateBacklogItem) {
    return await this.prismaClient.backlogItem.create({
      data,
    });
  }

  async deleteBacklogItem(id: string, userId: string) {
    return await this.prismaClient.backlogItem.delete({
      where: { id, userId },
    });
  }

  async deleteBacklogItemBySpotifyId(
    userId: string,
    spotifyId: string,
    type: BacklogType
  ) {
    return await this.prismaClient.backlogItem.deleteMany({
      where: { userId, spotifyId, type },
    });
  }

  async getBacklogArtists(userId: string) {
    return await this.prismaClient.backlogItem.findMany({
      where: { userId, type: 'artist' },
    });
  }

  async getBacklogAlbums(userId: string) {
    return await this.prismaClient.backlogItem.findMany({
      where: { userId, type: 'album' },
    });
  }

  async hasBacklogItem(userId: string, spotifyId: string, type: BacklogType) {
    const count = await this.prismaClient.backlogItem.count({
      where: { userId, spotifyId, type },
    });
    return count > 0;
  }
}
```

---

## 4. Service Layer (✅ Complete)

### 4.1 BacklogService (✅ Complete)

**File:** `server/services/backlog.service.ts`

**Implemented with the following key methods:**
- `addBacklogItems()` - Bulk add albums, returns `{ added, skipped }`
- **`removeBacklogItems()`** - Bulk delete albums by IDs
- `removeBacklogItem()` - Single delete for UI interactions
- `getRandomSuggestion()` - For CRON job integration (future listen generation)
- Removed all artist-specific logic

**Implementation notes:**
- Accepts `AddBacklogItemBody[]` for bulk operations
- Returns duplicate information in response for user feedback
- All methods use repository layer for data access

```typescript
import type { BacklogType } from '@prisma/client';
import type { AuthDetails } from './user.service';
import { BacklogRepository } from '../repositories/backlog.repository';
import { getSpotifyClientForUser } from '../clients/spotify';
import { getAlbumArtwork } from '../utils/albums.utils';
import { isRealAlbum } from '../utils/albums.utils';

export class BacklogService {
  constructor(private backlogRepo = new BacklogRepository()) {}

  async getBacklog(userId: string) {
    return await this.backlogRepo.getBacklogItems(userId);
  }

  async addBacklogItem(
    userId: string,
    data: {
      type: BacklogType;
      spotifyId: string;
      name: string;
      imageUrl?: string;
      artistNames?: string;
    }
  ) {
    return await this.backlogRepo.createBacklogItem({
      userId,
      ...data,
    });
  }

  async removeBacklogItem(userId: string, itemId: string) {
    return await this.backlogRepo.deleteBacklogItem(itemId, userId);
  }

  /**
   * Get a random suggestion from the backlog (used by background task)
   */
  async getRandomSuggestion(userId: string, auth: AuthDetails) {
    const backlogAlbums = await this.backlogRepo.getBacklogAlbums(userId);
    const backlogArtists = await this.backlogRepo.getBacklogArtists(userId);

    // Randomly choose between album and artist backlog
    const useAlbum = Math.random() < 0.5;

    if (useAlbum && backlogAlbums.length > 0) {
      // Pick a random album from backlog
      const randomAlbum = backlogAlbums[Math.floor(Math.random() * backlogAlbums.length)];

      return {
        albumId: randomAlbum.spotifyId,
        albumName: randomAlbum.name,
        artistNames: randomAlbum.artistNames || '',
        imageUrl: randomAlbum.imageUrl || '',
        source: 'backlog_album' as const,
      };
    } else if (backlogArtists.length > 0) {
      // Pick a random artist and get a random album from them
      const randomArtist = backlogArtists[Math.floor(Math.random() * backlogArtists.length)];

      try {
        const spotifyApi = getSpotifyClientForUser(auth);
        const artistAlbums = await spotifyApi.artists.albums(
          randomArtist.spotifyId,
          undefined,
          50
        );

        // Filter for real albums only
        const realAlbums = artistAlbums.items.filter(isRealAlbum);

        if (realAlbums.length > 0) {
          const randomAlbum = realAlbums[Math.floor(Math.random() * realAlbums.length)];

          return {
            albumId: randomAlbum.id,
            albumName: randomAlbum.name,
            artistNames: randomAlbum.artists.map(a => a.name).join(', '),
            imageUrl: getAlbumArtwork(randomAlbum.images),
            source: 'backlog_artist' as const,
          };
        }
      } catch (error) {
        console.error('Error fetching artist albums:', error);
        return null;
      }
    }

    return null;
  }
}
```

### 4.2 BacklogCleanupService (✅ Complete)

**File:** `server/services/backlogCleanup.service.ts`

**Implemented with the following key methods:**
- `cleanupListenedAlbum()` - Remove album when user listens to it
- `cleanupFromDailyListen()` - Integration hook for daily listen processing
- Removed all artist-specific cleanup logic (no longer needed with albums-only approach)

**Implementation notes:**
- Simple service focused on backlog cleanup when albums are listened to
- Will be integrated with `DailyListenService` and `RecentlyPlayedService`

```typescript
import type { AuthDetails } from './user.service';
import { BacklogRepository } from '../repositories/backlog.repository';
import { getSpotifyClientForUser } from '../clients/spotify';
import { isRealAlbum } from '../utils/albums.utils';

export class BacklogCleanupService {
  constructor(private backlogRepo = new BacklogRepository()) {}

  /**
   * Remove an album from backlog when user listens to it
   */
  async cleanupListenedAlbum(userId: string, albumId: string) {
    await this.backlogRepo.deleteBacklogItemBySpotifyId(userId, albumId, 'album');
  }

  /**
   * Check if all albums from an artist have been listened to, and remove artist from backlog
   */
  async cleanupArtistIfComplete(userId: string, artistId: string, auth: AuthDetails) {
    // Check if this artist is in the backlog
    const hasArtist = await this.backlogRepo.hasBacklogItem(userId, artistId, 'artist');

    if (!hasArtist) {
      return;
    }

    try {
      const spotifyApi = getSpotifyClientForUser(auth);

      // Get all albums from this artist
      const artistAlbums = await spotifyApi.artists.albums(
        artistId,
        undefined,
        50
      );

      // Filter for real albums only
      const realAlbums = artistAlbums.items.filter(isRealAlbum);

      // Get user's listened albums (this would need to be implemented)
      // For now, we'll leave this as a placeholder
      // const listenedAlbums = await this.getListenedAlbums(userId);

      // If all real albums have been listened to, remove artist from backlog
      // const allListened = realAlbums.every(album =>
      //   listenedAlbums.some(listened => listened.albumId === album.id)
      // );

      // if (allListened) {
      //   await this.backlogRepo.deleteBacklogItemBySpotifyId(userId, artistId, 'artist');
      // }

    } catch (error) {
      console.error('Error checking artist completion:', error);
    }
  }

  /**
   * Cleanup when processing a daily listen
   */
  async cleanupFromDailyListen(
    userId: string,
    albumId: string,
    artistIds: string[],
    auth: AuthDetails
  ) {
    // Remove the album if it's in backlog
    await this.cleanupListenedAlbum(userId, albumId);

    // Check each artist to see if all their albums have been listened to
    for (const artistId of artistIds) {
      await this.cleanupArtistIfComplete(userId, artistId, auth);
    }
  }
}
```

---

## 5. Utility Functions for Album Filtering (✅ Complete)

**File:** `server/utils/albums.utils.ts` (extended existing file)

**Implemented functions:**
- `isRealAlbum()` - Filters out singles, compilations, and EPs (< 5 tracks)
- `filterRealAlbums()` - Batch filtering for album arrays

**Implementation notes:**
- Used on frontend when user adds artist (filters albums before displaying)
- Excludes singles, compilations, and albums with < 5 tracks
- EPs with 5-7 tracks are included as "real albums"

Add these functions:

```typescript
import type { SimplifiedAlbum } from '@spotify/web-api-ts-sdk';

const MIN_ALBUM_TRACKS = 5;
const MAX_EP_TRACKS = 7;

/**
 * Determines if an album is a "real album" vs EP/single/compilation
 */
export const isRealAlbum = (album: SimplifiedAlbum): boolean => {
  // Must have minimum track count
  if (album.total_tracks < MIN_ALBUM_TRACKS) {
    return false;
  }

  // Filter by album_type - prefer 'album' over 'single' or 'compilation'
  if (album.album_type === 'single') {
    return false;
  }

  // Some EPs are marked as 'album' but have few tracks
  if (album.album_type === 'album' && album.total_tracks <= MAX_EP_TRACKS) {
    // Could be an EP, but we'll allow it if it has at least MIN_ALBUM_TRACKS
    return true;
  }

  // Compilations might be included or excluded based on preference
  // For now, let's exclude them
  if (album.album_type === 'compilation') {
    return false;
  }

  return true;
};

/**
 * Filter a list of albums to only include "real albums"
 */
export const filterRealAlbums = (albums: SimplifiedAlbum[]): SimplifiedAlbum[] => {
  return albums.filter(isRealAlbum);
};
```

---

## 6. API Endpoints

### 6.1 GET /api/backlog

**File:** `server/api/backlog/index.get.ts`

```typescript
import type { GetBacklogResponse, BacklogAlbum, BacklogArtist } from '#shared/schema';
import { BacklogService } from '../../services/backlog.service';

export default defineEventHandler<Promise<GetBacklogResponse>>(async (event) => {
  const { userId } = event.context;
  const service = new BacklogService();

  const backlogItems = await service.getBacklog(userId);

  // Separate albums and artists
  const albums: BacklogAlbum[] = [];
  const artists: BacklogArtist[] = [];

  for (const item of backlogItems) {
    if (item.type === 'album') {
      albums.push({
        id: item.id,
        spotifyId: item.spotifyId,
        name: item.name,
        imageUrl: item.imageUrl,
        artistNames: item.artistNames,
        addedAt: item.addedAt.toISOString(),
      });
    } else {
      artists.push({
        id: item.id,
        spotifyId: item.spotifyId,
        name: item.name,
        imageUrl: item.imageUrl,
        addedAt: item.addedAt.toISOString(),
      });
    }
  }

  return {
    albums,
    artists,
  };
});
```

### 6.2 POST /api/backlog

**File:** `server/api/backlog/index.post.ts`

```typescript
import type { AddBacklogItemBody, AddBacklogItemResponse } from '#shared/schema';
import { BacklogService } from '../../services/backlog.service';

export default defineEventHandler<Promise<AddBacklogItemResponse>>(async (event) => {
  const { userId } = event.context;
  const body = await readBody<AddBacklogItemBody>(event);

  const service = new BacklogService();

  const item = await service.addBacklogItem(userId, body);

  return {
    id: item.id,
    type: item.type,
    spotifyId: item.spotifyId,
    name: item.name,
    imageUrl: item.imageUrl,
    artistNames: item.artistNames,
    addedAt: item.addedAt.toISOString(),
  };
});
```

### 6.3 DELETE /api/backlog/[id]

**File:** `server/api/backlog/[id].delete.ts`

```typescript
import { BacklogService } from '../../services/backlog.service';

export default defineEventHandler(async (event) => {
  const { userId } = event.context;
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Item ID is required',
    });
  }

  const service = new BacklogService();
  await service.removeBacklogItem(userId, id);

  return { success: true };
});
```

---

## 7. Integration with Existing Listen Tracking

**File:** `server/services/dailyListen.service.ts`

Modify the `addAlbumListen` method to trigger backlog cleanup:

```typescript
async addAlbumListen(userId: string, body: AddAlbumListenBody) {
  const dateOfListens = new Date(body.date);

  await this.dailyListenRepo.saveListens(
    userId,
    [this.mapAddAlbumBody(body)],
    dateOfListens,
  );

  // Trigger backlog cleanup
  const userRepo = new UserRepository();
  const user = await userRepo.getUser(userId);

  if (user && user.accounts[0]) {
    const backlogCleanup = new BacklogCleanupService();

    // Extract artist IDs from the album (would need to fetch from Spotify or store)
    // For now, just cleanup the album
    await backlogCleanup.cleanupListenedAlbum(userId, body.album.albumId);
  }
}
```

**File:** `server/services/recentlyPlayed.service.ts`

Modify the `processTodaysListens` method:

```typescript
async processTodaysListens({ id: userId, auth }: UserWithAuthTokens) {
  const todaysListens = await this.getTodaysFullListens(auth);

  if (!todaysListens.length) {
    console.debug('No finished albums found today.');
    return;
  }

  const result = await this.dailyListenRepo.saveListens(userId, todaysListens);

  // Trigger backlog cleanup for each listened album
  const backlogCleanup = new BacklogCleanupService();

  for (const listen of todaysListens) {
    await backlogCleanup.cleanupListenedAlbum(userId, listen.albumId);
  }

  return result;
}
```

---

## 8. Frontend Implementation

### 8.1 Composables

**File:** `app/composables/api/useBacklog.ts`

```typescript
import type { GetBacklogResponse } from '#shared/schema';

export const useBacklog = () => {
  return useFetch<GetBacklogResponse>('/api/backlog', {
    key: 'backlog',
  });
};
```

**File:** `app/composables/api/useAddToBacklog.ts`

```typescript
import type { AddBacklogItemBody, AddBacklogItemResponse } from '#shared/schema';

export const useAddToBacklog = () => {
  const add = async (item: AddBacklogItemBody) => {
    return await $fetch<AddBacklogItemResponse>('/api/backlog', {
      method: 'POST',
      body: item,
    });
  };

  const remove = async (id: string) => {
    return await $fetch(`/api/backlog/${id}`, {
      method: 'DELETE',
    });
  };

  return {
    add,
    remove,
  };
};
```

**File:** `app/composables/api/useSpotifyArtistSearch.ts`

```typescript
import type { SearchResults } from '@spotify/web-api-ts-sdk';
import { ref } from 'vue';

const SEARCH_LIMIT = 5;

export type ArtistSearchResult = SearchResults<['artist']>['artists']['items'][number];

export const useSpotifyArtistSearch = () => {
  const searchQuery = ref('');
  const searchResults = ref<ArtistSearchResult[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  let debounceTimeout: NodeJS.Timeout | null = null;

  const performSearch = async (query: string) => {
    if (!query.trim()) {
      searchResults.value = [];
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      const api = await useSpotifyApi();

      if (!api) {
        return;
      }

      const data = await api.search(query, ['artist'], undefined, SEARCH_LIMIT);
      searchResults.value = data.artists?.items || [];
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Search failed';
      searchResults.value = [];
    } finally {
      loading.value = false;
    }
  };

  const debouncedSearch = (query: string) => {
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }

    searchQuery.value = query;

    if (!query.trim()) {
      searchResults.value = [];
      return;
    }

    debounceTimeout = setTimeout(() => {
      performSearch(query);
    }, 500);
  };

  return {
    searchQuery,
    searchResults,
    loading,
    error,
    search: debouncedSearch,
  };
};
```

### 8.2 Backlog Page

**File:** `app/pages/backlog.vue`

```vue
<script setup lang="ts">
import { ref } from 'vue';

const { data: backlog, pending, error, refresh } = useBacklog();
const { remove } = useAddToBacklog();

const showAddModal = ref(false);
const addType = ref<'album' | 'artist'>('album');

const handleRemove = async (id: string) => {
  await remove(id);
  await refresh();
};

const openAddModal = (type: 'album' | 'artist') => {
  addType.value = type;
  showAddModal.value = true;
};
</script>

<template>
  <div class="backlog-page">
    <header class="header">
      <h1>My Backlog</h1>
      <div class="actions">
        <button @click="openAddModal('album')" class="add-button">
          + Add Album
        </button>
        <button @click="openAddModal('artist')" class="add-button">
          + Add Artist
        </button>
      </div>
    </header>

    <main class="content">
      <div v-if="pending" class="loading">Loading...</div>
      <div v-else-if="error" class="error">Error: {{ error }}</div>
      <div v-else-if="!backlog || (backlog.albums.length === 0 && backlog.artists.length === 0)" class="empty">
        No items in your backlog yet. Add some albums or artists to get started!
      </div>

      <div v-else>
        <!-- Albums Section -->
        <section v-if="backlog.albums.length > 0" class="backlog-section">
          <h2>Albums</h2>
          <div class="backlog-grid">
            <div
              v-for="album in backlog.albums"
              :key="album.id"
              class="backlog-item"
            >
              <img
                v-if="album.imageUrl"
                :src="album.imageUrl"
                :alt="album.name"
                class="item-image"
              />
              <div class="item-info">
                <h3>{{ album.name }}</h3>
                <p v-if="album.artistNames" class="artist">{{ album.artistNames }}</p>
              </div>
              <button @click="handleRemove(album.id)" class="remove-button">
                Remove
              </button>
            </div>
          </div>
        </section>

        <!-- Artists Section -->
        <section v-if="backlog.artists.length > 0" class="backlog-section">
          <h2>Artists</h2>
          <div class="backlog-grid">
            <div
              v-for="artist in backlog.artists"
              :key="artist.id"
              class="backlog-item"
            >
              <img
                v-if="artist.imageUrl"
                :src="artist.imageUrl"
                :alt="artist.name"
                class="item-image"
              />
              <div class="item-info">
                <h3>{{ artist.name }}</h3>
              </div>
              <button @click="handleRemove(artist.id)" class="remove-button">
                Remove
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>

    <!-- Add to Backlog Modal -->
    <Teleport to="body">
      <Modal v-if="showAddModal" @close="showAddModal = false">
        <BacklogAddModal
          :type="addType"
          @added="() => { showAddModal = false; refresh(); }"
          @close="showAddModal = false"
        />
      </Modal>
    </Teleport>
  </div>
</template>

<style scoped>
/* Styling following existing patterns */
.backlog-page {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
}

.actions {
  display: flex;
  gap: 12px;
}

.add-button {
  padding: 12px 24px;
  background-color: #1db954;
  color: white;
  border: none;
  border-radius: 24px;
  cursor: pointer;
  font-weight: 600;
}

.backlog-section {
  margin-bottom: 48px;
}

.backlog-section h2 {
  margin-bottom: 24px;
  font-size: 24px;
}

.backlog-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 24px;
}

.backlog-item {
  background-color: #282828;
  padding: 16px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.item-image {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: 4px;
}

.remove-button {
  padding: 8px 16px;
  background-color: #e22134;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
</style>
```

### 8.3 Backlog Add Modal Component

**File:** `app/components/BacklogAddModal.vue`

```vue
<script setup lang="ts">
import { ref } from 'vue';
import type { BacklogType } from '#shared/schema';

const props = defineProps<{
  type: BacklogType;
}>();

const emit = defineEmits<{
  added: [];
  close: [];
}>();

const { add } = useAddToBacklog();
const albumSearch = useSpotifyAlbumSearch();
const artistSearch = useSpotifyArtistSearch();

const isAlbum = computed(() => props.type === 'album');
const search = computed(() => isAlbum.value ? albumSearch : artistSearch);

const handleAdd = async (item: any) => {
  try {
    await add({
      type: props.type,
      spotifyId: item.id,
      name: item.name,
      imageUrl: isAlbum.value ? item.images[0]?.url : item.images?.[0]?.url,
      artistNames: isAlbum.value ? item.artists.map((a: any) => a.name).join(', ') : undefined,
    });

    emit('added');
  } catch (error) {
    console.error('Error adding to backlog:', error);
  }
};
</script>

<template>
  <div class="backlog-add-modal">
    <h2>Add {{ type === 'album' ? 'Album' : 'Artist' }} to Backlog</h2>

    <input
      type="text"
      :placeholder="`Search for ${type}...`"
      @input="search.search($event.target.value)"
      class="search-input"
    />

    <div v-if="search.loading.value" class="loading">Searching...</div>

    <div v-else-if="search.searchResults.value.length > 0" class="results">
      <div
        v-for="result in search.searchResults.value"
        :key="result.id"
        class="result-item"
        @click="handleAdd(result)"
      >
        <img
          v-if="result.images?.[0]"
          :src="result.images[0].url"
          :alt="result.name"
          class="result-image"
        />
        <div class="result-info">
          <h3>{{ result.name }}</h3>
          <p v-if="isAlbum && result.artists">
            {{ result.artists.map(a => a.name).join(', ') }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.backlog-add-modal {
  padding: 24px;
  background-color: #282828;
  border-radius: 8px;
  min-width: 500px;
}

.search-input {
  width: 100%;
  padding: 12px;
  margin: 16px 0;
  border: 1px solid #404040;
  border-radius: 4px;
  background-color: #181818;
  color: white;
}

.results {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 400px;
  overflow-y: auto;
}

.result-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  background-color: #181818;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.result-item:hover {
  background-color: #282828;
}

.result-image {
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: 4px;
}
</style>
```

---

## 9. CRON Job for Future Listen Generation

### New Task: Generate Future Listens

**File:** `server/tasks/generateFutureListens.ts`

```typescript
import { UserService } from '../services/user.service';
import { BacklogService } from '../services/backlog.service';
import { DailyListenRepository } from '../repositories/dailyListen.repository';

export default defineTask({
  meta: {
    name: 'generateFutureListens',
    description: 'Generate future listen suggestions from backlog',
  },
  run: async () => {
    console.log('Running future listens generation task...');

    const userService = new UserService();
    const users = await userService.fetchUsersForRecentlyPlayedProcessing();

    if (!users.length) {
      return { result: 'No users to process' };
    }

    const backlogService = new BacklogService();
    const dailyListenRepo = new DailyListenRepository();

    for (const user of users) {
      try {
        // Get a suggestion from the user's backlog
        const suggestion = await backlogService.getRandomSuggestion(
          user.id,
          user.auth
        );

        if (suggestion) {
          // Find the next empty future day
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const nextWeek = new Date(today);
          nextWeek.setDate(today.getDate() + 7);

          const existingListens = await dailyListenRepo.getListens(
            user.id,
            today,
            nextWeek
          );

          // Find first day without any albums
          let targetDate = new Date(today);
          targetDate.setDate(targetDate.getDate() + 1); // Start from tomorrow

          while (targetDate <= nextWeek) {
            const hasListen = existingListens.some(
              listen => listen.date.toDateString() === targetDate.toDateString()
            );

            if (!hasListen) {
              // Found an empty day, assign the suggestion
              await dailyListenRepo.saveListens(
                user.id,
                [{
                  albumId: suggestion.albumId,
                  albumName: suggestion.albumName,
                  artistNames: suggestion.artistNames,
                  imageUrl: suggestion.imageUrl,
                  listenOrder: 'ordered',
                  listenMethod: 'spotify',
                  listenTime: null,
                }],
                targetDate
              );

              console.log(
                `Assigned ${suggestion.albumName} to ${targetDate.toDateString()} for user ${user.id}`
              );
              break;
            }

            targetDate.setDate(targetDate.getDate() + 1);
          }
        }
      } catch (error) {
        console.error(`Error processing user ${user.id}:`, error);
      }
    }

    return { result: 'Finished generating future listens' };
  },
});
```

### Register Task in nuxt.config.ts

```typescript
nitro: {
  scheduledTasks: {
    '0 * * * *': ['processListens'],
    '0 0 * * *': ['generateFutureListens'], // Run daily at midnight
  },
  experimental: {
    tasks: true,
  },
},
```

---

## 10. Testing Strategy

### 10.1 Test Factories

**File:** `tests/factories/backlog.factory.ts`

```typescript
import { faker } from '@faker-js/faker';
import type { BacklogItem, BacklogType } from '@prisma/client';
import { createFactory } from './factory';

const { string: { uuid }, date, music } = faker;

export const backlogItem = createFactory<BacklogItem>(() => ({
  id: uuid(),
  userId: uuid(),
  type: 'album' as BacklogType,
  spotifyId: uuid(),
  name: music.album(),
  imageUrl: faker.image.url(),
  artistNames: music.artist(),
  addedAt: date.recent(),
  createdAt: date.recent(),
  updatedAt: date.recent(),
}));
```

### 10.2 Unit Tests

**File:** `server/utils/albums.utils.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { isRealAlbum, filterRealAlbums } from './albums.utils';
import { simplifiedAlbum } from '~~/tests/factories/spotify.factory';

describe('isRealAlbum', () => {
  it('returns true for albums with 5+ tracks', () => {
    const album = simplifiedAlbum({ total_tracks: 10, album_type: 'album' });
    expect(isRealAlbum(album)).toBe(true);
  });

  it('returns false for singles', () => {
    const album = simplifiedAlbum({ total_tracks: 3, album_type: 'single' });
    expect(isRealAlbum(album)).toBe(false);
  });

  it('returns false for compilations', () => {
    const album = simplifiedAlbum({ total_tracks: 15, album_type: 'compilation' });
    expect(isRealAlbum(album)).toBe(false);
  });

  it('returns false for albums with less than 5 tracks', () => {
    const album = simplifiedAlbum({ total_tracks: 4, album_type: 'album' });
    expect(isRealAlbum(album)).toBe(false);
  });
});
```

**File:** `server/services/backlog.service.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { BacklogService } from './backlog.service';
import { BacklogRepository } from '../repositories/backlog.repository';

vi.mock('../repositories/backlog.repository');

describe('BacklogService', () => {
  it('should get backlog items for a user', async () => {
    const mockItems = [
      { id: '1', type: 'album', name: 'Test Album' },
    ];

    const mockRepo = {
      getBacklogItems: vi.fn().mockResolvedValue(mockItems),
    };

    const service = new BacklogService(mockRepo as any);
    const result = await service.getBacklog('user123');

    expect(result).toEqual(mockItems);
    expect(mockRepo.getBacklogItems).toHaveBeenCalledWith('user123');
  });

  // Add more unit tests...
});
```

### 10.3 Integration Tests

**File:** `server/repositories/backlog.repository.integration.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { BacklogRepository } from './backlog.repository';
import { setupTestDatabase, cleanupTestDatabase } from '~~/tests/setup';

describe('BacklogRepository Integration', () => {
  let repo: BacklogRepository;

  beforeEach(async () => {
    await setupTestDatabase();
    repo = new BacklogRepository();
  });

  afterEach(async () => {
    await cleanupTestDatabase();
  });

  it('should create and retrieve backlog items', async () => {
    const item = await repo.createBacklogItem({
      userId: 'test-user',
      type: 'album',
      spotifyId: 'spotify-123',
      name: 'Test Album',
      imageUrl: 'http://example.com/image.jpg',
      artistNames: 'Test Artist',
    });

    expect(item).toBeDefined();
    expect(item.id).toBeDefined();

    const items = await repo.getBacklogItems('test-user');
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe('Test Album');
  });

  it('should delete backlog items', async () => {
    const item = await repo.createBacklogItem({
      userId: 'test-user',
      type: 'album',
      spotifyId: 'spotify-123',
      name: 'Test Album',
    });

    await repo.deleteBacklogItem(item.id, 'test-user');

    const items = await repo.getBacklogItems('test-user');
    expect(items).toHaveLength(0);
  });

  // Add more integration tests...
});
```

---

## 11. Implementation Phases

### Phase 1: Database and Repository Layer
1. Create Prisma schema changes
2. Run migrations
3. Implement BacklogRepository
4. Write integration tests for repository

### Phase 2: Service Layer
1. Implement BacklogService
2. Implement BacklogCleanupService
3. Add album filtering utilities
4. Write unit tests for services

### Phase 3: API Endpoints
1. Implement GET /api/backlog
2. Implement POST /api/backlog
3. Implement DELETE /api/backlog/:id
4. Test endpoints manually

### Phase 4: Integration with Existing Features
1. Modify DailyListenService to trigger cleanup
2. Modify RecentlyPlayedService to trigger cleanup
3. Test cleanup logic

### Phase 5: Frontend - Composables
1. Create useBacklog composable
2. Create useAddToBacklog composable
3. Create useSpotifyArtistSearch composable
4. Write unit tests for composables

### Phase 6: Frontend - UI Components
1. Create Backlog page
2. Create BacklogAddModal component
3. Style components following existing patterns
4. Add navigation to backlog page

### Phase 7: Future Listen Generation
1. Implement generateFutureListens task
2. Register task in nuxt.config.ts
3. Test CRON job manually
4. Monitor in production

### Phase 8: Testing and Polish
1. End-to-end testing
2. Edge case handling
3. Error handling improvements
4. Performance optimization

---

## 12. Edge Cases and Considerations

### Edge Cases to Handle:

1. **Empty Backlog**: When backlog is empty, future listen generation should gracefully skip
2. **Spotify API Limits**: Handle rate limiting when fetching artist albums
3. **Duplicate Prevention**: Unique constraint on userId + spotifyId + type prevents duplicates
4. **Artist with No Albums**: Handle artists with no "real albums" after filtering
5. **Concurrent Requests**: Handle race conditions when adding/removing items
6. **Token Expiration**: Handle expired Spotify tokens gracefully
7. **Deleted Artists/Albums**: Handle cases where Spotify content is no longer available

### Performance Considerations:

1. **Batch Processing**: Process multiple users in parallel in CRON jobs
2. **Index Optimization**: Database indexes on frequently queried fields
3. **Caching**: Consider caching artist album lists to reduce Spotify API calls
4. **Pagination**: If backlog grows large, implement pagination on frontend

### Security Considerations:

1. **User Isolation**: All queries filtered by userId to prevent cross-user access
2. **Input Validation**: Validate all user inputs on API endpoints
3. **Rate Limiting**: Consider rate limiting backlog additions
4. **Cascade Deletes**: User deletion properly cascades to backlog items

---

## 13. Critical Files Summary

### ✅ Files Completed:
- ✅ `server/repositories/backlog.repository.ts` - With bulk operations support
- ✅ `server/services/backlog.service.ts` - With bulk add/delete methods
- ✅ `server/services/backlogCleanup.service.ts` - Simplified for albums-only
- ✅ `prisma/schema.prisma` - Updated BacklogItem model (albums-only)
- ✅ `shared/schema.ts` - Updated backlog types and API contracts
- ✅ `server/utils/albums.utils.ts` - Added isRealAlbum and filterRealAlbums
- ✅ `docker-compose.yml` - Added port mapping for test database

### ⏸️ Files On Hold (Being worked on separately):
- `server/api/backlog/index.get.ts`
- `server/api/backlog/index.post.ts` (bulk endpoint)
- `server/api/backlog/[id].delete.ts`

### 🔲 Files To Create:
- `server/tasks/generateFutureListens.ts`
- `app/pages/backlog.vue`
- `app/components/BacklogAddModal.vue`
- `app/composables/api/useBacklog.ts`
- `app/composables/api/useAddToBacklog.ts`
- `app/composables/api/useSpotifyArtistSearch.ts`
- `app/composables/api/useSpotifyArtistAlbums.ts` (new - for fetching albums)
- `tests/factories/backlog.factory.ts`
- `server/utils/albums.utils.test.ts`
- `server/services/backlog.service.test.ts`
- `server/repositories/backlog.repository.integration.ts`

### 🔲 Files To Modify:
- `server/services/dailyListen.service.ts` - Add backlog cleanup integration
- `server/services/recentlyPlayed.service.ts` - Add backlog cleanup integration
- `nuxt.config.ts` - Register generateFutureListens CRON job

---

## Summary of Completed Work

**Phases 1-4 Complete (Database, Types, Repository, Services):**

✅ **Database Schema** - Simplified to albums-only with artist context tracking
✅ **Shared Types** - Updated with bulk operations support and duplicate tracking
✅ **Repository Layer** - Implemented with bulk insert/delete using Prisma's `createMany` and `skipDuplicates`
✅ **Service Layer** - BacklogService with bulk operations, BacklogCleanupService for integration
✅ **Album Utilities** - Filtering functions for "real albums" (excludes singles/compilations)

**Key Features Implemented:**
- Bulk add albums with duplicate detection
- Bulk delete albums by IDs
- Artist context tracking (optional `addedFromArtistId` field)
- Efficient Prisma operations with `skipDuplicates`
- Album filtering utilities for frontend use

**Next Steps:**
- API endpoints (being handled separately)
- Integration with listen tracking services
- Frontend implementation
- CRON job for future listen generation
- Testing suite
