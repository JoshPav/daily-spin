# User Preferences Page - Implementation Plan

## Overview
Create a preferences page where users can view and manage their feature opt-ins and view their linked Spotify playlists.

## Database Schema Analysis

**No schema changes needed!** The database already supports all required functionality:

**User model** (lines 9-29 in schema.prisma):
- `trackListeningHistory: Boolean` - Controls automatic listening history tracking
- `createTodaysAlbumPlaylist: Boolean` - Controls today's album playlist creation
- `createSongOfDayPlaylist: Boolean` - Controls song of day playlist creation (feature not yet implemented)
- `userPlaylists: UserPlaylist[]` - Relation to linked playlists

**UserPlaylist model** (lines 174-187 in schema.prisma):
- Links users to Spotify playlists
- `playlistType: PlaylistType` - Enum: album_of_the_day or song_of_the_day
- `spotifyPlaylistId: String` - The Spotify playlist ID
- Unique constraint on userId + playlistType

## Backend Implementation

### 1. Create API Endpoints

**GET /api/preferences** - Fetch user preferences and linked playlists

Location: `/home/user/daily-spin/server/api/preferences.get.ts`

```typescript
// Handler structure:
// - Get userId from event.context (auth middleware handles this)
// - Call UserPreferencesService.getPreferences(userId)
// - Return preferences and linked playlists
```

**PATCH /api/preferences** - Update user preferences

Location: `/home/user/daily-spin/server/api/preferences.patch.ts`

```typescript
// Handler structure:
// - Get userId from event.context
// - Validate request body
// - Call UserPreferencesService.updatePreferences(userId, preferences)
// - Return updated preferences
```

### 2. Create Service Layer

**UserPreferencesService**

Location: `/home/user/daily-spin/server/services/userPreferences.service.ts`

Methods needed:
- `getPreferences(userId: string)` - Returns preferences and linked playlists
- `updatePreferences(userId, preferences)` - Updates user preference fields

Pattern to follow: Look at `/home/user/daily-spin/server/services/backlog.service.ts`

### 3. Extend Repository Layer

**UserRepository** (already exists at `/home/user/daily-spin/server/repositories/user.repository.ts`)

Add methods:
- `getPreferences(userId: string)` - Fetch user with preferences and playlists
- `updatePreferences(userId, preferences)` - Update preference boolean fields

### 4. Add Types to Shared Schema

Location: `/home/user/daily-spin/shared/schema.ts`

Add:
```typescript
// User preferences response
export type UserPreferences = {
  trackListeningHistory: boolean;
  createTodaysAlbumPlaylist: boolean;
  createSongOfDayPlaylist: boolean;
};

export type LinkedPlaylist = {
  type: 'album_of_the_day' | 'song_of_the_day';
  spotifyPlaylistId: string;
  spotifyUrl: string;
};

export type GetPreferencesResponse = {
  preferences: UserPreferences;
  linkedPlaylists: LinkedPlaylist[];
};

export type UpdatePreferencesBody = Partial<UserPreferences>;

// API endpoint types
export type GetPreferences = {
  query: never;
  params: never;
  body: never;
  response: GetPreferencesResponse;
};

export type UpdatePreferences = {
  query: never;
  params: never;
  body: UpdatePreferencesBody;
  response: GetPreferencesResponse;
};
```

## Frontend Implementation

### 1. Create Preferences Page

Location: `/home/user/daily-spin/app/pages/preferences.vue`

Structure (follow pattern from `/home/user/daily-spin/app/pages/backlog.vue`):
- Use `usePreferences()` composable for data fetching
- Display loading/error states
- Two main sections: Feature Preferences and Linked Playlists
- Use NuxtUI components (UCard, USwitch/UCheckbox, UButton, UBadge)

Layout example:
```vue
<template>
  <div class="flex flex-col overflow-hidden h-full">
    <main class="max-w-200 mx-auto p-4 md:p-6 w-full flex-1 flex flex-col overflow-hidden">
      <!-- Page Header -->
      <h1 class="m-0 text-2xl md:text-[32px] font-black text-highlighted mb-6">
        Preferences
      </h1>

      <!-- Loading/Error States -->

      <!-- Feature Preferences Section -->
      <section class="mb-8">
        <h2 class="text-xl font-bold mb-4">Features</h2>
        <!-- Checkboxes/Switches for each preference -->
      </section>

      <!-- Linked Playlists Section -->
      <section>
        <h2 class="text-xl font-bold mb-4">Linked Playlists</h2>
        <!-- Display linked playlists with Spotify links -->
      </section>
    </main>
  </div>
</template>
```

### 2. Create Composables

**usePreferences()** - Fetch preferences

Location: `/home/user/daily-spin/app/composables/api/usePreferences.ts`

Pattern: Follow `/home/user/daily-spin/app/composables/api/useBacklog.ts`
```typescript
export const usePreferences = () => {
  return useFetch<GetPreferencesResponse>('/api/preferences', {
    key: 'preferences',
  });
};
```

**useUpdatePreferences()** - Update preferences

Location: `/home/user/daily-spin/app/composables/api/useUpdatePreferences.ts`

Pattern: Follow `/home/user/daily-spin/app/composables/api/useLogAlbum.ts`
```typescript
// Returns function to update preferences
// Handles loading state, error handling, success callbacks
```

### 3. Update Navigation

Location: `/home/user/daily-spin/app/pages/routes.ts`

Add:
```typescript
export enum Route {
  DASHBOARD = '/dashboard',
  BACKLOG = '/backlog',
  PREFERENCES = '/preferences',  // ADD THIS
  LANDING_PAGE = '/',
}
```

Location: `/home/user/daily-spin/app/components/Header.vue`

Update line 51-55:
```vue
{
  label: 'Preferences',
  icon: Icons.SETTINGS,
  to: Route.PREFERENCES,  // ADD THIS
  // Remove disabled: true
}
```

## UI/UX Design Considerations

### Feature Preferences Section
- Display each feature as a checkbox or toggle switch
- Show clear labels and descriptions:
  - "Track Listening History" - "Automatically detect and record albums you listen to on Spotify"
  - "Create Today's Album Playlist" - "Automatically create/update a Spotify playlist for your scheduled album"
  - "Create Song of the Day Playlist" - "Automatically create/update a Spotify playlist for daily song picks" (Note: Feature not yet implemented - could show as coming soon or hide)

### Linked Playlists Section
- Display playlists in cards with:
  - Playlist type (e.g., "Album of the Day")
  - Spotify icon
  - "Open in Spotify" link button
- If no playlists linked, show empty state with explanation
- Consider showing playlist creation status (if user enabled feature but playlist not created yet)

### Visual Design Patterns
- Follow existing color scheme (Spotify green #1db954, text colors from tailwind)
- Use NuxtUI components: UCard for sections, UBadge for labels, UButton for links
- Maintain consistent spacing (gap-4, gap-6, p-4, md:p-6)
- Use font-black for headings, text-highlighted for emphasis

## Testing Strategy

### Integration Tests

**GET /api/preferences.integration.ts**
- Test fetching preferences for authenticated user
- Test response includes all preference fields
- Test linked playlists are included in response
- Test returns empty array when no playlists linked
- Test 401 when not authenticated

**PATCH /api/preferences.integration.ts**
- Test updating single preference field
- Test updating multiple preference fields
- Test returns updated values
- Test validation errors for invalid input
- Test 401 when not authenticated

**UserPreferencesService tests**
- Test getPreferences returns correct data structure
- Test updatePreferences saves changes to database
- Test handles non-existent user gracefully

Pattern to follow: `/home/user/daily-spin/server/api/backlog/index.get.integration.ts`

Use existing test utilities:
- `createUser()` from `/home/user/daily-spin/tests/db/utils.ts`
- `createHandlerEvent()` from `/home/user/daily-spin/tests/factories/api.factory.ts`
- Import handler and call directly

### Unit Tests

**useUpdatePreferences.test.ts**
- Test composable state management
- Test success callback firing
- Mock $fetch calls

Pattern to follow: `/home/user/daily-spin/app/composables/api/useLogAlbum.test.ts`

## Implementation Sequence

### Phase 1: Backend Foundation
1. Add types to shared/schema.ts
2. Create UserPreferencesService with getPreferences method
3. Add getPreferences method to UserRepository
4. Create GET /api/preferences endpoint
5. Write integration tests for GET endpoint

### Phase 2: Frontend Read-Only View
1. Add PREFERENCES route to routes.ts
2. Create usePreferences composable
3. Create preferences.vue page with read-only display
4. Update Header.vue to enable and link to preferences page
5. Test navigation and data display

### Phase 3: Preferences Update
1. Add updatePreferences method to UserRepository
2. Add updatePreferences method to UserPreferencesService
3. Create PATCH /api/preferences endpoint
4. Create useUpdatePreferences composable
5. Add toggle/checkbox controls to preferences page
6. Write integration tests for PATCH endpoint

### Phase 4: Polish & Testing
1. Add loading states and error handling
2. Add success notifications (toasts)
3. Improve linked playlists display (Spotify links)
4. Write unit tests for composables
5. Manual testing of full user flow
6. Handle edge cases (no playlists, all features disabled, etc.)

## Potential Challenges & Solutions

**Challenge 1: Feature flag for unimplemented features**
- Song of Day playlist feature exists in schema but not implemented
- Solution: Hide this preference for now, or show with "Coming Soon" badge and disabled state

**Challenge 2: Playlist URLs**
- Need to convert spotifyPlaylistId to full Spotify URL
- Solution: Format as `https://open.spotify.com/playlist/${spotifyPlaylistId}` in service layer

**Challenge 3: Stale playlist data**
- User might delete playlist in Spotify, but DB still has reference
- Solution: Consider adding a "Refresh" button or periodic validation (can be follow-up work)

**Challenge 4: Permission scope**
- Some features require specific Spotify scopes
- Solution: Display which scopes are required/granted (can be follow-up work)

## Future Enhancements (Out of Scope)

1. Ability to unlink/delete playlists
2. Ability to manually trigger playlist creation
3. Display last sync/update time for playlists
4. Show preview of playlist contents
5. More granular preferences (e.g., which playlist types to create)
6. Email notification preferences
7. Data export functionality

## Critical Files for Implementation

### Backend
- `/home/user/daily-spin/shared/schema.ts` - Add preference types and API endpoint type definitions
- `/home/user/daily-spin/server/repositories/user.repository.ts` - Add getPreferences and updatePreferences methods
- `/home/user/daily-spin/server/services/userPreferences.service.ts` - Create new service
- `/home/user/daily-spin/server/api/preferences.get.ts` - Create GET endpoint
- `/home/user/daily-spin/server/api/preferences.patch.ts` - Create PATCH endpoint

### Frontend
- `/home/user/daily-spin/app/pages/preferences.vue` - Create preferences page
- `/home/user/daily-spin/app/composables/api/usePreferences.ts` - Create fetch composable
- `/home/user/daily-spin/app/composables/api/useUpdatePreferences.ts` - Create update composable
- `/home/user/daily-spin/app/pages/routes.ts` - Add PREFERENCES route
- `/home/user/daily-spin/app/components/Header.vue` - Enable preferences link

### Tests
- `/home/user/daily-spin/server/api/preferences.get.integration.ts` - GET endpoint tests
- `/home/user/daily-spin/server/api/preferences.patch.integration.ts` - PATCH endpoint tests
