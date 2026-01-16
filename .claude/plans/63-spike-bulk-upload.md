# Spike: Investigate Bulk Upload Feature

**Issue:** #63 (Sub-task of #15)
**Date:** 2026-01-16
**Status:** Analysis Complete

## Executive Summary

This spike investigates the feasibility and approach for implementing bulk upload of Spotify streaming history data. Users can request their data export from Spotify, which provides JSON files containing their complete listening history. This feature would allow users to backfill their Daily Spin listening history using this data.

## Spotify Data Format Analysis

### Data Source
Spotify provides streaming history via their [Download your data](https://support.spotify.com/us/article/understanding-your-data/) feature. Users receive multiple JSON files named `StreamingHistory_music_N.json`.

### File Structure
Based on the issue description, Spotify sends chunked files:
- `StreamingHistory_music_0.json` (~1.3MB)
- `StreamingHistory_music_1.json` (~1.3MB)
- `StreamingHistory_music_2.json` (~259KB)

### Record Schema

```typescript
type SpotifyHistoryMusicItem = {
  endTime: string;      // Format: "YYYY-MM-DD HH:MM" (local time)
  artistName: string;   // Artist name (not ID)
  trackName: string;    // Track name (not ID)
  msPlayed: number;     // Milliseconds the track was played
}
```

### Example Record
```json
{
  "endTime": "2022-01-16 01:09",
  "artistName": "Megadeth",
  "trackName": "A Tout Le Monde - Remastered 2004",
  "msPlayed": 262133
}
```

### Key Observations

1. **No Spotify IDs**: The data only contains names, not Spotify IDs. This means we must use the Spotify Search API to resolve tracks to albums.

2. **`msPlayed` Field**: Represents how many milliseconds the track was played. Key considerations:
   - Partial plays are included (can be 0ms for quick skips)
   - A common threshold is 30 seconds (30,000ms) to filter skipped tracks
   - Full track plays typically have `msPlayed` close to the track's `duration_ms`

3. **Local Time**: The `endTime` is in the user's local time, not UTC. This requires timezone handling.

4. **End Time vs Start Time**: The timestamp is when the track **ended** playing, not when it started. To calculate start time: `startTime = endTime - msPlayed`.

5. **Multi-File Handling**: Days may span across multiple files. Processing must merge data across file boundaries.

## Comparison with Current System

### Current Real-Time Detection (via Spotify API)

| Aspect | Current System | Bulk Upload |
|--------|----------------|-------------|
| **Data Source** | `getRecentlyPlayedTracks()` API | JSON file upload |
| **Track Identification** | Spotify Track IDs | Artist name + Track name |
| **Album Identification** | Direct from Track object | Must search Spotify API |
| **Timestamp** | `played_at` (ISO 8601 UTC) | `endTime` (local time, end of play) |
| **Play Duration** | Not available | `msPlayed` available |
| **Track Order** | Sequential `playIndex` | Must infer from `endTime` |
| **API Limits** | 50 tracks per request | Full history available |

### Current Album Detection Logic (`server/services/recentlyPlayed.service.ts`)

1. Fetch recently played tracks (last 50)
2. Filter for tracks from albums with 5+ tracks
3. Group tracks by album ID
4. Check if all unique tracks from album were played
5. Determine listen order (ordered/shuffled/interrupted)
6. Calculate listen time from first track's timestamp

## Proposed Bulk Upload Processing Algorithm

### Phase 1: File Parsing & Merging

```typescript
interface ParsedTrack {
  endTime: Date;
  startTime: Date;  // Calculated: endTime - msPlayed
  artistName: string;
  trackName: string;
  msPlayed: number;
}

// 1. Parse all uploaded files
// 2. Combine into single array
// 3. Sort by endTime ascending
// 4. Filter out skips (msPlayed < 30000)
```

### Phase 2: Group by Day

```typescript
// Group tracks by date (derived from startTime, in user's timezone)
// Handle timezone conversion properly
Map<string, ParsedTrack[]>  // Key: "YYYY-MM-DD"
```

### Phase 3: Process Each Day

For each day's tracks:

1. **Group by Artist**
   - Group tracks by `artistName`
   - Filter artists with fewer than 5 unique track names

2. **Resolve Tracks to Albums (Album-First Strategy)**

   **Optimization**: Instead of searching for each track individually (10 API calls for a 10-track album), we search for ONE track, fetch its album's track list, then match remaining tracks against that list (2 API calls total).

   ```typescript
   // Album-first resolution algorithm:
   // Input: Array of tracks grouped by artist for one day
   // Output: Map of albumId -> matched tracks

   function resolveTracksToAlbums(artistTracks: ParsedTrack[]): Map<string, ResolvedTrack[]> {
     const unresolved = new Set(artistTracks);
     const albumMatches = new Map<string, ResolvedTrack[]>();

     while (unresolved.size > 0) {
       // 1. Pick first unresolved track
       const track = unresolved.values().next().value;

       // 2. Search Spotify for this ONE track (1 API call)
       const searchResult = await searchTrack(track.artistName, track.trackName);
       if (!searchResult) {
         unresolved.delete(track);
         continue;
       }

       // 3. Fetch full album track list (1 API call)
       const album = await getAlbum(searchResult.album.id);

       // 4. Match remaining unresolved tracks against album's track list
       const matched: ResolvedTrack[] = [];
       for (const candidate of unresolved) {
         const albumTrack = findTrackInAlbum(album, candidate.trackName);
         if (albumTrack) {
           matched.push({ ...candidate, spotifyTrack: albumTrack, album });
           unresolved.delete(candidate);
         }
       }

       // 5. Store matches for this album
       if (matched.length > 0) {
         albumMatches.set(album.id, matched);
       }
     }

     return albumMatches;
   }

   // Helper: Fuzzy match track name against album tracks
   function findTrackInAlbum(album: Album, trackName: string): Track | null {
     return album.tracks.items.find(t =>
       normalizeTrackName(t.name) === normalizeTrackName(trackName)
     );
   }
   ```

   **API Call Reduction**:
   | Scenario | Naive Approach | Album-First |
   |----------|---------------|-------------|
   | 10-track album, all tracks | 10 search + 1 album = 11 calls | 1 search + 1 album = 2 calls |
   | 2 albums (10 + 8 tracks) | 18 search + 2 album = 20 calls | 2 search + 2 album = 4 calls |
   | Same album across 5 days | 50 calls (with caching: varies) | 10 calls + cache hits |

3. **Check Full Album Listen**
   - From step 2, we already have album details with track list
   - Compare unique matched tracks vs `album.total_tracks`
   - Album is complete if all tracks were matched

5. **Determine Listen Metadata**
   - `listenOrder`: Check if tracks were played in track_number order
   - `listenTime`: Based on first track's startTime (morning/noon/evening/night)
   - `listenMethod`: Always "spotify" for bulk uploads

6. **Handle Edge Cases**
   - Same album listened multiple times in one day
   - Tracks that appear on multiple albums (singles, compilations)
   - Tracks not found in Spotify (removed, region-locked)

### Phase 4: Save to Database

Use existing `DailyListenRepository.saveListens()` with conflict handling:
- Skip days that already have listens (configurable)
- Or merge with existing listens (add new albums)

## Challenges & Edge Cases

### 1. Concurrent Upload Prevention

**Problem**: Users should not be able to upload new files while a previous upload is being processed.

**Proposed Solution**:
- Track processing state per user in database (new `BulkUploadJob` table)
- Before accepting upload, check for existing `pending` or `processing` jobs for user
- Return error with job status if already processing
- Allow cancellation of stuck jobs after timeout (e.g., 1 hour)

```typescript
model BulkUploadJob {
  id        String   @id @default(cuid())
  userId    String
  status    JobStatus  // pending | processing | complete | failed | cancelled
  progress  Int        @default(0)  // 0-100 percentage
  error     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user      User     @relation(fields: [userId], references: [id])

  @@index([userId, status])
}

enum JobStatus { pending | processing | complete | failed | cancelled }
```

**API Behavior**:
```typescript
// POST /api/bulk-upload/parse
// 1. Check for existing active job
const activeJob = await findActiveJobForUser(userId);
if (activeJob) {
  throw createError({
    statusCode: 409,  // Conflict
    message: 'Upload already in progress',
    data: { jobId: activeJob.id, progress: activeJob.progress }
  });
}
// 2. Create new job, proceed with upload
```

### 2. Track-to-Album Resolution

**Problem**: Spotify history only provides track names, not IDs. A track name + artist may match:
- The original album
- A "Deluxe Edition" album
- A "Greatest Hits" compilation
- A single release

**Proposed Solution**:
```typescript
// Priority order for album selection:
// 1. Album where track_number matches play order in session
// 2. Album with earliest release_date (original release)
// 3. Album that is NOT a "compilation" type
// 4. First result from Spotify search
```

### 2. Timezone Handling

**Problem**: `endTime` is in user's local time without timezone indicator.

**Proposed Solution**:
- Prompt user for their timezone during upload
- Convert all times to UTC for storage
- Use the same timezone for grouping by day

### 3. Multi-Album Detection per Day

**Problem**: User may listen to an album multiple times in one day.

**Current Behavior**: Database allows only one AlbumListen per album per day (`@@unique([dailyListenId, albumId])`).

**Proposed Solution**: Keep current behavior (one entry per album per day). This matches the app's "daily spin" concept.

### 4. Partial Album Listens

**Problem**: User may have listened to most but not all tracks.

**Proposed Solution**:
- Maintain current 5-track minimum and "all tracks" requirement
- Consider optional "relaxed mode" for >80% completion (future enhancement)

### 5. API Rate Limiting

**Problem**: Resolving thousands of tracks requires many Spotify API calls.

**Mitigation Strategies**:
- **Album-First Resolution**: Reduces calls from O(tracks) to O(albums) - see Phase 3 algorithm above
- **Caching**: Cache album track lists and search results to database
  - Key: `(artistName, trackName)` normalized → `albumId`
  - Key: `albumId` → full album with track list
- **Batching**: Use `GET /v1/albums?ids=` endpoint for up to 20 albums at once
- **Deduplication**: Only resolve unique (artist, track) pairs across all files
- **Background Processing**: Process uploads asynchronously with progress updates
- **Rate Limiting**: Implement exponential backoff on 429 responses

**Estimated API Calls** (with album-first strategy):
| Data Size | Naive | Album-First | With Caching |
|-----------|-------|-------------|--------------|
| 1 year, ~100 albums | ~2000 | ~200 | ~100 (50% cache hit) |
| 1 year, ~500 albums | ~10000 | ~1000 | ~300 (70% cache hit) |

### 6. Track Name Variations

**Problem**: Track names may differ between export and Spotify API:
- "A Tout Le Monde - Remastered 2004" vs "A Tout Le Monde"
- Unicode variations, typos, punctuation differences

**Mitigation**:
- Fuzzy matching on track names
- Normalize strings before comparison (lowercase, remove special chars)
- Use Levenshtein distance with threshold

### 7. Cross-File Day Boundaries

**Problem**: A day's listens may span multiple JSON files.

**Solution**: Parse and merge all files before grouping by day.

## Implementation Plan

### Phase 1: Core Infrastructure

1. **File Upload UI**
   - Multi-file drag-and-drop component
   - File validation (JSON format, expected schema)
   - Progress indicator

2. **File Parser Service**
   - Parse JSON files
   - Validate record schema
   - Merge and deduplicate across files

3. **Timezone Selection**
   - Add timezone selector to upload form
   - Store user timezone preference

### Phase 2: Track Resolution

4. **Spotify Search Service**
   - Create service for track -> album resolution
   - Implement caching layer (in-memory or database)
   - Handle rate limiting with backoff

5. **Album Resolution Algorithm**
   - Implement priority-based album selection
   - Handle edge cases (not found, multiple matches)

### Phase 3: Album Detection

6. **Bulk Album Detection Service**
   - Adapt existing album detection logic for bulk data
   - Handle per-day processing
   - Generate AlbumListen records

7. **Database Integration**
   - Integrate with existing `DailyListenRepository`
   - Implement conflict resolution (skip/merge)

### Phase 4: Background Processing

8. **Job Queue**
   - Implement background job processing
   - Progress tracking and status updates
   - Error handling and retry logic

9. **Status UI**
   - Upload progress indicator
   - Processing status display
   - Error reporting and resolution

### Phase 5: Polish

10. **Testing**
    - Unit tests for parser and resolution
    - Integration tests for full flow
    - Edge case testing

11. **Documentation**
    - User guide for requesting Spotify data
    - Troubleshooting guide

## API Endpoints Required

### New Endpoints

```typescript
// POST /api/bulk-upload/parse
// Accepts: multipart/form-data with JSON files
// Returns: Parsed summary (date range, track count, estimated albums)

// POST /api/bulk-upload/process
// Accepts: { timezone: string, files: FileId[] }
// Returns: { jobId: string }

// GET /api/bulk-upload/status/:jobId
// Returns: { status: 'pending'|'processing'|'complete'|'failed', progress: number, results?: {...} }
```

### Spotify API Calls Required

| Endpoint | Purpose | Rate Limit |
|----------|---------|------------|
| `GET /v1/search` | Find track by name/artist | 180 req/min |
| `GET /v1/albums/{id}` | Get album track list | 180 req/min |
| `GET /v1/albums` | Batch get albums (20 max) | 180 req/min |

## Estimated Effort

| Phase | Components | Complexity |
|-------|------------|------------|
| Phase 1 | UI, Parser, Timezone | Medium |
| Phase 2 | Search Service, Caching | High |
| Phase 3 | Detection, Repository | Medium |
| Phase 4 | Job Queue, Status | High |
| Phase 5 | Testing, Docs | Medium |

## Recommendations

1. **Start with Phase 1-3**: Core functionality without background processing. Process synchronously with loading indicator.

2. **Implement aggressive caching**: Most users listen to similar artists/albums. Cache track resolutions to database.

3. **Consider "Extended Streaming History"**: Spotify also offers extended history (lifetime data) with more fields. Design schema to support this future enhancement.

4. **Add dry-run mode**: Let users preview what would be imported before committing.

5. **Implement in stages**: Start with happy path, add edge case handling incrementally.

## Open Questions

1. Should we support the extended streaming history format (more detailed, different schema)?
2. How should we handle conflicts with existing listens (skip all / merge / prompt user)?
3. Should there be limits on date range (e.g., only last year)?
4. Do we need to store the raw upload data for debugging/reprocessing?

## References

- [Spotify: Understanding your data](https://support.spotify.com/us/article/understanding-your-data/)
- [Spotify Web API: Search](https://developer.spotify.com/documentation/web-api/reference/search)
- [Spotify Web API: Get Album](https://developer.spotify.com/documentation/web-api/reference/get-an-album)
- Parent Issue: #15
