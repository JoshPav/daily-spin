import { logger } from '~~/server/utils/logger';
import {
  getRequestDuration,
  getUserId,
  initRequestContext,
} from '~~/server/utils/requestContext';

/**
 * Logging middleware that tracks all HTTP requests.
 *
 * Runs early in the middleware chain (prefix "1.") to ensure
 * request context is initialized before other middleware.
 *
 * Features:
 * - Generates unique request ID for correlation
 * - Logs incoming requests with method, path, and user ID (if available)
 * - Logs outgoing responses with status code and duration
 * - Includes error details for failed requests
 */
export default defineEventHandler(async (event) => {
  // Initialize request context (generates request ID, captures start time)
  const context = initRequestContext(event);

  // Log incoming request (userId might not be available yet)
  logger.info('→ Incoming request', {
    requestId: context.requestId,
    method: context.method,
    path: context.path,
  });

  // Register response handler to log after request completes
  event.node.res.once('finish', () => {
    const duration = getRequestDuration(event);
    const statusCode = event.node.res.statusCode;
    const userId = getUserId(event); // Now available after auth middleware

    // Determine log level based on status code
    const isError = statusCode >= 500;
    const isClientError = statusCode >= 400 && statusCode < 500;

    const logData = {
      requestId: context.requestId,
      method: context.method,
      path: context.path,
      statusCode,
      duration: duration ? `${duration}ms` : 'unknown',
      userId,
    };

    if (isError) {
      logger.error('← Response (server error)', logData);
    } else if (isClientError) {
      logger.warn('← Response (client error)', logData);
    } else {
      logger.info('← Response', logData);
    }

    // Additional warning for slow requests (>1000ms)
    if (duration && duration > 1000) {
      logger.warn('Slow request detected', {
        requestId: context.requestId,
        path: context.path,
        duration: `${duration}ms`,
      });
    }
  });
});
