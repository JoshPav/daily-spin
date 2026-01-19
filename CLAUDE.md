# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DailSpin is a Nuxt 4 application that automatically tracks albums listened to on Spotify. It polls Spotify's recently played tracks API to detect when a user has listened to a full album (all tracks in order), stores this data in PostgreSQL via Prisma, and displays a calendar-style history of listening activity.

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
- **Validation**: Zod for API schema validation and type inference
- **External APIs**: Spotify Web API (@spotify/web-api-ts-sdk)
- **Styling**: Tailwind CSS (via @nuxt/ui) with scoped CSS for complex component styles
- **Testing**: Vitest with separate unit and integration test projects

### Project Structure

```
app/
  components/          # Vue components (auto-imported, no pathPrefix)
  constants/           # Shared constants and configuration objects
  composables/         # Composables (auto-imported)
  app.vue             # Root component with main layout
  app.config.ts       # NuxtUI theme configuration
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
  schema.ts           # Legacy type definitions (being migrated to schemas/)
  schemas/            # Zod schemas for API validation and type inference
    common.schema.ts  # Shared types (Artist, Album, enums, helpers)
    listens.schema.ts # Listens endpoint schemas
    backlog.schema.ts # Backlog endpoint schemas
    etc.
prisma/
  schema.prisma       # Database schema
```

### Data Flow

1. **Automatic tracking**: A CRON job (scheduled via cron-job.org, calling `/api/cron/process-listens`) runs hourly to call `RecentlyPlayedService.processTodaysListens()`, which:
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
- `SPOTIFY_CLIENT_ID`: Spotify API client ID (exposed to client via public.spotifyClientId)
- `DISABLE_AUTO_FETCH`: Set to 'true' to disable automatic fetching of today's listens
- `CRON_SECRET`: Secret token for authenticating cron job requests from cron-job.org

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

#### Integration Test Patterns

Integration tests run against a real PostgreSQL database in Docker. Follow these patterns for consistency:

**Test structure** - Use Given/When/Then comments:

```typescript
it('should return listens for a date range', async () => {
  // Given
  const album1 = albumListenInput();
  const day1 = new Date('2026-01-10T00:00:00.000Z');
  await createDailyListens({ userId, date: day1, albumListen: album1 });

  // When
  const result = await handler(
    createHandlerEvent(userId, {
      query: { startDate: day1.toISOString(), endDate: day1.toISOString() },
    }),
  );

  // Then
  expect(result).toHaveLength(1);
  expect(result[0]).toEqual({
    date: day1.toISOString(),
    albums: [getExpectedAlbum(album1)],
  });
});
```

**Database helpers** - Use helpers from `tests/db/utils.ts`:

```typescript
import { createUser, createDailyListens, getAllListensForUser } from '~~/tests/db/utils';

// Create a user (returns { id, accounts })
const user = await createUser();
userId = user.id;
userAccount = user.accounts[0];

// Create daily listens with single album
await createDailyListens({ userId, date, albumListen: albumListenInput() });

// Create daily listens with multiple albums
await createDailyListens({ userId, date, albumListens: [album1, album2] });

// Query listens (returns array - remember to destructure)
const [savedListens] = await getAllListensForUser(userId);
```

**Handler testing** - Import and call handlers directly:

```typescript
import { createHandlerEvent } from '~~/tests/factories/api.factory';
import type { EventHandler } from '~~/tests/mocks/nitroMock';

let handler: EventHandler<GetListensResponse>;

beforeEach(async () => {
  handler = (await import('./listens.get')).default;
});

// Call with query params
const result = await handler(
  createHandlerEvent(userId, {
    query: { startDate: '...', endDate: '...' },
  }),
);

// Call with body
await handler(createHandlerEvent(userId, { body: addAlbumListenBody() }));
```

**Mocking Spotify API** - Use the shared mock and assert on calls:

```typescript
import { mockSpotifyApi, mockWithAccessToken } from '~~/tests/mocks/spotifyMock';
import { mockRuntimeConfig } from '~~/tests/integration.setup';

const mockGetRecentlyPlayedTracks = vi.mocked(
  mockSpotifyApi.player.getRecentlyPlayedTracks,
);

const spotifyClientId = 'test-spotify-client-id';

beforeAll(async () => {
  mockRuntimeConfig.spotifyClientId = spotifyClientId;
});

// In test - mock the response
mockGetRecentlyPlayedTracks.mockResolvedValue(
  recentlyPlayed({ items: history }),
);

// Assert Spotify client was created with correct credentials
expect(mockWithAccessToken).toHaveBeenCalledWith(spotifyClientId, {
  access_token: userAccount.accessToken,
  token_type: 'Bearer',
  expires_in: 3600,
  refresh_token: userAccount.refreshToken,
});
```

**Test file setup**:

```typescript
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

describe('My Integration Tests', () => {
  let userId: string;
  let userAccount: Account;
  let handler: EventHandler<ResponseType>;

  beforeAll(async () => {
    vi.setSystemTime(new Date('2026-01-15T12:00:00.000Z'));
    mockRuntimeConfig.spotifyClientId = 'test-client-id';
  });

  beforeEach(async () => {
    const user = await createUser();
    userId = user.id;
    userAccount = user.accounts[0];
    handler = (await import('./myHandler')).default;
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  // tests...
});
```

**Key points**:
- Always use `albumListenInput()` factory for album data, not inline objects
- Always use `createDailyListens()` helper instead of direct Prisma calls
- Remember `getAllListensForUser()` returns an array - destructure it: `const [listen] = await getAllListensForUser(userId)`
- Use `createHandlerEvent(userId, { query/body })` to create handler events
- Set `mockRuntimeConfig.spotifyClientId` in `beforeAll` for Spotify tests
- Store `userAccount` from `createUser()` to assert on auth details
- Call `vi.unstubAllEnvs()` in `afterEach` if any test uses `vi.stubEnv()`

## Feature Tracking

Features and tech debt are tracked in **GitHub Issues** on the [DailySpin project board](https://github.com/users/JoshPav/projects/2).

### Current Features

- **Automatic album tracking**: Hourly CRON job detects full album listens from Spotify recently played
- **Manual album logging**: UI for manually logging albums (Spotify/vinyl/streamed)
- **Listen metadata**: Tracks whether albums were listened in order and time of day (morning/noon/evening/night)
- **Calendar view**: Display listening history in a calendar format
- **Spotify API integration**: OAuth authentication via BetterAuth for Spotify login

### Finding Work

Before starting any feature or fix:
1. Check the [GitHub Issues](https://github.com/JoshPav/daily-spin/issues) for the relevant issue
2. Read the issue description for requirements and acceptance criteria
3. Use the issue number when creating branches (see below)

## Development Workflow

### Git Commit Policy

**CRITICAL**: NEVER create git commits without explicit user approval. Always ask the user before committing changes, even if they requested a commit earlier. This applies to all commits, including:
- Feature implementation commits
- Bug fix commits
- Incremental step commits
- Any other code changes

### Starting a New Feature

Before implementing any new feature, follow this workflow:

1. **Find the GitHub Issue**:
   - Look up the relevant issue in [GitHub Issues](https://github.com/JoshPav/daily-spin/issues)
   - Read the full issue description, acceptance criteria, and any comments
   - Use `gh issue view <number>` to fetch issue details from the command line
   - If no issue exists for the work, ask the user if one should be created first

2. **Check for or create a feature branch**:
   - Check if a branch already exists for this feature
   - If not, create a feature branch with the type prefix and issue number:
     ```bash
     git checkout -b <type>/<issue-number>-short-description
     ```

   Branch naming conventions:
   - **Start with the type prefix** followed by a slash
   - **Include the GitHub issue number** after the type
   - Use kebab-case (lowercase with hyphens) for the description
   - Be descriptive but concise

   Type prefixes:
   - `feat/` - New features
   - `fix/` - Bug fixes
   - `docs/` - Documentation changes
   - `refactor/` - Code refactoring (no functional changes)
   - `test/` - Adding or updating tests
   - `chore/` - Maintenance tasks, dependencies, config
   - `breaking/` - Breaking changes

   Examples:
   - `feat/15-bulk-upload` (feature for issue #15)
   - `fix/23-album-detection` (bug fix for issue #23)
   - `refactor/19-css-variables` (refactor for issue #19)
   - `docs/20-api-documentation` (docs for issue #20)

3. **Plan before implementing**: Use Claude Code's plan mode to:
   - Explore the codebase and understand existing patterns
   - Identify which files need to be modified
   - Design the implementation approach
   - Write the plan to a file in `.claude/plans/` directory (e.g., `.claude/plans/15-bulk-upload-plan.md`)
   - Get user approval on the plan before writing code

   In Claude Code, say "Let's plan this feature" or ask Claude to enter plan mode. Claude will explore the codebase, ask clarifying questions, and present a detailed implementation plan for review. All plans should be saved to `.claude/plans/` for easy reference.

4. **Wait for user direction**: After creating the plan, WAIT for the user to specify which parts to implement. Do not automatically start implementing the entire plan.

5. **Implement selected parts**: Implement only the parts the user asks you to work on

6. **Test**: Add unit and/or integration tests as appropriate

7. **Ask before committing**: After completing each step of the plan, ASK the user for permission before creating a commit. Never commit without explicit approval.

8. **Create a PR**: Use `gh pr create` with a clear summary of changes and test plan (only after user approval). Reference the issue in the PR description (e.g., "Closes #15").

9. **Close the GitHub Issue**: When the feature is complete and merged:
   - Close the issue with `gh issue close <number>`
   - Update the "Current Features" list in this file if applicable

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

All API handlers use `createEventHandler` with Zod schemas for automatic validation and type inference.

1. **Define the schema** in `shared/schemas/` (or add to existing schema file):

```typescript
// shared/schemas/myFeature.schema.ts
import { z } from 'zod';
import { type ApiSchema, AlbumSchema } from './common.schema';

export const getMyFeatureSchema = {
  query: z.object({
    limit: z.coerce.number().optional(),
  }),
  response: z.array(AlbumSchema),
} satisfies ApiSchema;

export const createMyFeatureSchema = {
  body: z.object({
    name: z.string(),
    albumId: z.string(),
  }),
  response: z.object({
    id: z.string(),
  }),
} satisfies ApiSchema;
```

2. **Create the handler** in `server/api/`:

```typescript
// server/api/my-feature/index.get.ts
import {
  createContextLogger,
  createEventHandler,
} from '~~/server/utils/handler';
import { getMyFeatureSchema } from '~~/shared/schemas/myFeature.schema';

export default createEventHandler(getMyFeatureSchema, async (event) => {
  const log = createContextLogger(event, 'API:my-feature.get');
  const { userId } = event.context;
  const query = event.validatedQuery; // Typed from schema

  log.info('Fetching my feature');

  // Use services for business logic
  const result = await myService.getData(userId, query);

  log.info('Successfully fetched my feature', { count: result.length });

  return result; // Type-checked against schema.response
});
```

**Key points**:
- Use `createEventHandler(schema, handler)` - provides automatic Zod validation
- Access validated data via `event.validatedQuery`, `event.validatedBody`, `event.validatedParams`
- Use `createContextLogger(event, tag)` for logging with automatic request context
- Throw errors directly (e.g., `throw new NotFoundError(...)`) - error handling is automatic
- No explicit return types needed - TypeScript infers from schema

**Common schema helpers** (`shared/schemas/common.schema.ts`):

```typescript
import { dateParam, optionalDateTimeQuery } from './common.schema';

// For path params - validates ISO date and transforms to Date
params: z.object({
  date: dateParam,  // "/api/listens/2026-01-15" → Date object
}),

// For query params - optional ISO datetime that transforms to Date
query: z.object({
  startDate: optionalDateTimeQuery,  // "?startDate=2026-01-15T00:00:00Z" → Date | undefined
  endDate: optionalDateTimeQuery,
}),
```

### Modifying the database schema
1. Edit `prisma/schema.prisma`
2. Run `bun run db:migrate` to create and apply migration
3. Run `bunx prisma generate` to regenerate Prisma client (also runs on postinstall)
4. Update TypeScript types in `shared/schema.ts` if needed

### Adding a scheduled task
1. Create a file in `server/tasks/` exporting an async function with the task logic
2. Create an API endpoint in `server/api/cron/` that calls the task function (use `verifyCronAuth()` for auth)
3. Configure the cron schedule in [cron-job.org](https://cron-job.org) with:
   - The endpoint URL (e.g., `https://your-domain.com/api/cron/your-task`)
   - `Authorization: Bearer <CRON_SECRET>` header
   - Desired schedule (CRON format)

### Component auto-imports
Components in `app/components/` are auto-imported without path prefix (configured in nuxt.config.ts). Composables in `composables/**` are also auto-imported.

### Styling with Tailwind CSS

The project uses **Tailwind CSS** (provided by `@nuxt/ui`) for styling. Follow these conventions:

**Prefer Tailwind utility classes** for:
- Layout and positioning (`flex`, `grid`, `absolute`, `relative`)
- Spacing (`p-4`, `m-2`, `gap-4`)
- Typography (`text-sm`, `font-bold`, `uppercase`)
- Colors and opacity (`bg-green-500`, `text-white`, `opacity-60`)
- Borders (`border-2`, `border-dashed`, `rounded-lg`)
- Responsive design (`md:px-6`, `lg:grid-cols-3`)
- State variants (`hover:opacity-100`, `focus:ring-2`)

**Use scoped `<style>` blocks** for:
- Complex animations (`@keyframes`, multi-step transitions)
- Pseudo-elements (`::before`, `::after`)
- Highly specific component styles that would be verbose in Tailwind
- Styles requiring CSS features not available in Tailwind

**Example - Tailwind in template:**
```vue
<div class="absolute top-2 right-2 bg-green-500/90 text-white px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase z-10">
  Scheduled
</div>
```

**Example - Scoped CSS for animations:**
```vue
<style scoped>
.skeleton {
  animation: skeleton-shimmer 2.5s ease infinite;
}

@keyframes skeleton-shimmer {
  0% { background-position: 100% 0; }
  100% { background-position: -100% 0; }
}
</style>
```

**Spotify brand colors** - Use these consistently:
- Primary green: `bg-green-500` / `text-green-500` (approximates #1db954)
- For exact Spotify green, use arbitrary values: `bg-[#1db954]`

### Error Handling

The application uses a standardized error handling system with custom error classes and a centralized error handler.

**Custom Error Classes** (`server/utils/errors.ts`):
```typescript
import { NotFoundError, ValidationError, UnauthorizedError, ExternalServiceError } from '../utils/errors';

// Use specific error types with context
throw new NotFoundError('User', { userId: '123' });
throw new ValidationError('Invalid email format', { email, field: 'email' });
throw new UnauthorizedError('Token expired', { userId });
throw new ExternalServiceError('Spotify', 'fetch user data', { userId, attempts: 3 });
```

**Available Error Classes**:
- `NotFoundError` (404) - Resource not found
- `UnauthorizedError` (401) - Authentication failures
- `ForbiddenError` (403) - Authorization failures
- `ValidationError` (400) - Invalid input
- `ExternalServiceError` (502) - Third-party service failures
- `DatabaseError` (500) - Database operation failures
- `ConflictError` (409) - Duplicate records

**API Handler Pattern**:

With `createEventHandler`, error handling is automatic. Just throw errors directly:

```typescript
import { createContextLogger, createEventHandler } from '~~/server/utils/handler';
import { NotFoundError } from '~~/server/utils/errors';
import { mySchema } from '~~/shared/schemas/my.schema';

export default createEventHandler(mySchema, async (event) => {
  const log = createContextLogger(event, 'API:my-endpoint');
  const { userId } = event.context;

  const result = await myService.getData(userId);

  if (!result) {
    throw new NotFoundError('Resource', { userId }); // Automatic error handling
  }

  return result;
});
```

The `createEventHandler` wrapper automatically:
- Validates request params/query/body against Zod schemas
- Catches and formats Zod validation errors as 400 responses
- Catches other errors and passes them through `handleError`
- Includes request context in error logs

**Service/Repository Pattern**:
```typescript
// Throw specific errors with context
if (!user) {
  throw new NotFoundError('User', { userId });
}

// Prisma P2025 (record not found) detection in repositories
catch (error) {
  if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
    throw new NotFoundError('Resource name', { userId, resourceId });
  }
  throw new DatabaseError('operation description', { userId, error });
}
```

**Benefits**:
- Automatic HTTP status code mapping
- Centralized error logging with full context
- Type-safe error handling across all layers
- Consistent API error responses

### Logging

The application uses structured logging with tagged loggers for traceability.

**API Handler Logging** - Use `createContextLogger`:

```typescript
import { createContextLogger, createEventHandler } from '~~/server/utils/handler';

export default createEventHandler(schema, async (event) => {
  const log = createContextLogger(event, 'API:my-endpoint');

  log.info('Processing request');  // Automatically includes requestId, userId, path, method
  log.info('Found items', { count: 5 });  // Extra fields merged with context
  log.error('Something failed', { error: err.message });
});
```

**Service/Repository Logging** - Use `createTaggedLogger`:

```typescript
import { createTaggedLogger } from '~~/server/utils/logger';

const logger = createTaggedLogger('Service:MyService');

// Include relevant context manually
logger.debug('Fetching user data', { userId });
logger.info('Successfully created record', { userId, recordId });
logger.error('Failed to update record', {
  userId,
  recordId,
  error: error instanceof Error ? error.message : 'Unknown error',
  stack: error instanceof Error ? error.stack : undefined,
});
```

**Log Levels**:
- `log.debug()` - Detailed diagnostic info (dev only)
- `log.info()` - Important business events (user actions, API calls)
- `log.warn()` - Unexpected behavior that succeeded
- `log.error()` - Operation failures requiring investigation

**Sensitive Data**:
Never log access tokens, refresh tokens, passwords, or full session objects. Use token previews if needed:
```typescript
logger.info('Token refreshed', {
  userId,
  tokenPreview: token.slice(0, 10) + '...',
  expiresIn: 3600
});
```

**Prisma Query Logging**:
Database queries are automatically logged via Prisma Client Extension (`server/clients/prismaExtensions.ts`):
- All queries logged at debug level with duration
- Slow queries (>100ms) logged as warnings
- Query failures logged as errors with full context
