import type { H3Error } from 'h3';
import { createError } from 'h3';
import { AppError } from './errors';
import { createTaggedLogger } from './logger';

const logger = createTaggedLogger('ErrorHandler');

/**
 * Converts our custom AppError instances to Nitro/h3 errors
 * This ensures proper HTTP status codes and error responses
 */
export function handleError(
  error: unknown,
  context?: Record<string, unknown>,
): H3Error {
  // If it's already our custom error, use its status code and context
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

  // Handle standard Errors
  if (error instanceof Error) {
    logger.error('Unhandled error', {
      ...context,
      error: error.message,
      stack: error.stack,
    });

    return createError({
      statusCode: 500,
      message: error.message,
    });
  }

  // Handle unknown errors
  logger.error('Unknown error type', {
    ...context,
    error: String(error),
  });

  return createError({
    statusCode: 500,
    message: 'An unexpected error occurred',
  });
}
