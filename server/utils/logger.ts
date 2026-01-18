import { createConsola, type LogLevel } from 'consola';

/**
 * Centralized logger configuration for server-side logging.
 *
 * Log level can be set via LOG_LEVEL environment variable:
 * - Accepts numeric values: 0-5 (higher = more verbose)
 * - Accepts level names: fatal, error, warn, log, info, debug, trace, verbose
 *
 * Default log levels by environment (when LOG_LEVEL is not set):
 * - Production: info (3)
 * - Staging: debug (4)
 * - Development: trace (5) - all levels
 */

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

// Map of log level names to numeric values (higher = more verbose)
const logLevelMap: Record<string, LogLevel> = {
  fatal: 0,
  error: 0,
  warn: 1,
  log: 2,
  info: 3,
  debug: 4,
  trace: 5,
  verbose: 5,
};

// Environment-based default log level (higher = more verbose)
const defaultLogLevel: LogLevel = isDevelopment ? 5 : isProduction ? 3 : 4;

/**
 * Parse LOG_LEVEL environment variable.
 * Accepts numeric values (0-5) or level names (fatal, error, warn, log, info, debug, trace, verbose).
 */
function parseLogLevel(level: string | undefined): LogLevel | undefined {
  if (!level) return undefined;

  const trimmed = level.trim().toLowerCase();

  // Try parsing as number
  const numeric = Number(trimmed);
  if (!Number.isNaN(numeric) && numeric >= 0 && numeric <= 5) {
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
