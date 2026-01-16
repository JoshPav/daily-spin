import { randomUUID } from 'node:crypto';
import type { H3Event } from 'h3';

/**
 * Request context key for storing request-specific data
 */
const REQUEST_CONTEXT_KEY = '__requestContext';

/**
 * Request context interface
 */
export interface RequestContext {
  requestId: string;
  userId?: string;
  startTime: number;
  method: string;
  path: string;
}

/**
 * Generates a unique request ID using UUID v4.
 * Used to correlate logs across a single request lifecycle.
 *
 * @returns A unique UUID string
 */
export function generateRequestId(): string {
  return randomUUID();
}

/**
 * Extracts the user ID from the H3 event context.
 * The userId is set by the auth middleware for authenticated requests.
 *
 * @param event - The H3 event object
 * @returns The user ID if authenticated, undefined otherwise
 */
export function getUserId(event: H3Event): string | undefined {
  return event.context.userId;
}

/**
 * Initializes request context for the current request.
 * Should be called at the start of request processing (in middleware).
 *
 * @param event - The H3 event object
 * @returns The initialized request context
 */
export function initRequestContext(event: H3Event): RequestContext {
  const context: RequestContext = {
    requestId: generateRequestId(),
    userId: getUserId(event),
    startTime: Date.now(),
    method: event.method,
    path: event.path,
  };

  event.context[REQUEST_CONTEXT_KEY] = context;
  return context;
}

/**
 * Retrieves the request context from the H3 event.
 * Returns undefined if context hasn't been initialized.
 *
 * @param event - The H3 event object
 * @returns The request context or undefined
 */
export function getRequestContext(event: H3Event): RequestContext | undefined {
  return event.context[REQUEST_CONTEXT_KEY];
}

/**
 * Creates a log context object with request metadata.
 * Use this to include request information in log messages.
 *
 * @param event - The H3 event object
 * @returns An object with requestId, userId, method, and path
 *
 * @example
 * const log = createTaggedLogger('MyService');
 * log.info('Processing request', getLogContext(event));
 * // Output: Processing request { requestId: '...', userId: '...', method: 'GET', path: '/api/listens' }
 */
export function getLogContext(event: H3Event): Record<string, unknown> {
  const context = getRequestContext(event);

  if (!context) {
    return {
      requestId: 'unknown',
      method: event.method,
      path: event.path,
    };
  }

  return {
    requestId: context.requestId,
    userId: context.userId,
    method: context.method,
    path: context.path,
  };
}

/**
 * Calculates the request duration in milliseconds.
 * Call this at the end of request processing.
 *
 * @param event - The H3 event object
 * @returns Duration in milliseconds, or undefined if context not initialized
 */
export function getRequestDuration(event: H3Event): number | undefined {
  const context = getRequestContext(event);
  if (!context) {
    return undefined;
  }

  return Date.now() - context.startTime;
}

/**
 * Updates the userId in the request context.
 * Useful if user authentication happens after context initialization.
 *
 * @param event - The H3 event object
 * @param userId - The user ID to set
 */
export function updateUserId(event: H3Event, userId: string): void {
  const context = getRequestContext(event);
  if (context) {
    context.userId = userId;
  }
}
