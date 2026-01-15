# DailyListen Schema Update Plan

## Overview

**GitHub Issue:** [#38 - Update DailyListen db schema](https://github.com/JoshPav/daily-spin/issues/38)

This plan addresses updating the `DailyListen` and `AlbumListen` database tables to:
1. Use normalized tables (link `AlbumListen` to the existing `Album` table) instead of storing denormalized data
2. Use consistent `snake_case` table names via `@@map()` directives
3. Migrate existing data safely using a "create new table, migrate data, remove old" approach

## Current State

### Current Schema Issues

**AlbumListen stores denormalized data:**
```prisma
model AlbumListen {
  albumId       String       // Spotify album ID (not a FK)
  albumName     String       // Denormalized
  artistNames   String       // Denormalized (comma-separated string)
  imageUrl      String       // Denormalized
  // ... metadata fields
}
```

**Tables missing snake_case mapping:**
- `DailyListen` → should be `daily_listen`
- `AlbumListen` → should be `album_listen`

**Normalized tables already exist** (used by backlog feature):
- `Album` (`album`) - with `spotifyId`, `name`, `imageUrl`, etc.
- `Artist` (`artist`) - with `spotifyId`, `name`, `imageUrl`
- `AlbumArtist` (`album_artist`) - join table with artist order

## Target State

### New Schema Structure

```prisma
model DailyListen {
  id        String        @id @default(cuid())
  userId    String
  date      DateTime      @db.Date
  albums    AlbumListen[]
  createdAt DateTime      @default(now())
  updatedAt DateTime      @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, date])
  @@index([userId])
  @@index([date])
  @@map("daily_listen")  // NEW: snake_case table name
}

model AlbumListen {
  id            String       @id @default(cuid())
  dailyListenId String
  albumId       String       // NOW: FK to Album.id (not Spotify ID)
  listenOrder   ListenOrder  @default(ordered)
  listenMethod  ListenMethod @default(spotify)
  listenTime    ListenTime?
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt

  dailyListen DailyListen @relation(fields: [dailyListenId], references: [id], onDelete: Cascade)
  album       Album       @relation(fields: [albumId], references: [id], onDelete: Cascade)  // NEW

  @@unique([dailyListenId, albumId])
  @@index([dailyListenId])
  @@index([albumId])
  @@map("album_listen")  // NEW: snake_case table name
}

// Album model needs updated relation
model Album {
  // ... existing fields ...
  listens      AlbumListen[]  // NEW: relation to album listens
}
```

### Key Changes Summary

| Change | Before | After |
|--------|--------|-------|
| DailyListen table name | `DailyListen` | `daily_listen` |
| AlbumListen table name | `AlbumListen` | `album_listen` |
| AlbumListen.albumId | Spotify ID (string) | FK to Album.id |
| AlbumListen.albumName | Stored | Removed (via Album relation) |
| AlbumListen.artistNames | Stored | Removed (via Album→AlbumArtist→Artist) |
| AlbumListen.imageUrl | Stored | Removed (via Album relation) |

---

## Implementation Status

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Database Schema Migration | 🔲 Not Started |
| 2 | Repository Layer Updates | 🔲 Not Started |
| 3 | Service Layer Updates | 🔲 Not Started |
| 4 | Mapper Updates | 🔲 Not Started |
| 5 | Test Infrastructure Updates | 🔲 Not Started |
| 6 | Integration Tests Updates | 🔲 Not Started |
| 7 | Data Migration Script | 🔲 Not Started |
| 8 | Cleanup Old Tables | 🔲 Not Started |

---

## Phase 1: Database Schema Migration

### Strategy: Shadow Table Approach

Following the issue's recommendation, we'll use a "create new, migrate, remove old" approach:

1. Create new tables with correct schema
2. Run data migration to populate new tables
3. Update application code to use new tables
4. Remove old tables

### Step 1.1: Create New Tables

Add new models to `prisma/schema.prisma`:

```prisma
// NEW normalized tables (temporary names during migration)
model DailyListenNew {
  id        String           @id @default(cuid())
  userId    String
  date      DateTime         @db.Date
  albums    AlbumListenNew[]
  createdAt DateTime         @default(now())
  updatedAt DateTime         @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, date])
  @@index([userId])
  @@index([date])
  @@map("daily_listen")
}

model AlbumListenNew {
  id            String       @id @default(cuid())
  dailyListenId String
  albumId       String       // FK to Album.id
  listenOrder   ListenOrder  @default(ordered)
  listenMethod  ListenMethod @default(spotify)
  listenTime    ListenTime?
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt

  dailyListen DailyListenNew @relation(fields: [dailyListenId], references: [id], onDelete: Cascade)
  album       Album          @relation(fields: [albumId], references: [id], onDelete: Cascade)

  @@unique([dailyListenId, albumId])
  @@index([dailyListenId])
  @@index([albumId])
  @@map("album_listen")
}
```

### Step 1.2: Update Album Model

Add relation to Album:

```prisma
model Album {
  // ... existing fields ...
  listens AlbumListenNew[]  // Add this relation
}
```

### Step 1.3: Apply Schema Changes

```bash
bun run db:migrate  # Create migration for new tables
```

---

## Phase 2: Repository Layer Updates

### File: `server/repositories/dailyListen.repository.ts`

### Step 2.1: Update Type Definitions

**Current:**
```typescript
export type AlbumListen = {
  albumId: string;
  albumName: string;
  artistNames: string;
  imageUrl: string;
  listenOrder?: ListenOrder;
  listenMethod?: ListenMethod;
  listenTime?: ListenTime | null;
};
```

**New:**
```typescript
export type AlbumListenInput = {
  albumId: string;        // Now FK to Album.id
  listenOrder?: ListenOrder;
  listenMethod?: ListenMethod;
  listenTime?: ListenTime | null;
};

// For creating albums when they don't exist
export type AlbumData = {
  spotifyId: string;
  name: string;
  imageUrl: string | null;
  artists: Array<{
    spotifyId: string;
    name: string;
    imageUrl?: string | null;
  }>;
};
```

### Step 2.2: Update `getListens()` Method

**Current:**
```typescript
getListens: async (userId: string, startDate: Date, endDate: Date) => {
  return prisma.dailyListen.findMany({
    where: { userId, date: { gte: startDate, lte: endDate } },
    include: { albums: true },
    orderBy: { date: 'asc' },
  });
}
```

**New:**
```typescript
getListens: async (userId: string, startDate: Date, endDate: Date) => {
  return prisma.dailyListenNew.findMany({
    where: { userId, date: { gte: startDate, lte: endDate } },
    include: {
      albums: {
        include: {
          album: {
            include: {
              artists: {
                include: { artist: true },
                orderBy: { order: 'asc' },
              },
            },
          },
        },
      },
    },
    orderBy: { date: 'asc' },
  });
}
```

### Step 2.3: Update `saveListens()` Method

The method needs to:
1. Find or create Album records (with artists)
2. Create AlbumListen records with Album FK

**New logic pattern:**
```typescript
saveListens: async (userId: string, date: Date, albums: AlbumListenWithData[]) => {
  // For each album:
  // 1. Upsert Album by spotifyId (reuse backlog's findOrCreateAlbum pattern)
  // 2. Create AlbumListen with albumId = Album.id

  return prisma.dailyListenNew.upsert({
    where: { userId_date: { userId, date } },
    create: {
      userId,
      date,
      albums: {
        create: await Promise.all(albums.map(async (album) => {
          const dbAlbum = await findOrCreateAlbum(album.albumData);
          return {
            albumId: dbAlbum.id,
            listenOrder: album.listenOrder,
            listenMethod: album.listenMethod,
            listenTime: album.listenTime,
          };
        })),
      },
    },
    update: {
      albums: {
        upsert: await Promise.all(albums.map(async (album) => {
          const dbAlbum = await findOrCreateAlbum(album.albumData);
          return {
            where: { dailyListenId_albumId: { dailyListenId: existingId, albumId: dbAlbum.id } },
            create: { ... },
            update: { ... },
          };
        })),
      },
    },
  });
}
```

### Step 2.4: Reuse/Extract `findOrCreateAlbum`

The backlog repository already has this logic at `server/repositories/backlog.repository.ts:88-133`.

**Options:**
1. Extract to shared utility in `server/repositories/album.repository.ts`
2. Import directly from backlog repository

**Recommended:** Create `server/repositories/album.repository.ts` with shared logic.

---

## Phase 3: Service Layer Updates

### File: `server/services/dailyListen.service.ts`

### Step 3.1: Update `mapAddAlbumBody()`

**Current:**
```typescript
const mapAddAlbumBody = (body: AddAlbumListenBody): AlbumListen => ({
  albumId: body.albumId,
  albumName: body.albumName,
  artistNames: body.artistNames,
  imageUrl: body.imageUrl,
  listenOrder: body.listenOrder,
  listenMethod: body.listenMethod,
  listenTime: body.listenTime,
});
```

**New:**
```typescript
const mapAddAlbumBody = (body: AddAlbumListenBody): AlbumListenWithData => ({
  albumData: {
    spotifyId: body.albumId,  // body.albumId is Spotify ID from frontend
    name: body.albumName,
    imageUrl: body.imageUrl,
    artists: parseArtistNames(body.artistNames),  // Need to handle this
  },
  listenOrder: body.listenOrder,
  listenMethod: body.listenMethod,
  listenTime: body.listenTime,
});
```

**Challenge:** `artistNames` is a comma-separated string. Without Spotify IDs for individual artists, we need to either:
1. Update the API contract to accept artist objects with IDs
2. Create artists by name only (less ideal - no Spotify linking)
3. Fetch artist details from Spotify API when logging manually

**Recommended:** Update `AddAlbumListenBody` to include artist details (Phase 3.2).

### Step 3.2: Update API Types (shared/schema.ts)

**Current:**
```typescript
export type AddAlbumListenBody = {
  albumId: string;
  albumName: string;
  artistNames: string;  // Comma-separated
  imageUrl: string;
  // ... metadata
};
```

**New:**
```typescript
export type AddAlbumListenBody = {
  albumId: string;      // Spotify album ID
  albumName: string;
  artists: Array<{
    spotifyId: string;
    name: string;
    imageUrl?: string;
  }>;
  imageUrl: string;
  // ... metadata
};
```

### Step 3.3: Update Frontend Composable

**File:** `app/composables/api/useLogAlbum.ts`

Update to send artist objects instead of comma-separated string.

---

### File: `server/services/recentlyPlayed.service.ts`

### Step 3.4: Update `processGroupedTracks()`

**Current:** Returns denormalized album data:
```typescript
return {
  albumId: album.id,
  albumName: album.name,
  artistNames: album.artists.map((a) => a.name).join(', '),
  imageUrl: getAlbumImage(album),
  // ...
};
```

**New:** Return album data structure:
```typescript
return {
  albumData: {
    spotifyId: album.id,
    name: album.name,
    imageUrl: getAlbumImage(album),
    artists: album.artists.map((a) => ({
      spotifyId: a.id,
      name: a.name,
      // Note: Simplified album objects don't include artist images
    })),
  },
  listenOrder: listenedInOrder ? ListenOrder.ordered : ListenOrder.shuffled,
  listenMethod: ListenMethod.spotify,
  listenTime: getListenTime(tracks[0].played_at),
};
```

---

## Phase 4: Mapper Updates

### File: `server/mappers/listenMapper.ts`

### Step 4.1: Update `mapDailyListens()`

**Current input type:**
```typescript
// AlbumListen with denormalized fields
{
  albumId, albumName, artistNames, imageUrl,
  listenOrder, listenMethod, listenTime
}
```

**New input type:**
```typescript
// AlbumListen with nested Album relation
{
  album: {
    spotifyId,
    name,
    imageUrl,
    artists: [{ order, artist: { spotifyId, name, imageUrl } }]
  },
  listenOrder, listenMethod, listenTime
}
```

**Updated mapper:**
```typescript
export const mapDailyListens = (dailyListen: DailyListenWithAlbums): DailyListens => ({
  date: dailyListen.date.toISOString(),
  albums: dailyListen.albums.map((albumListen) => ({
    album: {
      albumId: albumListen.album.spotifyId,
      albumName: albumListen.album.name,
      artistNames: albumListen.album.artists
        .sort((a, b) => a.order - b.order)
        .map((aa) => aa.artist.name)
        .join(', '),
      imageUrl: albumListen.album.imageUrl ?? '',
    },
    listenMetadata: {
      listenOrder: albumListen.listenOrder,
      listenMethod: albumListen.listenMethod,
      listenTime: albumListen.listenTime,
    },
  })),
});
```

**Key Point:** API response structure remains unchanged - normalization is transparent to frontend.

---

## Phase 5: Test Infrastructure Updates

### Step 5.1: Update Factories

**File:** `tests/factories/prisma.factory.ts`

**Update `albumListenInput()`:**
```typescript
export const albumListenInput = createFactory<AlbumListenInput>({
  albumId: string.uuid(),  // Now expects Album.id, not Spotify ID
  listenOrder: ListenOrder.ordered,
  listenMethod: ListenMethod.spotify,
  listenTime: ListenTime.morning,
});

// New factory for album data
export const albumData = createFactory<AlbumData>({
  spotifyId: string.alphanumeric(22),
  name: music.album(),
  imageUrl: image.url(),
  artists: [
    {
      spotifyId: string.alphanumeric(22),
      name: music.artist(),
    },
  ],
});
```

### Step 5.2: Update Test Helpers

**File:** `tests/db/utils.ts`

**Update `createDailyListens()`:**
```typescript
export async function createDailyListens({
  userId,
  date,
  albumListen,
  albumListens,
}: {
  userId: string;
  date: Date;
  albumListen?: AlbumListenWithData;
  albumListens?: AlbumListenWithData[];
}) {
  const albums = albumListens ?? (albumListen ? [albumListen] : []);

  // Create albums first
  const albumRecords = await Promise.all(
    albums.map((a) => createAlbumWithArtists(a.albumData))
  );

  // Then create daily listen with album IDs
  return prisma.dailyListenNew.create({
    data: {
      userId,
      date,
      albums: {
        create: albums.map((a, i) => ({
          albumId: albumRecords[i].id,
          listenOrder: a.listenOrder,
          listenMethod: a.listenMethod,
          listenTime: a.listenTime,
        })),
      },
    },
    include: { albums: { include: { album: true } } },
  });
}
```

---

## Phase 6: Integration Tests Updates

### Files to Update

1. `server/api/listens.get.integration.ts`
2. `server/api/listens.post.integration.ts`
3. `server/mappers/listenMapper.test.ts`

### Key Changes

- Update `getExpectedAlbum()` helper to work with new factory structure
- Update test setup to create Album/Artist records before AlbumListen
- Update mock Spotify responses if needed
- Verify API response structure remains unchanged

---

## Phase 7: Data Migration Script

### Step 7.1: Create Migration Script

**File:** `prisma/migrations/migrate-daily-listens.ts`

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateDailyListens() {
  // 1. Get all existing DailyListen records with albums
  const oldListens = await prisma.dailyListen.findMany({
    include: { albums: true },
  });

  console.log(`Found ${oldListens.length} daily listens to migrate`);

  for (const oldListen of oldListens) {
    // 2. Create or find albums
    for (const oldAlbum of oldListen.albums) {
      // Find or create Album by spotifyId (albumId in old schema)
      const album = await prisma.album.upsert({
        where: { spotifyId: oldAlbum.albumId },
        create: {
          spotifyId: oldAlbum.albumId,
          name: oldAlbum.albumName,
          imageUrl: oldAlbum.imageUrl,
          // Note: Can't recover individual artists from comma-separated string
          // Will need to fetch from Spotify API or leave artists empty
        },
        update: {},
      });

      // 3. Create new DailyListenNew with AlbumListenNew
      await prisma.dailyListenNew.upsert({
        where: { userId_date: { userId: oldListen.userId, date: oldListen.date } },
        create: {
          userId: oldListen.userId,
          date: oldListen.date,
          createdAt: oldListen.createdAt,
          updatedAt: oldListen.updatedAt,
          albums: {
            create: {
              albumId: album.id,
              listenOrder: oldAlbum.listenOrder,
              listenMethod: oldAlbum.listenMethod,
              listenTime: oldAlbum.listenTime,
              createdAt: oldAlbum.createdAt,
              updatedAt: oldAlbum.updatedAt,
            },
          },
        },
        update: {
          albums: {
            create: {
              albumId: album.id,
              listenOrder: oldAlbum.listenOrder,
              listenMethod: oldAlbum.listenMethod,
              listenTime: oldAlbum.listenTime,
            },
          },
        },
      });
    }
  }

  console.log('Migration complete!');
}

migrateDailyListens()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

### Step 7.2: Artist Recovery (Optional Enhancement)

To properly populate artists during migration:

```typescript
// Fetch album details from Spotify to get proper artist data
async function enrichAlbumFromSpotify(spotifyId: string) {
  // Use Spotify API to fetch album details
  // Extract artists with their Spotify IDs
  // Create Artist and AlbumArtist records
}
```

---

## Phase 8: Cleanup Old Tables

### Step 8.1: Rename Models in Schema

After migration and code updates are verified working:

```prisma
// Rename DailyListenNew → DailyListen
// Rename AlbumListenNew → AlbumListen
// Remove old DailyListen and AlbumListen models
```

### Step 8.2: Create Final Migration

```bash
bun run db:migrate
```

This drops the old tables and renames the new ones.

### Step 8.3: Update All Code References

Change all references from `DailyListenNew`/`AlbumListenNew` back to `DailyListen`/`AlbumListen`.

---

## Impact Analysis

### Files Requiring Changes

| Category | File | Changes |
|----------|------|---------|
| **Schema** | `prisma/schema.prisma` | New tables, relations, @@map directives |
| **Repository** | `server/repositories/dailyListen.repository.ts` | Type definitions, query includes, save logic |
| **Repository** | `server/repositories/album.repository.ts` | NEW: shared findOrCreateAlbum |
| **Service** | `server/services/dailyListen.service.ts` | mapAddAlbumBody, type changes |
| **Service** | `server/services/recentlyPlayed.service.ts` | processGroupedTracks output |
| **Mapper** | `server/mappers/listenMapper.ts` | Extract data from relations |
| **Types** | `shared/schema.ts` | AddAlbumListenBody artists field |
| **Frontend** | `app/composables/api/useLogAlbum.ts` | Send artist objects |
| **Tests** | `tests/factories/prisma.factory.ts` | New factories |
| **Tests** | `tests/db/utils.ts` | createDailyListens helper |
| **Tests** | `server/api/listens.*.integration.ts` | Test setup and assertions |
| **Migration** | `prisma/migrations/migrate-daily-listens.ts` | NEW: data migration script |

### API Compatibility

- **GET /api/listens**: Response structure unchanged (transparent to frontend)
- **POST /api/listens**: Request body needs `artists` array instead of `artistNames` string

### Frontend Impact

- `useLogAlbum.ts`: Update to send artist objects
- All other components: No changes (consume same API response)

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Data loss during migration | High | Shadow table approach - old data preserved until verified |
| Artist data incomplete in migration | Medium | Option to enrich from Spotify API post-migration |
| API breaking change | Medium | Coordinate frontend/backend deployment |
| Test failures | Low | Update tests incrementally with each phase |

---

## Recommended Implementation Order

1. **Phase 1**: Create shadow tables with migration
2. **Phase 5**: Update test infrastructure first
3. **Phase 2**: Repository layer updates
4. **Phase 3**: Service layer updates
5. **Phase 4**: Mapper updates
6. **Phase 6**: Integration tests
7. **Phase 7**: Data migration script
8. **Deploy and verify**
9. **Phase 8**: Cleanup old tables

---

## Open Questions

1. **Artist recovery during migration**: Should we fetch from Spotify API to properly populate artist relations? Or accept that historical data will have albums without linked artists?

2. **Backwards compatibility period**: Should we support both old and new API formats during a transition period?

3. **AddAlbumListenBody change**: Is a breaking API change acceptable, or should we support both formats?
