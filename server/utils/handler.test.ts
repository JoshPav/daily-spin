import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import type { ApiSchema } from '~~/shared/schemas/common.schema';

// Mock dependencies before importing the module under test
vi.mock('./logger', () => ({
  createTaggedLogger: () => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock('./requestContext', () => ({
  getLogContext: () => ({
    requestId: 'test-request-id',
    userId: 'test-user-id',
    method: 'GET',
    path: '/api/test',
  }),
}));

// Mock h3 createError
vi.mock('h3', () => ({
  createError: (options: {
    statusCode: number;
    message: string;
    data?: unknown;
  }) => {
    const error = new Error(options.message) as Error & {
      statusCode: number;
      data?: unknown;
    };
    error.statusCode = options.statusCode;
    error.data = options.data;
    return error;
  },
}));

// Mock Nitro globals
const mockDefineEventHandler = vi.fn((handler) => handler);
const mockGetQuery = vi.fn();
const mockReadBody = vi.fn();
const mockGetRouterParams = vi.fn();

vi.stubGlobal('defineEventHandler', mockDefineEventHandler);
vi.stubGlobal('getQuery', mockGetQuery);
vi.stubGlobal('readBody', mockReadBody);
vi.stubGlobal('getRouterParams', mockGetRouterParams);

// Import after mocks are set up
import { createEventHandler } from './handler';

// Helper to create mock events
const createMockEvent = () =>
  ({
    _path: '/api/test',
    context: { userId: 'test-user' },
  }) as Parameters<typeof createEventHandler>[1] extends (
    event: infer E,
  ) => unknown
    ? E
    : never;

describe('createEventHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetQuery.mockReturnValue({});
    mockReadBody.mockResolvedValue(undefined);
    mockGetRouterParams.mockReturnValue({});
  });

  describe('validation', () => {
    it('should validate query parameters', async () => {
      const schema = {
        query: z.object({
          page: z.string(),
          limit: z.string(),
        }),
      } satisfies ApiSchema;

      mockGetQuery.mockReturnValue({ page: '1', limit: '10' });

      const handlerFn = vi.fn().mockResolvedValue({ success: true });
      const handler = createEventHandler(schema, handlerFn);

      const event = createMockEvent();
      await handler(event);

      expect(handlerFn).toHaveBeenCalledWith(
        expect.objectContaining({
          validatedQuery: { page: '1', limit: '10' },
        }),
      );
    });

    it('should validate body', async () => {
      const schema = {
        body: z.object({
          name: z.string(),
          email: z.string().email(),
        }),
      } satisfies ApiSchema;

      mockReadBody.mockResolvedValue({
        name: 'John',
        email: 'john@example.com',
      });

      const handlerFn = vi.fn().mockResolvedValue({ success: true });
      const handler = createEventHandler(schema, handlerFn);

      const event = createMockEvent();
      await handler(event);

      expect(handlerFn).toHaveBeenCalledWith(
        expect.objectContaining({
          validatedBody: { name: 'John', email: 'john@example.com' },
        }),
      );
    });

    it('should validate params', async () => {
      const schema = {
        params: z.object({
          id: z.string(),
        }),
      } satisfies ApiSchema;

      mockGetRouterParams.mockReturnValue({ id: '123' });

      const handlerFn = vi.fn().mockResolvedValue({ success: true });
      const handler = createEventHandler(schema, handlerFn);

      const event = createMockEvent();
      await handler(event);

      expect(handlerFn).toHaveBeenCalledWith(
        expect.objectContaining({
          validatedParams: { id: '123' },
        }),
      );
    });

    it('should validate all inputs together', async () => {
      const schema = {
        params: z.object({ id: z.string() }),
        query: z.object({ include: z.string().optional() }),
        body: z.object({ data: z.string() }),
      } satisfies ApiSchema;

      mockGetRouterParams.mockReturnValue({ id: 'abc' });
      mockGetQuery.mockReturnValue({ include: 'details' });
      mockReadBody.mockResolvedValue({ data: 'test-data' });

      const handlerFn = vi.fn().mockResolvedValue({ success: true });
      const handler = createEventHandler(schema, handlerFn);

      const event = createMockEvent();
      await handler(event);

      expect(handlerFn).toHaveBeenCalledWith(
        expect.objectContaining({
          validatedParams: { id: 'abc' },
          validatedQuery: { include: 'details' },
          validatedBody: { data: 'test-data' },
        }),
      );
    });
  });

  describe('validation errors', () => {
    it('should throw ValidationError for invalid query', async () => {
      const schema = {
        query: z.object({
          page: z.string().min(1),
        }),
      } satisfies ApiSchema;

      mockGetQuery.mockReturnValue({ page: '' });

      const handlerFn = vi.fn();
      const handler = createEventHandler(schema, handlerFn);

      const event = createMockEvent();

      await expect(handler(event)).rejects.toMatchObject({
        statusCode: 400,
        message: 'Validation failed',
      });

      expect(handlerFn).not.toHaveBeenCalled();
    });

    it('should throw ValidationError for invalid body', async () => {
      const schema = {
        body: z.object({
          email: z.string().email(),
        }),
      } satisfies ApiSchema;

      mockReadBody.mockResolvedValue({ email: 'not-an-email' });

      const handlerFn = vi.fn();
      const handler = createEventHandler(schema, handlerFn);

      const event = createMockEvent();

      await expect(handler(event)).rejects.toMatchObject({
        statusCode: 400,
        message: 'Validation failed',
      });

      expect(handlerFn).not.toHaveBeenCalled();
    });

    it('should throw ValidationError for missing required fields', async () => {
      const schema = {
        body: z.object({
          name: z.string(),
          age: z.number(),
        }),
      } satisfies ApiSchema;

      mockReadBody.mockResolvedValue({ name: 'John' }); // missing 'age'

      const handlerFn = vi.fn();
      const handler = createEventHandler(schema, handlerFn);

      const event = createMockEvent();

      await expect(handler(event)).rejects.toMatchObject({
        statusCode: 400,
        message: 'Validation failed',
      });
    });

    it('should include error details in validation error', async () => {
      const schema = {
        body: z.object({
          email: z.string().email(),
        }),
      } satisfies ApiSchema;

      mockReadBody.mockResolvedValue({ email: 'invalid' });

      const handlerFn = vi.fn();
      const handler = createEventHandler(schema, handlerFn);

      const event = createMockEvent();

      try {
        await handler(event);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toMatchObject({
          statusCode: 400,
          data: {
            errors: expect.arrayContaining([
              expect.objectContaining({
                path: 'email',
                message: expect.any(String),
              }),
            ]),
          },
        });
      }
    });
  });

  describe('handler execution', () => {
    it('should return handler result', async () => {
      const schema = {} satisfies ApiSchema;

      const handlerFn = vi.fn().mockResolvedValue({ data: 'test-result' });
      const handler = createEventHandler(schema, handlerFn);

      const event = createMockEvent();
      const result = await handler(event);

      expect(result).toEqual({ data: 'test-result' });
    });

    it('should pass logContext to handler', async () => {
      const schema = {} satisfies ApiSchema;

      const handlerFn = vi.fn().mockResolvedValue({});
      const handler = createEventHandler(schema, handlerFn);

      const event = createMockEvent();
      await handler(event);

      expect(handlerFn).toHaveBeenCalledWith(
        expect.objectContaining({
          logContext: expect.objectContaining({
            requestId: 'test-request-id',
          }),
        }),
      );
    });

    it('should handle handler errors', async () => {
      const schema = {} satisfies ApiSchema;

      const handlerFn = vi.fn().mockRejectedValue(new Error('Handler error'));
      const handler = createEventHandler(schema, handlerFn);

      const event = createMockEvent();

      await expect(handler(event)).rejects.toMatchObject({
        statusCode: 500,
        message: 'Handler error',
      });
    });
  });

  describe('optional schemas', () => {
    it('should set undefined for missing query schema', async () => {
      const schema = {
        body: z.object({ name: z.string() }),
      } satisfies ApiSchema;

      mockReadBody.mockResolvedValue({ name: 'test' });

      const handlerFn = vi.fn().mockResolvedValue({});
      const handler = createEventHandler(schema, handlerFn);

      const event = createMockEvent();
      await handler(event);

      expect(handlerFn).toHaveBeenCalledWith(
        expect.objectContaining({
          validatedQuery: undefined,
          validatedBody: { name: 'test' },
          validatedParams: undefined,
        }),
      );
    });

    it('should work with empty schema', async () => {
      const schema = {} satisfies ApiSchema;

      const handlerFn = vi.fn().mockResolvedValue({ ok: true });
      const handler = createEventHandler(schema, handlerFn);

      const event = createMockEvent();
      const result = await handler(event);

      expect(result).toEqual({ ok: true });
      expect(handlerFn).toHaveBeenCalledWith(
        expect.objectContaining({
          validatedQuery: undefined,
          validatedBody: undefined,
          validatedParams: undefined,
        }),
      );
    });
  });
});
