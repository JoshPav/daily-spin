# Backend API Patterns

This document describes the patterns used for implementing backend API endpoints. The goal is a consistent, type-safe approach where schemas are the single source of truth for both runtime validation and TypeScript types.

---

## Overview

Each API endpoint consists of three layers:

1. **Schema** — defines the shape of params, query, body, and response using Zod
2. **Handler** — implements business logic, receives fully-typed validated inputs
3. **Tests** — integration tests that call the handler directly, asserting on real database state

The `createEventHandler` wrapper ties these together by parsing inputs against the schema before the handler runs, and centralising error handling.

---

## 1. Schemas

Schemas are defined in `shared/schemas/` and serve two purposes: runtime validation and TypeScript type inference. They are shared between the server and (if needed) the client.

### The `ApiSchema` contract

```typescript
// shared/schemas/common.schema.ts
import { z } from 'zod';

export type ApiSchema = {
  params?: z.ZodType;
  query?: z.ZodType;
  body?: z.ZodType;
  response?: z.ZodType;
};

type InferOrNever<T> = T extends z.ZodType ? z.infer<T> : never;

export type EndpointContract<T extends ApiSchema> = {
  params: InferOrNever<T['params']>;
  query: InferOrNever<T['query']>;
  body: InferOrNever<T['body']>;
  response: InferOrNever<T['response']>;
};
```

`ApiSchema` is a plain object — all four keys are optional. `EndpointContract<T>` extracts all four inferred TypeScript types in one place, making it easy to export named aliases.

### Common schema helpers

Reusable Zod schemas for cross-cutting concerns live in `common.schema.ts`:

```typescript
import { z } from 'zod';

/** YYYY-MM-DD date string */
export const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
  message: 'Date must be in YYYY-MM-DD format',
});

/** Path param: YYYY-MM-DD → Date (UTC midnight) */
export const dateParam = dateString.transform(
  (d) => new Date(`${d}T00:00:00.000Z`),
);

/** Optional query param: YYYY-MM-DD → Date | undefined */
export const optionalDateQuery = dateString
  .optional()
  .transform((d) => (d ? new Date(`${d}T00:00:00.000Z`) : undefined));

// Shared domain enums
export const ListenMethodSchema = z.enum(['spotify', 'vinyl', 'streamed']);
export const ListenTimeSchema = z.enum(['morning', 'noon', 'evening', 'night']);

// Shared domain objects
export const ArtistSchema = z.object({
  spotifyId: z.string(),
  name: z.string(),
  imageUrl: z.string().optional(),
});

export const AlbumSchema = z.object({
  albumId: z.string(),
  albumName: z.string(),
  imageUrl: z.string(),
  artists: z.array(ArtistSchema),
  releaseDate: z.string().optional(),
});

// Inferred types — used throughout the codebase
export type ListenMethod = z.infer<typeof ListenMethodSchema>;
export type Album = z.infer<typeof AlbumSchema>;
```

### Defining an endpoint schema

Each schema file defines one schema per endpoint. The `satisfies ApiSchema` constraint catches mistakes (e.g. using a raw value instead of a Zod schema) while keeping the literal type for inference.

```typescript
// shared/schemas/listens.schema.ts
import { z } from 'zod';
import {
  AlbumSchema,
  type ApiSchema,
  type EndpointContract,
  dateParam,
  dateString,
  optionalDateQuery,
} from './common.schema';

// Shared response objects
const DailyAlbumListenSchema = z.object({
  id: z.string(),
  album: AlbumSchema,
  listenMetadata: z.object({
    listenMethod: z.enum(['spotify', 'vinyl', 'streamed']),
    listenOrder: z.enum(['ordered', 'shuffled', 'interrupted']),
    listenTime: z.enum(['morning', 'noon', 'evening', 'night']).nullable(),
    noSkip: z.boolean(),
  }),
});

const DailyListensSchema = z.object({
  date: dateString,
  albums: z.array(DailyAlbumListenSchema),
  favoriteSong: z
    .object({
      spotifyId: z.string(),
      name: z.string(),
      trackNumber: z.number(),
      albumId: z.string(),
    })
    .nullable(),
});

// GET /api/listens
export const getListensSchema = {
  query: z.object({
    startDate: optionalDateQuery,
    endDate: optionalDateQuery,
  }),
  response: z.array(DailyListensSchema),
} satisfies ApiSchema;

export type GetListens = EndpointContract<typeof getListensSchema>;
// GetListens['query']    → { startDate?: Date; endDate?: Date }
// GetListens['response'] → Array<{ date: string; albums: [...]; favoriteSong: ... | null }>

// POST /api/listens
export const addListenSchema = {
  body: z.object({
    album: AlbumSchema,
    listenMetadata: z.object({
      listenOrder: z.enum(['ordered', 'shuffled', 'interrupted']),
      listenMethod: z.enum(['spotify', 'vinyl', 'streamed']),
      listenTime: z.enum(['morning', 'noon', 'evening', 'night']).nullable(),
    }),
    date: dateString,
  }),
} satisfies ApiSchema;

export type AddListen = EndpointContract<typeof addListenSchema>;

// PATCH /api/listens/[date]/favorite-song
export const updateFavoriteSongSchema = {
  params: z.object({
    date: dateParam, // "2026-01-15" → Date object
  }),
  body: z.union([
    z.object({ spotifyId: z.string(), name: z.string(), trackNumber: z.number(), albumId: z.string() }),
    z.object({ spotifyId: z.null() }),
  ]),
  response: z.object({
    favoriteSong: z
      .object({ spotifyId: z.string(), name: z.string(), trackNumber: z.number(), albumId: z.string() })
      .nullable(),
  }),
} satisfies ApiSchema;

export type UpdateFavoriteSong = EndpointContract<typeof updateFavoriteSongSchema>;

// Convenience aliases for commonly imported types
export type GetListensResponse = GetListens['response'];
export type AddAlbumListenBody = AddListen['body'];
```

---

## 2. The `createEventHandler` wrapper

`createEventHandler` is the single abstraction that wraps every API handler. It:

- Parses query, body, and params against the schema before calling the handler
- Attaches validated, typed values to the event as `validatedQuery`, `validatedBody`, `validatedParams`
- Converts Zod errors to structured 400 responses
- Converts all other errors through the centralised error handler
- Attaches request log context to the event for structured logging

### Implementation

```typescript
// server/utils/handler.ts
import type { H3Event } from 'h3';
import { ZodError, type ZodType, type z } from 'zod';
import type { ApiSchema } from '~~/shared/schemas/common.schema';
import { handleError } from './errorHandler';
import { ValidationError } from './errors';
import { createTaggedLogger } from './logger';
import { getLogContext } from './requestContext';

/**
 * Extended H3Event with validated data attached.
 */
export type ValidatedEvent<TSchema extends ApiSchema> = H3Event & {
  validatedQuery: TSchema['query'] extends ZodType
    ? z.infer<TSchema['query']>
    : undefined;
  validatedBody: TSchema['body'] extends ZodType
    ? z.infer<TSchema['body']>
    : undefined;
  validatedParams: TSchema['params'] extends ZodType
    ? z.infer<TSchema['params']>
    : undefined;
  logContext: Record<string, unknown>;
};

export type InferredResponse<TSchema extends ApiSchema> =
  TSchema['response'] extends ZodType ? z.infer<TSchema['response']> : unknown;

export function createEventHandler<TSchema extends ApiSchema>(
  schema: TSchema,
  handler: (event: ValidatedEvent<TSchema>) => Promise<InferredResponse<TSchema>>,
) {
  return defineEventHandler(async (event: H3Event) => {
    const logContext = getLogContext(event);

    try {
      const validatedQuery = schema.query
        ? schema.query.parse(getQuery(event))
        : undefined;
      const validatedBody = schema.body
        ? schema.body.parse(await readBody(event))
        : undefined;
      const validatedParams = schema.params
        ? schema.params.parse(getRouterParams(event))
        : undefined;

      const validatedEvent = Object.assign(event, {
        validatedQuery,
        validatedBody,
        validatedParams,
        logContext,
      }) as ValidatedEvent<TSchema>;

      return await handler(validatedEvent);
    } catch (error) {
      if (error instanceof ZodError) {
        throw handleZodError(error, logContext);
      }
      throw handleError(error, logContext);
    }
  });
}

// Converts ZodError → structured 400 ValidationError
const handleZodError = (error: ZodError, logContext: Record<string, unknown>) => {
  const validationErrors = error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
    code: issue.code,
  }));

  const [firstError] = validationErrors;
  const mainMessage =
    validationErrors.length === 1 && firstError
      ? firstError.message
      : 'Validation failed';

  throw handleError(
    new ValidationError(mainMessage, { errors: validationErrors }),
    logContext,
  );
};
```

### Key type mechanics

`ValidatedEvent<TSchema>` uses conditional types so that TypeScript knows the exact shape of `validatedQuery`/`validatedBody`/`validatedParams` inside the handler. If a schema key is absent, the corresponding property is typed `undefined` rather than `unknown`.

```
Schema has query? → validatedQuery: z.infer<typeof schema.query>
Schema has no query? → validatedQuery: undefined
```

---

## 3. Writing a handler

A handler imports its schema, calls `createEventHandler`, and accesses validated inputs from the event. No explicit return type annotation is needed — it is inferred from the schema's `response` key.

### GET handler (query params)

```typescript
// server/api/listens/index.get.ts
import { endOfDay, startOfDay, subDays } from 'date-fns';
import { DailyListenService } from '~~/server/services/dailyListen.service';
import { ValidationError } from '~~/server/utils/errors';
import { createContextLogger, createEventHandler } from '~~/server/utils/handler';
import { getListensSchema } from '~~/shared/schemas/listens.schema';

export default createEventHandler(getListensSchema, async (event) => {
  const log = createContextLogger(event, 'API:listens.get');
  const query = event.validatedQuery; // typed: { startDate?: Date; endDate?: Date }
  const { userId } = event.context;

  const today = new Date();
  const startDate = query?.startDate ?? startOfDay(subDays(today, 14));
  const endDate = endOfDay(query.endDate || today);

  log.info('Fetching listening history', {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  });

  if (startDate > endDate) {
    throw new ValidationError('startDate must be before endDate', {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });
  }

  const result = await new DailyListenService().getListensInRange(userId, {
    start: startDate,
    end: endDate,
  });

  log.info('Successfully fetched listening history', { resultCount: result.length });

  return result; // type-checked against getListensSchema.response
});
```

### POST handler (request body)

```typescript
// server/api/listens/index.post.ts
import { DailyListenService } from '~~/server/services/dailyListen.service';
import { createContextLogger, createEventHandler } from '~~/server/utils/handler';
import { addListenSchema } from '~~/shared/schemas/listens.schema';

export default createEventHandler(addListenSchema, async (event) => {
  const log = createContextLogger(event, 'API:listens.post');
  const { userId } = event.context;
  const body = event.validatedBody; // typed: { album: Album; listenMetadata: {...}; date: string }

  log.info('Manually logging album listen', {
    albumId: body.album.albumId,
    date: body.date,
    listenMethod: body.listenMetadata.listenMethod,
  });

  await new DailyListenService().addAlbumListen(userId, body);

  log.info('Successfully logged album listen', { albumId: body.album.albumId });
});
```

### PATCH handler (path params + body)

```typescript
// server/api/listens/[date]/favorite-song.patch.ts
import { createContextLogger, createEventHandler } from '~~/server/utils/handler';
import { updateFavoriteSongSchema } from '~~/shared/schemas/listens.schema';
import { DailyListenService } from '~~/server/services/dailyListen.service';

export default createEventHandler(updateFavoriteSongSchema, async (event) => {
  const log = createContextLogger(event, 'API:listens.favorite-song.patch');
  const { userId } = event.context;
  const { date } = event.validatedParams; // typed: Date (transformed from YYYY-MM-DD)
  const body = event.validatedBody;       // typed: { spotifyId: string; ... } | { spotifyId: null }

  log.info('Updating favorite song', { userId, date: date.toISOString() });

  const result = await new DailyListenService().updateFavoriteSong(userId, date, body);

  log.info('Favorite song updated', { userId });

  return result; // typed: { favoriteSong: FavoriteSong | null }
});
```

---

## 4. Error handling

Custom error classes map directly to HTTP status codes. Throw them anywhere in the handler or service layer — `createEventHandler` catches them and converts to the correct HTTP response.

```typescript
// server/utils/errors.ts

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly context?: Record<string, unknown>;

  constructor(message: string, options: { statusCode?: number; context?: Record<string, unknown> } = {}) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = options.statusCode ?? 500;
    this.context = options.context;
  }
}

// 404
export class NotFoundError extends AppError {
  constructor(resource: string, context?: Record<string, unknown>) {
    super(`${resource} not found`, { statusCode: 404, context });
  }
}

// 401
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', context?: Record<string, unknown>) {
    super(message, { statusCode: 401, context });
  }
}

// 403
export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', context?: Record<string, unknown>) {
    super(message, { statusCode: 403, context });
  }
}

// 400
export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, { statusCode: 400, context });
  }
}

// 502
export class ExternalServiceError extends AppError {
  constructor(service: string, operation: string, context?: Record<string, unknown>) {
    super(`${service} service failed: ${operation}`, {
      statusCode: 502,
      context: { ...context, service, operation },
    });
  }
}

// 500
export class DatabaseError extends AppError {
  constructor(operation: string, context?: Record<string, unknown>) {
    super(`Database operation failed: ${operation}`, {
      statusCode: 500,
      context: { ...context, operation },
    });
  }
}

// 409
export class ConflictError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, { statusCode: 409, context });
  }
}
```

The error handler in `createEventHandler` calls `handleError`, which converts `AppError` instances to h3 errors with the correct status code:

```typescript
// server/utils/errorHandler.ts
import type { H3Error } from 'h3';
import { createError } from 'h3';
import { AppError } from './errors';
import { createTaggedLogger } from './logger';

const logger = createTaggedLogger('ErrorHandler');

export function handleError(error: unknown, context?: Record<string, unknown>): H3Error {
  if (error instanceof AppError) {
    logger.error(error.message, {
      ...error.context,
      ...context,
      statusCode: error.statusCode,
      stack: error.stack,
    });
    return createError({
      statusCode: error.statusCode,
      message: error.message,
      data: error.context,
    });
  }

  if (error instanceof Error) {
    logger.error('Unhandled error', { ...context, error: error.message, stack: error.stack });
    return createError({ statusCode: 500, message: error.message });
  }

  logger.error('Unknown error type', { ...context, error: String(error) });
  return createError({ statusCode: 500, message: 'An unexpected error occurred' });
}
```

---

## 5. Logging

`createContextLogger` wraps the tagged logger and automatically merges request context (requestId, userId, path, method) into every log call:

```typescript
// server/utils/handler.ts (excerpt)
export function createContextLogger(
  event: { logContext: Record<string, unknown> },
  tag: string,
) {
  const baseLogger = createTaggedLogger(tag);
  const { logContext } = event;

  return {
    debug: (message: string, extra?: Record<string, unknown>) =>
      baseLogger.debug(message, { ...logContext, ...extra }),
    info: (message: string, extra?: Record<string, unknown>) =>
      baseLogger.info(message, { ...logContext, ...extra }),
    warn: (message: string, extra?: Record<string, unknown>) =>
      baseLogger.warn(message, { ...logContext, ...extra }),
    error: (message: string, extra?: Record<string, unknown>) =>
      baseLogger.error(message, { ...logContext, ...extra }),
  };
}
```

Usage in a handler:
```typescript
const log = createContextLogger(event, 'API:listens.get');
log.info('Fetching data');                          // includes requestId, userId, path, method automatically
log.info('Found items', { count: result.length }); // extra fields merged in
log.error('Failed', { albumId, error: err.message });
```

For services and repositories that don't have access to the request event, use `createTaggedLogger` directly and pass relevant identifiers manually:
```typescript
import { createTaggedLogger } from '~~/server/utils/logger';

const logger = createTaggedLogger('Service:DailyListen');

logger.info('Saving album listen', { userId, albumId });
logger.error('Database write failed', { userId, albumId, error: err.message });
```

---

## 6. Testing

### Unit tests for `createEventHandler`

The handler wrapper itself is tested in isolation by mocking the Nitro globals (`defineEventHandler`, `getQuery`, `readBody`, `getRouterParams`) and verifying that validation, type coercion, and error conversion work correctly.

```typescript
// server/utils/handler.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import type { ApiSchema } from '~~/shared/schemas/common.schema';

// Mock Nitro globals
const mockGetQuery = vi.fn();
const mockReadBody = vi.fn();
const mockGetRouterParams = vi.fn();

vi.stubGlobal('defineEventHandler', vi.fn((handler) => handler));
vi.stubGlobal('getQuery', mockGetQuery);
vi.stubGlobal('readBody', mockReadBody);
vi.stubGlobal('getRouterParams', mockGetRouterParams);

vi.mock('./logger', () => ({
  createTaggedLogger: () => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() }),
}));
vi.mock('./requestContext', () => ({
  getLogContext: () => ({ requestId: 'test-id', userId: 'test-user', method: 'GET', path: '/api/test' }),
}));
vi.mock('h3', () => ({
  createError: ({ statusCode, message, data }: { statusCode: number; message: string; data?: unknown }) => {
    const error = new Error(message) as Error & { statusCode: number; data?: unknown };
    error.statusCode = statusCode;
    error.data = data;
    return error;
  },
}));

import { createEventHandler } from './handler';

const createMockEvent = () =>
  ({ _path: '/api/test', context: { userId: 'test-user' } }) as Parameters<
    Parameters<typeof createEventHandler>[1]
  >[0];

describe('createEventHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetQuery.mockReturnValue({});
    mockReadBody.mockResolvedValue(undefined);
    mockGetRouterParams.mockReturnValue({});
  });

  it('should validate query parameters and pass them to the handler', async () => {
    const schema = {
      query: z.object({ page: z.string(), limit: z.string() }),
    } satisfies ApiSchema;

    mockGetQuery.mockReturnValue({ page: '1', limit: '10' });

    const handlerFn = vi.fn().mockResolvedValue({ success: true });
    const handler = createEventHandler(schema, handlerFn);

    await handler(createMockEvent());

    expect(handlerFn).toHaveBeenCalledWith(
      expect.objectContaining({ validatedQuery: { page: '1', limit: '10' } }),
    );
  });

  it('should return 400 for invalid query parameters', async () => {
    const schema = {
      query: z.object({ page: z.string().min(1) }),
    } satisfies ApiSchema;

    mockGetQuery.mockReturnValue({ page: '' });

    const handler = createEventHandler(schema, vi.fn());

    await expect(handler(createMockEvent())).rejects.toMatchObject({ statusCode: 400 });
  });

  it('should include field-level error details in 400 response', async () => {
    const schema = {
      body: z.object({ email: z.string().email() }),
    } satisfies ApiSchema;

    mockReadBody.mockResolvedValue({ email: 'not-an-email' });

    const handler = createEventHandler(schema, vi.fn());

    try {
      await handler(createMockEvent());
    } catch (error) {
      expect(error).toMatchObject({
        statusCode: 400,
        data: {
          errors: expect.arrayContaining([
            expect.objectContaining({ path: 'email', message: expect.any(String) }),
          ]),
        },
      });
    }
  });

  it('should pass logContext to the handler', async () => {
    const schema = {} satisfies ApiSchema;
    const handlerFn = vi.fn().mockResolvedValue({});

    const handler = createEventHandler(schema, handlerFn);
    await handler(createMockEvent());

    expect(handlerFn).toHaveBeenCalledWith(
      expect.objectContaining({
        logContext: expect.objectContaining({ requestId: 'test-id' }),
      }),
    );
  });

  it('should convert unhandled errors to 500', async () => {
    const schema = {} satisfies ApiSchema;
    const handlerFn = vi.fn().mockRejectedValue(new Error('Unexpected failure'));

    const handler = createEventHandler(schema, handlerFn);

    await expect(handler(createMockEvent())).rejects.toMatchObject({
      statusCode: 500,
      message: 'Unexpected failure',
    });
  });
});
```

### Integration tests

Integration tests call the handler directly against a real database. They verify the complete request→service→database→response path without any mocking of application code.

**What to mock**: authentication middleware (which runs as middleware, not in the handler itself), and external APIs like Spotify.

**What not to mock**: services, repositories, mappers, or any internal application logic.

#### Test utilities

The `createHandlerEvent` factory builds a minimal event object that satisfies the handler's expected interface:

```typescript
// tests/factories/api.factory.ts
import { faker } from '@faker-js/faker';
import { createFactory } from './factory';

type EventHandler = ReturnType<typeof defineEventHandler>;
type HandlerEvent = Parameters<EventHandler>[0];

export const createHandlerEvent = (
  userId: string,
  { body = {}, query = {}, params = {} } = {} as {
    body?: unknown;
    query?: Record<string, string>;
    params?: Record<string, string>;
  },
) =>
  handlerEvent({
    _requestBody: JSON.stringify(body),
    _path: `/path${query ? `?${new URLSearchParams(query).toString()}` : ''}`,
    _routerParams: params,
    context: { userId },
  } as unknown as HandlerEvent);

const handlerEvent = createFactory<HandlerEvent>(() => ({}) as HandlerEvent);

// Domain factories for building request bodies
export const album = createFactory<Album>(() => ({
  albumId: faker.string.uuid(),
  albumName: faker.music.songName(),
  artists: [{ name: faker.music.artist(), spotifyId: faker.string.uuid() }],
  imageUrl: faker.image.url(),
  releaseDate: faker.date.past().toISOString().split('T')[0],
}));

export const addAlbumListenBody = createFactory<AddAlbumListenBody>(() => ({
  album: album(),
  listenMetadata: {
    listenOrder: 'ordered',
    listenMethod: 'spotify',
    listenTime: 'noon',
    noSkip: false,
  },
  date: faker.date.recent().toISOString().split('T')[0],
}));
```

The `createFactory` utility returns a function that produces a default object and accepts a partial override:

```typescript
// tests/factories/factory.ts
import merge from 'lodash.merge';

export const createFactory =
  <T>(defaults: (() => T) | T) =>
  (overrides?: Partial<T>): T => {
    const base = typeof defaults === 'function' ? (defaults as () => T)() : defaults;
    return overrides ? merge({}, base, overrides) : base;
  };
```

#### Example integration test: GET endpoint

```typescript
// server/api/listens/index.get.integration.ts
import type { Account } from '@prisma/client';
import { format } from 'date-fns';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { GetListensResponse } from '~~/shared/schemas/listens.schema';
import { createDailyListens, createUser } from '~~/tests/db/utils';
import { createHandlerEvent } from '~~/tests/factories/api.factory';
import { albumListenInput } from '~~/tests/factories/prisma.factory';
import { mockRuntimeConfig } from '~~/tests/integration.setup';
import { mockGetAccessToken } from '~~/tests/mocks/authMock';
import type { EventHandler } from '~~/tests/mocks/nitroMock';
import { mockSpotifyApi, mockWithAccessToken } from '~~/tests/mocks/spotifyMock';
import { recentlyPlayed, createFullAlbumPlayHistory } from '~~/tests/factories/spotify.factory';

const toDateString = (d: Date) => format(d, 'yyyy-MM-dd');

describe('GET /api/listens Integration Tests', () => {
  let userId: string;
  let userAccount: Account;
  let handler: EventHandler<GetListensResponse>;

  const mockGetRecentlyPlayedTracks = vi.mocked(
    mockSpotifyApi.player.getRecentlyPlayedTracks,
  );

  const today = new Date('2026-01-15T12:00:00.000Z');
  const spotifyClientId = 'test-spotify-client-id';

  beforeAll(async () => {
    vi.setSystemTime(today);
    mockRuntimeConfig.spotifyClientId = spotifyClientId;
  });

  beforeEach(async () => {
    const user = await createUser();
    userId = user.id;
    userAccount = user.accounts[0];

    mockGetAccessToken.mockResolvedValue({ accessToken: userAccount.accessToken });

    handler = (await import('./index.get')).default;
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it('should return listens for a date range, with missing dates filled in', async () => {
    // Given
    const album1 = albumListenInput();
    const day1 = new Date('2026-01-10T00:00:00.000Z');
    await createDailyListens({ userId, date: day1, albumListen: album1 });

    const album2 = albumListenInput();
    const day2 = new Date('2026-01-12T00:00:00.000Z');
    await createDailyListens({ userId, date: day2, albumListen: album2 });

    // When
    const result = await handler(
      createHandlerEvent(userId, {
        query: { startDate: toDateString(day1), endDate: toDateString(day2) },
      }),
    );

    // Then
    expect(result).toHaveLength(3); // day1, empty day2, day3
    expect(result[0].date).toBe(toDateString(day1));
    expect(result[0].albums).toHaveLength(1);
    expect(result[1]).toEqual({ date: '2026-01-11', albums: [], favoriteSong: null });
    expect(result[2].date).toBe(toDateString(day2));
  });

  it('should auto-fetch today from Spotify when today is missing', async () => {
    // Given
    const { album: spotifyAlbum, history } = createFullAlbumPlayHistory({ date: '2026-01-15' });

    mockGetRecentlyPlayedTracks.mockResolvedValue(recentlyPlayed({ items: history }));

    // When
    const result = await handler(
      createHandlerEvent(userId, {
        query: {
          startDate: toDateString(new Date('2026-01-14T00:00:00.000Z')),
          endDate: toDateString(today),
        },
      }),
    );

    // Then — Spotify was called with the user's credentials
    expect(mockWithAccessToken).toHaveBeenCalledWith(spotifyClientId, {
      access_token: userAccount.accessToken,
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: userAccount.refreshToken,
    });
    expect(result[1].albums[0].album.albumId).toBe(spotifyAlbum.id);
  });

  it('should only return listens for the requesting user', async () => {
    // Given
    const otherUser = await createUser();
    const day = new Date('2026-01-10T00:00:00.000Z');

    await createDailyListens({ userId, date: day, albumListen: albumListenInput() });
    await createDailyListens({ userId: otherUser.id, date: day, albumListen: albumListenInput() });

    // When
    const result = await handler(
      createHandlerEvent(userId, {
        query: { startDate: toDateString(day), endDate: toDateString(day) },
      }),
    );

    // Then — only the requesting user's data is returned
    expect(result).toHaveLength(1);
    expect(result[0].albums).toHaveLength(1);
  });
});
```

#### Example integration test: POST endpoint

```typescript
// server/api/listens/index.post.integration.ts
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ListenMethod, ListenOrder } from '~~/shared/schemas/listens.schema';
import { createUser, getAllListensForUser } from '~~/tests/db/utils';
import { addAlbumListenBody, album, createHandlerEvent } from '~~/tests/factories/api.factory';
import type { EventHandler } from '~~/tests/mocks/nitroMock';

describe('POST /api/listens Integration Tests', () => {
  let userId: string;
  let handler: EventHandler;

  beforeAll(async () => {
    handler = (await import('./index.post')).default;
  });

  beforeEach(async () => {
    userId = (await createUser()).id;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it.each<ListenMethod>(['spotify', 'streamed', 'vinyl'])(
    'should save album with %s listen method',
    async (listenMethod) => {
      // Given
      const body = addAlbumListenBody({ listenMetadata: { listenMethod } });

      // When
      await handler(createHandlerEvent(userId, { body }));

      // Then
      const [savedListen] = await getAllListensForUser(userId);
      expect(savedListen.albums[0]).toMatchObject({
        album: expect.objectContaining({ spotifyId: body.album.albumId }),
        listenMethod,
      });
    },
  );

  it('should add multiple albums to the same day', async () => {
    // Given
    const dateString = '2026-01-01';
    const body1 = addAlbumListenBody({ album: album({ albumId: 'album-1' }), date: dateString });
    const body2 = addAlbumListenBody({ album: album({ albumId: 'album-2' }), date: dateString });

    // When
    await handler(createHandlerEvent(userId, { body: body1 }));
    await handler(createHandlerEvent(userId, { body: body2 }));

    // Then
    const listens = await getAllListensForUser(userId);
    expect(listens).toHaveLength(1);
    expect(listens[0].albums).toHaveLength(2);
  });
});
```

---

## Summary

| Layer | Responsibility | Key file(s) |
|---|---|---|
| `ApiSchema` type | Structural contract for schema objects | `shared/schemas/common.schema.ts` |
| Schema files | Zod definitions + inferred TypeScript types | `shared/schemas/*.schema.ts` |
| `createEventHandler` | Validation, error handling, log context | `server/utils/handler.ts` |
| `AppError` subclasses | Typed errors with HTTP status codes | `server/utils/errors.ts` |
| `handleError` | Converts errors to h3/Nitro HTTP responses | `server/utils/errorHandler.ts` |
| `createContextLogger` | Request-scoped structured logging | `server/utils/handler.ts` |
| Handler files | Business logic only, no boilerplate | `server/api/**/*.ts` |
| Integration tests | Call handlers directly against real DB | `server/api/**/*.integration.ts` |
| Test factories | Type-safe builders with realistic fake data | `tests/factories/` |

The central insight is that **the schema is the contract**. Defining it with `satisfies ApiSchema` keeps the literal type for inference while checking correctness at definition time. From that single definition, TypeScript derives the handler's input and output types automatically, and Zod enforces them at runtime.
