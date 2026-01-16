import { createConsola, type LogLevel } from 'consola';

/**
 * Centralized logger configuration for server-side logging.
 *
 * Log levels by environment:
 * - Production: info, warn, error, fatal
 * - Staging: debug, info, warn, error, fatal
 * - Development: All levels (trace through fatal)
 */

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

// Configure log level based on environment
const logLevel: LogLevel = isDevelopment ? 0 : isProduction ? 3 : 2;

// Create base logger instance
export const logger = createConsola({
  level: logLevel,
  formatOptions: {
    date: true,
    colors: !isProduction,
  },
});

/**
 * Creates a tagged logger for a specific component/module.
 * Tags help identify the source of log messages.
 *
 * @example
 * const log = createTaggedLogger('SpotifyService');
 * log.info('Fetching user data', { userId: '123' });
 * // Output: [SpotifyService] Fetching user data { userId: '123' }
 */
export function createTaggedLogger(tag: string) {
  return logger.withTag(tag);
}

/**
 * Log levels:
 * - trace (0): Very detailed, function entry/exit (dev only)
 * - debug (1): Detailed diagnostic information (dev/staging)
 * - info (3): Important business events
 * - warn (4): Unexpected behavior, but operation succeeded
 * - error (5): Operation failed, requires investigation
 * - fatal (6): Application crash, immediate attention
 *
 * Usage examples:
 *
 * @example Info level - business events
 * logger.info('Album listen created', {
 *   userId: '123',
 *   albumId: 'album_456',
 *   date: '2026-01-15',
 * });
 *
 * @example Warn level - unexpected but handled
 * logger.warn('Album already exists in backlog', {
 *   userId: '123',
 *   albumId: 'album_456',
 * });
 *
 * @example Error level - operation failed
 * logger.error('Failed to fetch Spotify data', {
 *   userId: '123',
 *   error: error.message,
 *   stack: error.stack,
 * });
 *
 * @example Debug level - diagnostic info
 * logger.debug('Processing recently played tracks', {
 *   userId: '123',
 *   trackCount: 50,
 * });
 */

/**
 * Filters sensitive data from objects before logging.
 * Removes access tokens, refresh tokens, passwords, and other sensitive fields.
 *
 * @example
 * const safeData = filterSensitiveData({
 *   userId: '123',
 *   accessToken: 'secret_token',
 *   albumName: 'Abbey Road',
 * });
 * // Returns: { userId: '123', albumName: 'Abbey Road' }
 */
export function filterSensitiveData(
  data: Record<string, unknown>,
): Record<string, unknown> {
  const sensitiveKeys = [
    'accessToken',
    'access_token',
    'refreshToken',
    'refresh_token',
    'password',
    'secret',
    'token',
    'apiKey',
    'api_key',
  ];

  const filtered: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = sensitiveKeys.some((sensitiveKey) =>
      lowerKey.includes(sensitiveKey.toLowerCase()),
    );

    if (isSensitive && typeof value === 'string') {
      // Show first 10 characters only for sensitive strings
      filtered[key] = value.length > 10 ? `${value.slice(0, 10)}...` : '***';
    } else if (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value)
    ) {
      // Recursively filter nested objects
      filtered[key] = filterSensitiveData(value as Record<string, unknown>);
    } else {
      filtered[key] = value;
    }
  }

  return filtered;
}

export default logger;
