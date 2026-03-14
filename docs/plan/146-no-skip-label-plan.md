# Plan: Add "No Skip" Label to Albums (Issue #146)

## Overview

Allow users to toggle a "No Skip" label on any album. The label is a **user ↔ album** relationship — marking an album "No Skip" once applies to every listen of that album, past and future. The badge shows wherever the album appears in listening history.

The implementation uses a new `UserNoSkipAlbum` join table (similar to `BacklogItem`), a dedicated toggle endpoint scoped to an album's Spotify ID, and `noSkip: boolean` computed and included in the existing listens response.

---

## Step 1: Database – New `UserNoSkipAlbum` model

**File:** `prisma/schema.prisma`

Add a new join table:

```prisma
model UserNoSkipAlbum {
  id        String   @id @default(cuid())
  userId    String
  albumId   String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  album Album @relation(fields: [albumId], references: [id], onDelete: Cascade)

  @@unique([userId, albumId])
  @@index([userId])
  @@index([albumId])
  @@map("user_no_skip_album")
}
```

Also add the back-relations:
- `User`: `noSkipAlbums UserNoSkipAlbum[]`
- `Album`: `noSkipUsers UserNoSkipAlbum[]`

Then run:
```bash
bun run db:migrate    # creates and applies migration
bunx prisma generate  # regenerates Prisma client
```

---

## Step 2: Shared Schema – Add `noSkip` to `ListenMetadataSchema`

**File:** `shared/schemas/common.schema.ts`

```typescript
export const ListenMetadataSchema = z.object({
  listenOrder: ListenOrderSchema,
  listenMethod: ListenMethodSchema,
  listenTime: ListenTimeSchema.nullable(),
  noSkip: z.boolean(),
});
```

`noSkip` is computed when building the listens response (see mapper step) — it is `true` if the album exists in the user's `UserNoSkipAlbum` set.

---

## Step 3: API Schema – Toggle endpoint schema

**New file:** `shared/schemas/noSkip.schema.ts`

```typescript
import { z } from 'zod';
import { type ApiSchema, type EndpointContract } from './common.schema';

// PATCH /api/albums/[spotifyAlbumId]/no-skip
export const toggleNoSkipSchema = {
  params: z.object({
    spotifyAlbumId: z.string(),
  }),
  body: z.object({
    noSkip: z.boolean(),
  }),
  response: z.object({
    noSkip: z.boolean(),
  }),
} satisfies ApiSchema;

export type ToggleNoSkip = EndpointContract<typeof toggleNoSkipSchema>;
export type ToggleNoSkipBody = ToggleNoSkip['body'];
export type ToggleNoSkipResponse = ToggleNoSkip['response'];
```

---

## Step 4: Repository – New `NoSkipRepository`

**New file:** `server/repositories/noSkip.repository.ts`

```typescript
export class NoSkipRepository {
  constructor(private prismaClient: ExtendedPrismaClient = prisma) {}

  /** Returns the set of internal Album IDs the user has marked no-skip */
  async getNoSkipAlbumIds(userId: string): Promise<Set<string>> {
    const records = await this.prismaClient.userNoSkipAlbum.findMany({
      where: { userId },
      select: { albumId: true },
    });
    return new Set(records.map((r) => r.albumId));
  }

  /** Upserts (noSkip=true) or deletes (noSkip=false) the user↔album record */
  async setNoSkip(userId: string, spotifyAlbumId: string, noSkip: boolean): Promise<boolean> {
    const album = await this.prismaClient.album.findUnique({
      where: { spotifyId: spotifyAlbumId },
      select: { id: true },
    });

    if (!album) {
      throw new NotFoundError('Album', { spotifyAlbumId });
    }

    if (noSkip) {
      await this.prismaClient.userNoSkipAlbum.upsert({
        where: { userId_albumId: { userId, albumId: album.id } },
        create: { userId, albumId: album.id },
        update: {},
      });
    } else {
      await this.prismaClient.userNoSkipAlbum.deleteMany({
        where: { userId, albumId: album.id },
      });
    }

    return noSkip;
  }
}
```

---

## Step 5: Mapper – Compute `noSkip` from the user's no-skip set

**File:** `server/mappers/listenMapper.ts`

The mapper needs the user's no-skip album IDs to compute `noSkip` per album listen. Update the signature:

```typescript
export const mapDailyListens = (
  dailyListens: DailyListenWithAlbums,
  noSkipAlbumIds: Set<string>,  // internal Album IDs
): DailyListens => ({
  date: toDateString(dailyListens.date),
  albums: dailyListens.albums.map(
    ({ id, album, listenOrder, listenMethod, listenTime }) => ({
      id,
      album: { ... },
      listenMetadata: {
        listenOrder,
        listenMethod,
        listenTime,
        noSkip: noSkipAlbumIds.has(album.id),  // computed from the set
      },
    }),
  ),
  favoriteSong: ...,
});
```

---

## Step 6: GET Listens – Fetch no-skip set alongside listens

**File:** `server/api/listens/index.get.ts` (and any service that calls `mapDailyListens`)

In the handler (or `DailyListenService` if the mapping is done there), fetch the no-skip set once and pass it to the mapper:

```typescript
const [listens, noSkipAlbumIds] = await Promise.all([
  repository.getListens(userId, startDate, endDate),
  noSkipRepo.getNoSkipAlbumIds(userId),
]);

return listens.map((dl) => mapDailyListens(dl, noSkipAlbumIds));
```

---

## Step 7: API Endpoint – `PATCH /api/albums/[spotifyAlbumId]/no-skip`

**New file:** `server/api/albums/[spotifyAlbumId]/no-skip.patch.ts`

```typescript
import { NoSkipRepository } from '~~/server/repositories/noSkip.repository';
import { createContextLogger, createEventHandler } from '~~/server/utils/handler';
import { toggleNoSkipSchema } from '~~/shared/schemas/noSkip.schema';

export default createEventHandler(toggleNoSkipSchema, async (event) => {
  const log = createContextLogger(event, 'API:no-skip.patch');
  const { spotifyAlbumId } = event.validatedParams;
  const { noSkip } = event.validatedBody;
  const { userId } = event.context;

  log.info('Toggling no-skip label', { spotifyAlbumId, noSkip });

  const repo = new NoSkipRepository();
  const result = await repo.setNoSkip(userId, spotifyAlbumId, noSkip);

  log.info('Successfully toggled no-skip label', { spotifyAlbumId, noSkip: result });

  return { noSkip: result };
});
```

---

## Step 8: Composable – `useNoSkip`

**New file:** `app/composables/api/albums/useNoSkip.ts`

The composable is keyed by Spotify album ID, not by a specific listen. Can be used from anywhere (carousel, badge, etc.):

```typescript
import type { ToggleNoSkipResponse } from '#shared/schemas/noSkip.schema';

type UseNoSkipOptions = {
  onUpdate?: (spotifyAlbumId: string, noSkip: boolean) => void;
};

export const useNoSkip = (options: UseNoSkipOptions = {}) => {
  const saving = ref(false);
  const error = ref<Error | null>(null);

  const toggleNoSkip = async (spotifyAlbumId: string, noSkip: boolean) => {
    saving.value = true;
    error.value = null;
    try {
      const result = await $fetch<ToggleNoSkipResponse>(
        `/api/albums/${spotifyAlbumId}/no-skip`,
        { method: 'PATCH', body: { noSkip } },
      );
      options.onUpdate?.(spotifyAlbumId, result.noSkip);
      return result.noSkip;
    } catch (e) {
      error.value = e as Error;
      throw e;
    } finally {
      saving.value = false;
    }
  };

  return { saving, error, toggleNoSkip };
};
```

---

## Step 9: UI – Toggle in `AlbumCarouselItem`

**File:** `app/components/AlbumCarousel/AlbumCarouselItem.vue`

Add a "No Skip" toggle button in the "Listen info" section. The toggle emits `toggleNoSkip` with the album's Spotify ID and the new value; the parent (`DailyListensModal`) calls the composable and propagates the updated `noSkip` value back down via the `albumListen` prop.

```vue
<button
  :aria-pressed="albumListen.listenMetadata.noSkip"
  :class="albumListen.listenMetadata.noSkip
    ? 'bg-green-500 text-white'
    : 'bg-neutral-800 text-neutral-400 hover:text-white'"
  class="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-semibold uppercase transition-colors"
  @click="$emit('toggleNoSkip', albumListen.album.albumId, !albumListen.listenMetadata.noSkip)"
>
  <UIcon name="i-lucide-skip-forward-circle" class="w-3.5 h-3.5" />
  No Skip
</button>
```

**Key difference from old plan:** the emit uses `albumListen.album.albumId` (the Spotify ID) — not the listen ID — because "No Skip" is an album-level preference.

---

## Step 10: UI – "No Skip" Badge on Album Cards

**File:** `app/components/AlbumDayCard/PastAlbumDay.vue` (scope TBD)

When any album in the day's listen has `noSkip: true`, show a small badge on the album art. The badge shows consistently for every past and future listen because the flag is on the album, not the listen record.

```vue
<div
  v-if="albumListen.listenMetadata.noSkip"
  class="absolute bottom-1 left-1 bg-green-500/90 text-white px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase z-10"
>
  No Skip
</div>
```

Exact placement TBD — requires reading `PastAlbumDay.vue` and its children during implementation.

---

## Step 11: Tests

### New repository unit/integration tests

**New file:** `server/repositories/noSkip.repository.integration.ts`

Test cases:
- `setNoSkip(true)` creates a record
- `setNoSkip(true)` again is idempotent (upsert)
- `setNoSkip(false)` removes the record
- `setNoSkip(false)` when not set is a no-op
- `getNoSkipAlbumIds` returns correct set for a user
- `setNoSkip` throws NotFoundError for unknown `spotifyAlbumId`

### New endpoint integration tests

**New file:** `server/api/albums/[spotifyAlbumId]/no-skip.patch.integration.ts`

Test cases:
- Toggle to `true` → response `{ noSkip: true }`
- Toggle to `false` → response `{ noSkip: false }`
- Returns 404 for unknown album
- Another user's no-skip status is unaffected

### GET listens reflects no-skip status

**File:** `server/api/listens/index.get.integration.ts`

Add assertions that:
- Albums in a noSkip set return `noSkip: true` in `listenMetadata`
- Albums not in the set return `noSkip: false`
- The same album across multiple listen days returns `noSkip: true` for all of them

### Update factories

**File:** `tests/factories/prisma.factory.ts`

Add a `userNoSkipAlbum` factory.

---

## File Change Summary

| File | Change |
|---|---|
| `prisma/schema.prisma` | New `UserNoSkipAlbum` model; back-relations on `User` and `Album` |
| `prisma/migrations/...` | Auto-generated migration |
| `shared/schemas/common.schema.ts` | Add `noSkip: z.boolean()` to `ListenMetadataSchema` |
| `shared/schemas/noSkip.schema.ts` | New file — `toggleNoSkipSchema` and inferred types |
| `server/repositories/noSkip.repository.ts` | New file — `getNoSkipAlbumIds`, `setNoSkip` |
| `server/mappers/listenMapper.ts` | Accept `noSkipAlbumIds: Set<string>`, compute `noSkip` per album |
| `server/api/listens/index.get.ts` | Fetch no-skip set and pass to mapper |
| `server/api/albums/[spotifyAlbumId]/no-skip.patch.ts` | New PATCH handler |
| `app/composables/api/albums/useNoSkip.ts` | New composable (keyed by Spotify album ID) |
| `app/components/AlbumCarousel/AlbumCarouselItem.vue` | Add toggle button, emit `toggleNoSkip` with Spotify album ID |
| `app/components/AlbumDayCard/PastAlbumDay.vue` | Add badge display (scope TBD) |
| `tests/factories/prisma.factory.ts` | Add `userNoSkipAlbum` factory |
| `server/repositories/noSkip.repository.integration.ts` | New integration tests |
| `server/api/albums/[spotifyAlbumId]/no-skip.patch.integration.ts` | New integration tests |
| `server/api/listens/index.get.integration.ts` | Assert `noSkip` in response |

---

## Design Decisions

1. **`noSkip` on user ↔ album, not per-listen** — Marking an album "No Skip" is a statement about the album itself, not a specific listen. Using a join table means the badge appears consistently for every past and future listen without any backfill.

2. **`noSkip` computed in the mapper** — The GET listens endpoint fetches the user's no-skip set once per request (`O(1)` extra query), then the mapper does a `Set.has()` lookup per album listen (`O(1)`). This avoids N+1 queries.

3. **Endpoint on `/api/albums/...` not `/api/listens/...`** — The toggle is not tied to a specific date or listen, so it lives under an albums resource. This also makes it reusable if a future page shows album details outside the listens calendar.

4. **`DailyListenService` may need updating** — If `mapDailyListens` is called from the service layer (e.g. for on-demand today's listens), the service will also need to accept or fetch the noSkip set. Verify during implementation.
