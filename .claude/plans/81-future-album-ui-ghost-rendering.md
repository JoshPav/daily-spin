# Plan: Issue #81 - Future Album UI - Ghost Album Rendering

## Overview

Implement UI changes to display scheduled future albums as "ghost" albums in the calendar view. This involves fetching future album data from the API and rendering them with distinct visual styling to differentiate them from past/current listens.

## Current State Analysis

### Existing Infrastructure

1. **Database Schema** (`prisma/schema.prisma:156-172`)
   - `FutureListen` model exists with `userId`, `albumId`, `date` fields
   - Unique constraint on `[userId, date]` (one scheduled album per day)
   - Relations to `User` and `Album` models

2. **Backend Services**
   - `FutureListenRepository` (`server/repositories/futureListen.repository.ts`) - fully implemented with:
     - `getFutureListens(userId)` - fetches all future listens with album/artist data
     - `getFutureListenByDate(userId, date)` - fetches single future listen
     - `upsertFutureListen()`, `deleteFutureListen()`, `deleteFutureListenByDate()`
   - `FutureListenService` (`server/services/futureListen.service.ts`) - fully implemented with:
     - `getFutureListens()`, `addFutureListen()`, `removeFutureListen()`, `removeFutureListenByDate()`
     - Mapping logic to transform DB models to API response types

3. **Shared Types** (`shared/schema.ts:124-171`)
   - `FutureListenAlbum`, `FutureListenItem`, `GetFutureListensResponse` types exist
   - API endpoint types defined: `GetFutureListens`, `AddFutureListen`, `DeleteFutureListen`

4. **Missing Pieces**
   - **No API endpoints** - `server/api/future*` does not exist
   - **No frontend composable** for fetching future listens
   - **No ghost album UI styling** for scheduled albums (only empty future day styling exists)

### Current Hacky Logic (to be removed)

In `app/pages/dashboard.vue:7-38`:
```typescript
function getNextNDays(startDate: Date, n: number): Date[] {
  // Generates placeholder dates on the frontend
}

const listens = computed<DailyListens[]>(() => {
  // Appends 6 empty placeholder days after most recent listen
  const datesInFuture = getNextNDays(new Date(mostRecentListen.date), 7);
  return [
    ...data.value,
    ...datesInFuture.slice(1).map((date) => ({ date: date.toISOString(), albums: [] })),
  ];
});
```

This logic:
- Adds 6 days of empty placeholders after the last listen
- Is purely frontend-based with no real data
- Needs to be replaced with proper API-driven future listens

### Existing Future Day Styling

In `DailyListens.vue`:
- `isFuture` computed property using `date-fns` `isFuture()`
- `.album-cover.future` class with 30% opacity
- `.empty.future` class with purple-ish gradient background

## Implementation Plan

### Phase 1: API Endpoint for Future Listens

**File: `server/api/futureListens.get.ts`** (new)

Create GET endpoint that returns future listens for the authenticated user:
- Use `FutureListenService.getFutureListens(userId)`
- Filter to only return listens from tomorrow onwards
- Return `GetFutureListensResponse` type

```typescript
// Response shape
{
  items: [
    {
      id: string;
      date: string; // ISO date
      album: {
        spotifyId: string;
        name: string;
        imageUrl: string | null;
        artists: Artist[];
      }
    }
  ]
}
```

### Phase 2: Frontend Composable for Future Listens

**File: `app/composables/api/useFutureListens.ts`** (new)

Create composable to fetch future listens:
```typescript
export const useFutureListens = () => {
  return useFetch<GetFutureListensResponse>('/api/futureListens', {
    key: 'future-listens',
  });
};
```

### Phase 3: Dashboard Refactor

**File: `app/pages/dashboard.vue`** (modify)

1. **Remove hacky logic**:
   - Delete `getNextNDays()` function
   - Remove the computed property that appends placeholder days

2. **Integrate future listens**:
   - Import and use `useFutureListens()` composable
   - Create a new computed property that merges:
     - Past/current listens from `useListens()`
     - Future scheduled albums from `useFutureListens()`
     - Empty placeholder days for unscheduled future dates

3. **Generate calendar grid**:
   - Determine date range: from earliest listen to N days in future
   - Fill in all dates in range
   - For future dates, attach scheduled album data if available
   - Mark days with scheduled albums differently from empty future days

### Phase 4: Dashboard Data Merging (Frontend)

**No schema changes needed.** Keep the two data types separate:

- `DailyListens` - past/current listens (from `GET /api/listens`)
- `FutureListenItem[]` - scheduled albums (from `GET /api/futureListens`)

The dashboard merges them client-side:
```typescript
// Pseudocode for merged calendar data
const calendarDays = computed(() => {
  const pastListens = listensData.value; // DailyListens[]
  const futureScheduled = futureListensData.value; // FutureListenItem[]

  // Build map of scheduled albums by date
  const scheduledByDate = new Map(
    futureScheduled.map(item => [item.date.split('T')[0], item])
  );

  // Generate next 7 days from today
  const futureDays = generateNextNDays(7);

  return [
    ...pastListens,
    ...futureDays.map(date => ({
      date,
      albums: [],
      scheduledAlbum: scheduledByDate.get(date) // undefined if no scheduled album
    }))
  ];
});
```

This keeps APIs clean while allowing the UI to show both data types together.

### Phase 5: Ghost Album Component/Styling

**Option A: Modify existing `DailyListens.vue`**

Add ghost album rendering logic:
- New template section for scheduled future albums
- Distinct styling: lower opacity, grayscale with tint, dashed border, "Scheduled" badge

**Option B: Create new `GhostAlbum.vue` component**

Dedicated component for ghost album rendering:
- Props: `album: FutureListenAlbum`, `date: string`
- Encapsulated ghost styling
- Used within `DailyListens.vue` or directly in dashboard

**Recommended: Option A** - Modify existing component to avoid duplication

### Phase 6: Ghost Album Visual Design

CSS updates to `DailyListens.vue`:

```css
/* Ghost album styling */
.album-cover.ghost {
  opacity: 0.6;
  border: 2px dashed rgba(29, 185, 84, 0.5); /* Spotify green dashed border */
}

.album-cover.ghost img {
  filter: grayscale(50%) brightness(0.8);
}

.album-cover.ghost:hover img {
  filter: grayscale(0%) brightness(1);
}

/* Scheduled badge */
.scheduled-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(29, 185, 84, 0.9);
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  z-index: 10;
}
```

Visual characteristics:
- Reduced opacity (60% vs 100% for past listens)
- Grayscale with slight desaturation
- Dashed border in Spotify green
- "Scheduled" badge in top-right corner
- Full color on hover (preview effect)

---

## Task Breakdown

### Must Have (MVP)

1. [ ] Create `GET /api/futureListens` endpoint
2. [ ] Create `useFutureListens` composable
3. [ ] Remove hacky `getNextNDays` logic from dashboard
4. [ ] Merge future listens data into calendar view
5. [ ] Add ghost album styling (opacity, grayscale, border)
6. [ ] Show album artwork for scheduled albums
7. [ ] Add "Scheduled" badge to ghost albums

### Nice to Have

8. [ ] Smooth transition when ghost becomes confirmed listen
9. [ ] Loading state for future album data
10. [ ] Click handler for ghost albums (show details modal)
11. [ ] Handle empty future slots gracefully (keep existing empty state)

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `server/api/futureListens.get.ts` | Create | GET endpoint for future listens (from today onwards) |
| `app/composables/api/useFutureListens.ts` | Create | Composable for fetching future listens |
| `app/pages/dashboard.vue` | Modify | Remove hacky logic, fetch & merge future listens |
| `app/components/DailyListens.vue` | Modify | Add ghost album rendering and styling |

---

## Testing Strategy

### Unit Tests
- `useFutureListens.test.ts` - mock API response, verify composable behavior

### Integration Tests
- `futureListens.get.integration.ts` - test API endpoint with real DB
  - Returns future listens for authenticated user
  - Filters out past dates
  - Returns empty array when no scheduled albums

### Manual Testing
- Verify ghost albums appear in calendar
- Check visual styling matches design
- Confirm hover effects work
- Test with 0, 1, multiple scheduled albums
- Test transition when listening to scheduled album (ghost → confirmed)

---

## Dependencies

- Existing `FutureListenService` and `FutureListenRepository` (ready to use)
- Existing `FutureListen` Prisma model (ready to use)
- Existing types in `shared/schema.ts` (ready to use)

No new npm packages required.

---

## Decisions Made

1. **How many future days to show?** → 7 days (one week ahead)

2. **What happens when clicking a ghost album?** → No action for now (just visual indicator)

3. **Should the API filter by date range?** → Return future listens from today onwards, frontend handles 7-day display window

4. **Should ghost albums show listen metadata?** → No, future listens don't have metadata (`listenOrder`, `listenMethod`, `listenTime` are only populated when actually listened)
