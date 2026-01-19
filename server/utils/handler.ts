import type { H3Event } from 'h3';
import { ZodError, type ZodType, type z } from 'zod';
import type { ApiSchema } from '~~/shared/schemas/common.schema';
import { handleError } from './errorHandler';
import { ValidationError } from './errors';
import { createTaggedLogger } from './logger';
import { getLogContext } from './requestContext';

/**
 * Creates a logger that automatically includes request context in all log calls.
 *
 * @example
 * const log = createContextLogger(event, 'API:listens.get');
 * log.info('Fetching data');  // logContext auto-included
 * log.info('Found items', { count: 5 });  // merged with logContext
 */
export function createContextLogger(
  event: { logContext: Record<string, unknown> },
  tag: string,
) {
  const baseLogger = createTaggedLogger(tag);
  const { logContext } = event;

  return {
    debug: (message: string, extra?: Record<string, unknown>) =>
      baseLogger.debug(message, { ...logContext, ...extra }),
    info: (message: string, extra?: Record<string, unknown>) =>
      baseLogger.info(message, { ...logContext, ...extra }),
    warn: (message: string, extra?: Record<string, unknown>) =>
      baseLogger.warn(message, { ...logContext, ...extra }),
    error: (message: string, extra?: Record<string, unknown>) =>
      baseLogger.error(message, { ...logContext, ...extra }),
  };
}

/**
 * Extended H3Event with validated data attached.
 * Access validated data via validatedQuery, validatedBody, and validatedParams properties.
 */
export type ValidatedEvent<TSchema extends ApiSchema> = H3Event & {
  validatedQuery: TSchema['query'] extends ZodType
    ? z.infer<TSchema['query']>
    : undefined;
  validatedBody: TSchema['body'] extends ZodType
    ? z.infer<TSchema['body']>
    : undefined;
  validatedParams: TSchema['params'] extends ZodType
    ? z.infer<TSchema['params']>
    : undefined;
  logContext: Record<string, unknown>;
};

/**
 * Infers the response type from the schema's response property.
 */
export type InferredResponse<TSchema extends ApiSchema> =
  TSchema['response'] extends ZodType ? z.infer<TSchema['response']> : unknown;

/**
 * Creates an event handler with automatic Zod validation and error handling.
 *
 * @param schema - ApiSchema object containing Zod schemas for params, query, body, and response
 * @param handler - Async function that receives the validated event and returns the response
 * @returns A Nitro event handler
 */
export function createEventHandler<TSchema extends ApiSchema>(
  schema: TSchema,
  handler: (
    event: ValidatedEvent<TSchema>,
  ) => Promise<InferredResponse<TSchema>> | InferredResponse<TSchema>,
) {
  return defineEventHandler(async (event: H3Event) => {
    const logContext = getLogContext(event);

    try {
      // Validate inputs based on provided schemas
      const validatedQuery = schema.query
        ? schema.query.parse(getQuery(event))
        : undefined;
      const validatedBody = schema.body
        ? schema.body.parse(await readBody(event))
        : undefined;
      const validatedParams = schema.params
        ? schema.params.parse(getRouterParams(event))
        : undefined;

      // Extend event with validated data
      const validatedEvent = Object.assign(event, {
        validatedQuery,
        validatedBody,
        validatedParams,
        logContext,
      }) as ValidatedEvent<TSchema>;

      return await handler(validatedEvent);
    } catch (error) {
      if (error instanceof ZodError) {
        throw handleZodError(error, logContext);
      }
      throw handleError(error, logContext);
    }
  });
}

const handleZodError = (
  error: ZodError,
  logContext: Record<string, unknown>,
) => {
  const validationErrors = error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
    code: issue.code,
  }));

  // Use the first error message as the main message for better UX
  const [firstError] = validationErrors;
  const mainMessage =
    validationErrors.length === 1 && firstError
      ? firstError.message
      : 'Validation failed';

  throw handleError(
    new ValidationError(mainMessage, {
      errors: validationErrors,
    }),
    logContext,
  );
};
