import type { H3Event } from 'h3';
import { describe, expect, it } from 'vitest';
import {
  generateRequestId,
  getLogContext,
  getRequestDuration,
  getUserId,
  initRequestContext,
  updateUserId,
} from './requestContext';

// Helper to create a mock H3 event
function createMockEvent(overrides?: Partial<H3Event>): H3Event {
  return {
    // biome-ignore lint/suspicious/noExplicitAny: Mock object for testing
    context: {} as any,
    method: 'GET',
    path: '/api/test',
    node: { req: {}, res: {} },
    ...overrides,
  } as H3Event;
}

describe('requestContext', () => {
  describe('generateRequestId', () => {
    it('should generate a UUID', () => {
      const id = generateRequestId();
      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it('should generate unique IDs', () => {
      const id1 = generateRequestId();
      const id2 = generateRequestId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('getUserId', () => {
    it('should return userId from event context', () => {
      const event = createMockEvent({
        // biome-ignore lint/suspicious/noExplicitAny: Partial mock context for testing
        context: { userId: 'user123' } as any,
      });

      expect(getUserId(event)).toBe('user123');
    });

    it('should return undefined when userId is not set', () => {
      const event = createMockEvent();
      expect(getUserId(event)).toBeUndefined();
    });
  });

  describe('initRequestContext', () => {
    it('should initialize request context with all fields', () => {
      const event = createMockEvent({
        method: 'POST',
        path: '/api/listens',
        // biome-ignore lint/suspicious/noExplicitAny: Partial mock context for testing
        context: { userId: 'user456' } as any,
      });

      const context = initRequestContext(event);

      expect(context.requestId).toBeDefined();
      expect(context.userId).toBe('user456');
      expect(context.method).toBe('POST');
      expect(context.path).toBe('/api/listens');
      expect(context.startTime).toBeDefined();
      expect(typeof context.startTime).toBe('number');
    });

    it('should attach context to event', () => {
      const event = createMockEvent();
      initRequestContext(event);

      expect(event.context.__requestContext).toBeDefined();
    });

    it('should handle missing userId', () => {
      const event = createMockEvent();
      const context = initRequestContext(event);

      expect(context.userId).toBeUndefined();
    });
  });

  describe('getLogContext', () => {
    it('should return log context after initialization', () => {
      const event = createMockEvent({
        method: 'GET',
        path: '/api/backlog',
        // biome-ignore lint/suspicious/noExplicitAny: Partial mock context for testing
        context: { userId: 'user789' } as any,
      });

      initRequestContext(event);
      const logContext = getLogContext(event);

      expect(logContext.requestId).toBeDefined();
      expect(logContext.userId).toBe('user789');
      expect(logContext.method).toBe('GET');
      expect(logContext.path).toBe('/api/backlog');
    });

    it('should return minimal context when not initialized', () => {
      const event = createMockEvent({
        method: 'DELETE',
        path: '/api/test',
      });

      const logContext = getLogContext(event);

      expect(logContext.requestId).toBe('unknown');
      expect(logContext.method).toBe('DELETE');
      expect(logContext.path).toBe('/api/test');
    });
  });

  describe('getRequestDuration', () => {
    it('should calculate duration after initialization', () => {
      const event = createMockEvent();
      initRequestContext(event);

      // Wait a bit
      const duration = getRequestDuration(event);

      expect(duration).toBeDefined();
      expect(typeof duration).toBe('number');
      expect(duration).toBeGreaterThanOrEqual(0);
    });

    it('should return undefined when context not initialized', () => {
      const event = createMockEvent();
      const duration = getRequestDuration(event);

      expect(duration).toBeUndefined();
    });

    it('should return increasing duration over time', async () => {
      const event = createMockEvent();
      initRequestContext(event);

      const duration1 = getRequestDuration(event);
      await new Promise((resolve) => setTimeout(resolve, 10));
      const duration2 = getRequestDuration(event);

      expect(duration1).toBeDefined();
      expect(duration2).toBeDefined();
      if (duration1 !== undefined && duration2 !== undefined) {
        expect(duration2).toBeGreaterThanOrEqual(duration1);
      }
    });
  });

  describe('updateUserId', () => {
    it('should update userId in existing context', () => {
      const event = createMockEvent();
      initRequestContext(event);

      updateUserId(event, 'newUser123');
      const logContext = getLogContext(event);

      expect(logContext.userId).toBe('newUser123');
    });

    it('should handle missing context gracefully', () => {
      const event = createMockEvent();
      // Don't initialize context
      expect(() => updateUserId(event, 'user123')).not.toThrow();
    });
  });
});
