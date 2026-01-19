import type { H3Event } from 'h3';
import { UnauthorizedError } from './errors';
import { createTaggedLogger } from './logger';

const logger = createTaggedLogger('Cron');

/**
 * Verifies that a request is from Vercel CRON.
 * Vercel sends an Authorization header with Bearer token matching CRON_SECRET.
 *
 * @throws UnauthorizedError if the request is not authorized
 */
export function verifyCronAuth(event: H3Event): void {
  const config = useRuntimeConfig();
  const cronSecret = config.cronSecret;

  // Skip auth in development if no secret is configured
  if (!cronSecret) {
    if (import.meta.dev) {
      logger.warn('CRON_SECRET not configured, skipping auth in development');
      return;
    }
    throw new UnauthorizedError('CRON_SECRET not configured');
  }

  const authHeader = getHeader(event, 'authorization');

  if (!authHeader) {
    throw new UnauthorizedError('Missing authorization header');
  }

  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || token !== cronSecret) {
    throw new UnauthorizedError('Invalid CRON authorization');
  }
}
