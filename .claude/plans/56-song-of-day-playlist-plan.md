# Implementation Plan: Song of the Day Playlist Creation (Issue #56)

**Issue**: #56 - Spotify: Create Song of the Day playlist for user
**Parent**: #17 - Feature: Song of the Day
**Depends on**: #52 - Database: Store playlist ID (CLOSED ✓)
**Branch**: `feat/56-song-of-day-playlist`

## Overview

Implement functionality to create and manage a yearly "Song of the Day" playlist on the user's Spotify account. When users select a favorite song for a day, it should be added to a Spotify playlist with all their favorite songs in chronological order (oldest = track 1).

## User Requirements (Confirmed)

1. **Playlist Naming**: Yearly playlists (e.g., "DailySpin - Song of the Day 2026")
2. **Playlist Order**: Oldest track is #1, newest is last (chronological order)
3. **Feature Flag**: Only create/update when `user.createSongOfDayPlaylist = true`
4. **One Song Per Day**: Only one favorite song per day (already enforced by schema)

## Spotify API Capabilities

Based on [Spotify Web API documentation](https://developer.spotify.com/documentation/web-api/reference/reorder-or-replace-playlists-tracks):

- **Add Items** (POST): Add tracks to playlist (max 100/request)
- **Remove Items** (DELETE): Remove specific tracks (max 100/request)
- **Replace Items** (PUT): Replace all tracks in one call
- **Reorder Items** (PUT): Move tracks to different positions
- **Snapshot IDs**: Handle concurrent changes

## Sync Strategy: Full Rebuild Approach

After evaluating options (incremental updates, position tracking, smart sync), the **Full Rebuild** approach is recommended:

### Why Full Rebuild?

1. **Simplicity**: Follows existing `PlaylistService.updatePlaylist()` pattern
2. **Reliability**: Always accurate, no position drift issues
3. **Performance**: Max 365 songs/year, well within Spotify's 100-item limit
4. **User-Triggered**: Updates happen on user action, not background tasks
5. **Code Maintenance**: Easier to understand and maintain

### How It Works

When user selects/changes/removes favorite song:
1. Check if `user.createSongOfDayPlaylist = true`
2. If false, skip playlist update
3. If true:
   - Fetch all `DailyListen` records with `favoriteSong` for current year
   - Order by date ASC (oldest first)
   - Get or create playlist
   - Replace all tracks using `updatePlaylistItems()` with full list

**Handling Edge Cases:**
- **User changes song for past date**: Full rebuild ensures correct order
- **User removes favorite song**: Rebuild playlist without that track
- **User deletes playlist manually**: Auto-recreate on next update
- **Year changes**: New playlist created for new year
- **Empty playlist**: If no favorites for current year, create empty playlist

## Implementation Tasks

### 1. Add SongOfDayPlaylistService Method

**File**: `server/services/songOfDayPlaylist.service.ts` (new file)

Create a new service with method:
```typescript
async updateSongOfDayPlaylist(
  userId: string,
  spotifyUserId: string,
  spotifyClient: SpotifyApi,
): Promise<void>
```

**Logic**:
1. Check `user.createSongOfDayPlaylist` flag
2. If false, return early
3. Fetch all DailyListens with favoriteSong for current year (ordered by date ASC)
4. Get or create playlist (similar to PlaylistService pattern):
   - Check `UserPlaylist` table for `PlaylistType.song_of_the_day`
   - Verify playlist exists in Spotify (handle 404)
   - Create new if needed with name "DailySpin - Song of the Day {YEAR}"
5. Build array of track URIs from favorite songs
6. Replace all tracks using `spotifyClient.playlists.updatePlaylistItems()`
7. Handle errors (API limits, permissions)

**Dependencies**:
- `DailyListenRepository` - to fetch favorites
- `UserPlaylistRepository` - to store/retrieve playlist ID
- `UserRepository` - to check feature flag
- Spotify client

### 2. Integrate with Favorite Song Endpoint

**File**: `server/api/listens/[date]/favorite-song.patch.ts`

**Current flow**:
```typescript
await repository.updateFavoriteSong(userId, date, favoriteSong);
// ... return response
```

**Updated flow**:
```typescript
await repository.updateFavoriteSong(userId, date, favoriteSong);

// Update Song of the Day playlist if feature enabled
const songOfDayService = new SongOfDayPlaylistService();
const { spotifyUserId, spotifyClient } = await getSpotifyClient(userId);
await songOfDayService.updateSongOfDayPlaylist(userId, spotifyUserId, spotifyClient);

// ... return response
```

**Edge cases**:
- If Spotify client unavailable (token expired), log error but don't block response
- If playlist update fails, log error but return success for favorite song update
- User can still select favorites even if playlist creation fails

### 3. Repository Method: Fetch Favorites for Year

**File**: `server/repositories/dailyListen.repository.ts`

Add new method:
```typescript
async getFavoriteSongsForYear(
  userId: string,
  year: number
): Promise<Array<{ date: Date; favoriteSong: FavoriteSong }>>
```

**Query**:
- Filter by userId and year
- Only include records where `favoriteSongId IS NOT NULL`
- Order by date ASC
- Return date and favorite song details

### 4. Helper: Get Spotify Client for User

**File**: `server/utils/spotifyClient.ts` (new file or add to existing)

Create reusable helper:
```typescript
async function getSpotifyClient(userId: string): Promise<{
  spotifyUserId: string;
  spotifyClient: SpotifyApi;
}>
```

This will:
1. Fetch user's Spotify account tokens
2. Create SpotifyApi client with tokens
3. Get Spotify user ID from client
4. Return both client and user ID

Reusable across playlist services.

### 5. Error Handling

All methods should:
- Use `createTaggedLogger()` for structured logging
- Log playlist updates with context (userId, year, trackCount)
- Catch and log Spotify API errors (404, 403, rate limits)
- Not block favorite song updates if playlist fails
- Return meaningful error messages

### 6. Testing

**Unit Tests**:
- `songOfDayPlaylist.service.test.ts`: Test service methods with mocked repos
- Test feature flag check (skip when disabled)
- Test empty favorites list

**Integration Tests**:
- `favorite-song.patch.integration.ts`: Extend existing tests
- Test playlist creation on first favorite song
- Test playlist update when changing favorite
- Test playlist rebuild when removing favorite
- Test feature flag disabled (no playlist created)
- Mock Spotify API calls

## Files to Create/Modify

### New Files
- `server/services/songOfDayPlaylist.service.ts`
- `server/services/songOfDayPlaylist.service.test.ts` (optional unit tests)
- `server/utils/spotifyClient.ts` (if not exists)

### Modified Files
- `server/api/listens/[date]/favorite-song.patch.ts` - Add playlist update call
- `server/repositories/dailyListen.repository.ts` - Add `getFavoriteSongsForYear()`
- `server/api/listens/[date]/favorite-song.patch.integration.ts` - Add playlist tests

## Technical Notes

### Spotify Scopes
✓ Already configured in `shared/auth.ts:56-60`:
- `playlist-modify-private`
- `playlist-modify-public`

### Database Schema
✓ Already configured (from #52):
- `UserPlaylist` table with `PlaylistType.song_of_the_day`
- `DailyListen.favoriteSongId`, `favoriteSongName`, `favoriteSongTrackNumber`, `favoriteSongAlbumId`
- `User.createSongOfDayPlaylist` feature flag

### Performance Considerations
- Max 365 API calls per year (one per day with favorites)
- Full rebuild is efficient: <1 second for 365 tracks
- Spotify limit: 100 items per request (we're well within)
- No background jobs needed - all user-triggered

### Multi-Year Strategy
- Each year gets its own playlist
- Old years remain unchanged
- When year changes, new playlist auto-created
- Could add "View Past Years" UI in future

## Questions & Decisions

| Question | Decision | Rationale |
|----------|----------|-----------|
| Playlist per year or one master? | Yearly | Easier to manage, clear year separation |
| Track order? | Oldest first (#1) | Chronological listening history |
| When to create? | Only when feature enabled | Respects user preferences |
| Songs per day? | One | Current schema enforces this |
| Sync strategy? | Full rebuild | Simple, reliable, performant |
| Handle user changes? | Rebuild on every update | Always accurate, no drift |

## Acceptance Criteria

- [x] Database schema includes playlist ID storage (✓ from #52)
- [ ] Playlist created on first song selection (when feature enabled)
- [ ] Playlist named "DailySpin - Song of the Day {YEAR}"
- [ ] Playlist description set appropriately
- [ ] Playlist is private by default
- [ ] Tracks ordered chronologically (oldest = #1)
- [ ] Changing favorite song updates playlist
- [ ] Removing favorite song rebuilds playlist without it
- [ ] Feature flag controls playlist creation
- [ ] Error handling for API failures (doesn't block favorites)
- [ ] Tests cover create, update, remove scenarios
- [ ] Playlist ID stored in database

## Open Questions for User

None - all requirements confirmed!

## References

- **Spotify API**: [Playlist Tracks Reference](https://developer.spotify.com/documentation/web-api/reference/reorder-or-replace-playlists-tracks)
- **Parent Issue**: #17 - Feature: Song of the Day
- **Dependency**: #52 - Database: Store playlist ID (CLOSED)
- **Existing Pattern**: `server/services/playlist.service.ts` (Album of the Day)

## Next Steps

1. Get user approval on this plan
2. Create feature branch `feat/56-song-of-day-playlist`
3. Implement tasks in order (service → repository → endpoint → tests)
4. Test with real Spotify account
5. Create PR with issue reference
