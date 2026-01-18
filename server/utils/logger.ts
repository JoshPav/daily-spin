import { createConsola, type LogLevel } from 'consola';

/**
 * Centralized logger configuration for server-side logging.
 *
 * Log level can be set via LOG_LEVEL environment variable:
 * - Accepts numeric values: 0 (trace) through 6 (fatal)
 * - Accepts level names: trace, debug, verbose, info, warn, error, fatal
 *
 * Default log levels by environment (when LOG_LEVEL is not set):
 * - Production: info (3)
 * - Staging: debug (1)
 * - Development: trace (0) - all levels
 */

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

// Map of log level names to numeric values
const logLevelMap: Record<string, LogLevel> = {
  trace: 0,
  debug: 1,
  verbose: 2,
  info: 3,
  warn: 4,
  error: 5,
  fatal: 6,
};

// Environment-based default log level
const defaultLogLevel: LogLevel = isDevelopment ? 0 : isProduction ? 3 : 2;

/**
 * Parse LOG_LEVEL environment variable.
 * Accepts numeric values (0-6) or level names (trace, debug, info, warn, error, fatal).
 */
function parseLogLevel(level: string | undefined): LogLevel | undefined {
  if (!level) return undefined;

  const trimmed = level.trim().toLowerCase();

  // Try parsing as number
  const numeric = Number(trimmed);
  if (!Number.isNaN(numeric) && numeric >= 0 && numeric <= 6) {
    return numeric as LogLevel;
  }

  // Try parsing as level name
  return logLevelMap[trimmed];
}

// Configure log level: manual override takes precedence, otherwise use environment default
const logLevel: LogLevel =
  parseLogLevel(process.env.LOG_LEVEL) ?? defaultLogLevel;

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
