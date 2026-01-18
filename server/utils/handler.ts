import type { H3Event } from 'h3';
import { ZodError, type ZodType, type z } from 'zod';
import type { ApiSchema } from '~~/shared/schemas/common.schema';
import { handleError } from './errorHandler';
import { ValidationError } from './errors';
import { getLogContext } from './requestContext';

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
 *
 * @example
 * // Define schema in shared/schemas/listens.schema.ts
 * export const getListensSchema = {
 *   query: z.object({
 *     startDate: z.string(),
 *     endDate: z.string(),
 *   }),
 *   response: z.array(DailyListensSchema),
 * } satisfies ApiSchema;
 *
 * // Use in handler
 * export default createEventHandler(getListensSchema, async (event) => {
 *   const { startDate, endDate } = event.validatedQuery;
 *   // Types are inferred, validation is automatic!
 *   return listens;
 * });
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
