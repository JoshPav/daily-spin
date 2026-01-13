# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Daily Spin is a Nuxt 4 application that automatically tracks albums listened to on Spotify. It polls Spotify's recently played tracks API to detect when a user has listened to a full album (all tracks in order), stores this data in PostgreSQL via Prisma, and displays a calendar-style history of listening activity.

## Commands

### Development
```bash
bun run dev                    # Start development server on localhost:3000
bun install                    # Install dependencies
bun run format                 # Format code with Biome (auto-fix)
bun run lint                   # Type-check with tsc and lint with Biome
```

### Database
```bash
bun run db:migrate             # Run database migrations (development)
bun run db:push                # Push schema changes without migration
bun run db:studio              # Open Prisma Studio to browse data
bunx prisma generate           # Regenerate Prisma client after schema changes
```

### Testing
```bash
bun run test:unit              # Run unit tests (*.test.ts files, happy-dom environment)
bun run test:integration       # Run integration tests (*.integration.ts files, spins up Docker PostgreSQL)
bun run test:db:up             # Manually start test database container
bun run test:db:down           # Manually stop and remove test database container
bun run test:db:migrate        # Apply migrations to test database
```

Integration tests automatically manage the Docker database lifecycle. Test environment variables are in `.env.test`.

### Build & Deploy
```bash
bun run build                  # Build for production
bun run preview                # Preview production build locally
bun run generate               # Generate static site
```

## Architecture

### Technology Stack
- **Framework**: Nuxt 4 with Vue 3
- **Runtime**: Node.js 24, Bun for package management and scripts
- **Database**: PostgreSQL with Prisma ORM
- **External APIs**: Spotify Web API (@spotify/web-api-ts-sdk)
- **Styling**: Scoped CSS in Vue components
- **Testing**: Vitest with separate unit and integration test projects

### Project Structure

```
app/
  components/          # Vue components (auto-imported, no pathPrefix)
  app.vue             # Root component with main layout
server/
  api/                # API route handlers
    listens.get.ts    # Fetch listening history
    listens.post.ts   # Manually log albums
  clients/            # External service clients (Spotify, Prisma)
  repositories/       # Data access layer (Prisma queries)
  services/           # Business logic
    dailyListen.service.ts       # Manages fetching/storing listens
    recentlyPlayed.service.ts    # Processes Spotify recently played tracks
  tasks/              # Scheduled background tasks
    processListens.ts # Hourly CRON to process today's listens
  mappers/            # Transform DB models to API responses
  utils/              # Utility functions
shared/
  schema.ts           # Type definitions shared between client and server
prisma/
  schema.prisma       # Database schema
```

### Data Flow

1. **Automatic tracking**: A CRON job (configured in nuxt.config.ts under `nitro.scheduledTasks`) runs hourly to call `RecentlyPlayedService.processTodaysListens()`, which:
   - Fetches recently played tracks from Spotify API
   - Filters tracks played today from albums with 5+ tracks
   - Groups tracks by album
   - Determines if the user listened to the full album (all unique tracks)
   - Calculates metadata: listenedInOrder, listenTime (morning/noon/evening/night)
   - Saves completed albums to database via `DailyListenRepository`

2. **Manual logging**: Users can manually log albums via the UI, which calls the POST /api/listens endpoint with album metadata and listen method (spotify/vinyl/streamed).

3. **Display**: The frontend fetches listening history via GET /api/listens, which:
   - Queries the database for listens in a date range
   - If today is in range and missing, automatically calculates today's listens on-demand
   - Fills in missing days with empty arrays for a complete calendar view
   - Maps database models to API response types

### Key Concepts

- **DailyListen**: Represents a single day of listening activity for a user (userId + date, unique constraint)
- **AlbumListen**: Represents a single album listened to on a specific day (nested under DailyListen)
- **Album detection logic**: An album is considered "listened to" if the user played all unique tracks from an album with 5+ total tracks
- **Listen order detection**: Tracks are considered "in order" if played sequentially by track number
- **Listen time classification**: Based on the first track's played_at timestamp (morning: 5am-12pm, noon: 12pm-5pm, evening: 5pm-9pm, night: 9pm-5am)

### Database Schema

- **User**: Basic user record (id, timestamps)
- **DailyListen**: One per user per day (userId + date unique)
- **AlbumListen**: Multiple albums per daily listen (dailyListenId + albumId unique)
- **Enums**: ListenMethod (spotify/vinyl/streamed), ListenTime (morning/noon/evening/night)

### Environment Variables

Required runtime config (nuxt.config.ts runtimeConfig):
- `POSTGRES_URL`: PostgreSQL connection string
- `DISABLE_AUTO_FETCH`: Set to 'true' to disable automatic fetching of today's listens

Test environment variables go in `.env.test`.

### Testing Strategy

- **Unit tests** (`*.test.ts`): Test utilities and pure functions in isolation using happy-dom environment
- **Integration tests** (`*.integration.ts`): Test services and repositories against a real PostgreSQL database in Docker

When adding tests, place unit tests next to the file being tested (e.g., `tracks.utils.test.ts` next to `tracks.utils.ts`). Integration tests should be in the same directory as the code they test.

#### Test Factories

**IMPORTANT**: Always use factories to create test objects. Factories are located in `tests/factories/` and provide realistic, type-safe test data.

**Using existing factories**:

```typescript
import { track, simplifiedAlbum, simplifiedArtist, context } from '~~/tests/factories/spotify.factory';

// Use with defaults
const album = simplifiedAlbum();

// Override specific fields
const customAlbum = simplifiedAlbum({
  id: 'album123',
  name: 'My Test Album',
  total_tracks: 10,
});

// Factories can be composed
const trackWithCustomAlbum = track({
  album: simplifiedAlbum({ id: 'album1' }),
  track_number: 5,
});
```

**Existing factories**:
- `simplifiedAlbum` - Spotify album objects
- `simplifiedArtist` - Spotify artist objects
- `track` - Spotify track objects (includes nested album and artists)
- `context` - Spotify context objects

**Creating new factories**:

When you need to create test objects for new types, add a factory following this pattern:

1. Create a new file in `tests/factories/` (e.g., `user.factory.ts` for User models, `domain.factory.ts` for domain-specific types)

2. Use the base `createFactory` utility with realistic faker data:

```typescript
import { faker } from '@faker-js/faker';
import { createFactory } from './factory';
import type { YourType } from '@prisma/client'; // or wherever the type comes from

const { string: { uuid }, date, internet: { email } } = faker;

export const user = createFactory<YourType>({
  id: uuid(),
  email: email(),
  createdAt: date.recent(),
  // ... all required fields with realistic faker data
});
```

3. Follow these patterns:
   - Use faker for realistic random data (dates, names, IDs, URLs, etc.)
   - Destructure commonly used faker methods at the top of the file
   - Provide complete default objects that satisfy all type requirements
   - Make factories composable (factories can call other factories for nested objects)
   - Use the same naming convention: camelCase matching the type name

4. For Prisma models, include all required fields and use appropriate faker methods:
   - IDs: `faker.string.uuid()` or `faker.string.cuid()`
   - Dates: `faker.date.recent()`, `faker.date.past()`
   - Text: Domain-specific faker methods (e.g., `faker.music.album()`, `faker.person.firstName()`)
   - Numbers: `faker.number.int()` with appropriate min/max
   - Booleans: `faker.datatype.boolean()`

**Factory pattern benefits**:
- Type-safe with TypeScript generics
- Realistic test data via @faker-js/faker
- DRY - change defaults in one place
- Easy to override specific fields while keeping realistic defaults
- Deep merging support via lodash.merge for complex nested objects

## Roadmap

This section tracks planned features and their implementation status.

### Current Features

- **Automatic album tracking**: Hourly CRON job detects full album listens from Spotify recently played
- **Manual album logging**: UI for manually logging albums (Spotify/vinyl/streamed)
- **Listen metadata**: Tracks whether albums were listened in order and time of day (morning/noon/evening/night)
- **Calendar view**: Display listening history in a calendar format

### Tech debt
- **CSS Tidy Up**
  - CSS varaibles are hardcoded everywhere. We should define variables centrally and reference these
- **Nuxt UI migration**
  - Replace custom components with Nuxt UI components
- **Dates**
  - Add modern date library to tidy up formatting logic
- **dotenv**
  - Used in lots of places, where is the central spot

### Planned Features

- **Spotify API integration** (blocked by [Spotify developer forum issue](https://community.spotify.com/t5/Spotify-for-Developers/Unable-to-create-app/td-p/7283365/page/7))
  - Setup login screen which uses BetterAuth (or similar) to authenticate users and store required info
  - Use Spotify auth flow to generate tokens when making requests (instead of current env var workaround)

- **Bulk Upload**: Import historical listening data
  - User can upload their Spotify data from the "Download your data" tool (https://support.spotify.com/uk/article/understanding-your-data/)
  - Process the data to extract historic album listens
  - Data won't be stored permanently, only processed

- **Future Listens**: Plan ahead for albums to listen to
  - Can assign albums to days in the future as a placeholder of what to listen to
  - Can be assigned manually
  - Automated CRON job to assign future days based on Spotify suggestions
  - Linked playlist that has today's album in it. Playlist auto-updated by CRON job

- **Song of the day**: Track favorite songs from daily albums
  - User can choose their favourite song of that day's album
  - Linked playlist that has the user's favourite song from each day of the year

_When a feature is fully implemented, move it from this section to "Current Features" above. If partially implemented, update the description to reflect what's complete and what remains._

## Development Workflow

### Git Commit Policy

**CRITICAL**: NEVER create git commits without explicit user approval. Always ask the user before committing changes, even if they requested a commit earlier. This applies to all commits, including:
- Feature implementation commits
- Bug fix commits
- Incremental step commits
- Any other code changes

### Starting a New Feature

Before implementing any new feature, follow this workflow:

1. **Check for or create a feature branch**:
   - Check if a branch already exists for this feature
   - If not, create a feature branch with a descriptive name:
     ```bash
     git checkout -b feature-name
     ```

   Branch naming conventions:
   - Use kebab-case (lowercase with hyphens)
   - Be descriptive but concise (e.g., `user-profile-page`, `spotify-playlist-sync`, `listening-stats`)
   - Prefix with context if helpful (e.g., `fix-album-detection`, `refactor-date-utils`)

2. **Plan before implementing**: Use Claude Code's plan mode to:
   - Explore the codebase and understand existing patterns
   - Identify which files need to be modified
   - Design the implementation approach
   - Write the plan to a file in `.claude/plans/` directory (e.g., `.claude/plans/feature-name-plan.md`)
   - Get user approval on the plan before writing code

   In Claude Code, say "Let's plan this feature" or ask Claude to enter plan mode. Claude will explore the codebase, ask clarifying questions, and present a detailed implementation plan for review. All plans should be saved to `.claude/plans/` for easy reference.

3. **Wait for user direction**: After creating the plan, WAIT for the user to specify which parts to implement. Do not automatically start implementing the entire plan.

4. **Implement selected parts**: Implement only the parts the user asks you to work on

5. **Test**: Add unit and/or integration tests as appropriate

6. **Ask before committing**: After completing each step of the plan, ASK the user for permission before creating a commit. Never commit without explicit approval.

7. **Create a PR**: Use `gh pr create` with a clear summary of changes and test plan (only after user approval)

8. **Update the roadmap**:
   - If the feature is fully implemented: Remove it from the Roadmap section and add it to the Features list
   - If only partially implemented: Update the roadmap item to reflect what's still left to do

This workflow ensures features are well-thought-out before implementation and reduces the need for major refactoring.

### Working Efficiently with Claude Code

**Before searching the codebase, ask the user for hints**:

When you need to find or modify code, ALWAYS ask the user first if they know where the relevant files are located. This prevents unnecessary broad searches when the user already has context.

**Ask questions like:**
- "Do you know which file/component handles [X]?"
- "Where should I look for the [Y] logic?"
- "Which files are involved in [Z] feature?"

**If the user provides a file path or hint:**
- Use Read tool directly on the specified files
- Trust the user's guidance - they know the codebase

**Only search broadly when:**
- The user explicitly says "I don't know, search for it"
- The user requests that you explore or search
- You're in plan mode doing discovery

This approach saves time and tokens by using the user's knowledge of the codebase rather than always searching from scratch.

## Common Patterns

### Adding a new API endpoint
1. Create a route handler in `server/api/` (e.g., `endpoint.get.ts` or `endpoint.post.ts`)
2. Define types in `shared/schema.ts` for request/response
3. Use services from `server/services/` for business logic
4. Return data using `return` (Nuxt handles serialization)

### Modifying the database schema
1. Edit `prisma/schema.prisma`
2. Run `bun run db:migrate` to create and apply migration
3. Run `bunx prisma generate` to regenerate Prisma client (also runs on postinstall)
4. Update TypeScript types in `shared/schema.ts` if needed

### Adding a scheduled task
1. Create a file in `server/tasks/` with `defineTask()` export
2. Register in `nuxt.config.ts` under `nitro.scheduledTasks` (CRON format)
3. Tasks run in production on Vercel via Vercel Cron

### Component auto-imports
Components in `app/components/` are auto-imported without path prefix (configured in nuxt.config.ts). Composables in `composables/**` are also auto-imported.
