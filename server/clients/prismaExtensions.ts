import { Prisma } from '@prisma/client';
import { createTaggedLogger } from '../utils/logger';

const logger = createTaggedLogger('Prisma');

/**
 * Prisma extension that adds automatic query timing and slow query detection
 * This extension logs:
 * - All query operations with timing
 * - Slow queries (>100ms) with warnings
 * - Query errors with full context
 */
export const loggingExtension = Prisma.defineExtension({
  name: 'logging',
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const startTime = Date.now();

        try {
          const result = await query(args);
          const duration = Date.now() - startTime;

          // Log slow queries
          if (duration > 100) {
            logger.warn('Slow query detected', {
              model,
              operation,
              duration: `${duration}ms`,
            });
          }

          // Debug log all queries in development
          logger.debug('Query executed', {
            model,
            operation,
            duration: `${duration}ms`,
          });

          return result;
        } catch (error) {
          const duration = Date.now() - startTime;

          logger.error('Query failed', {
            model,
            operation,
            duration: `${duration}ms`,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
          });

          throw error;
        }
      },
    },
  },
});
