import type { H3Event } from 'h3';
import { auth } from '~/lib/auth';

/**
 * Gets the authenticated user ID from the session.
 * Throws a 401 error if the user is not authenticated.
 */
export const getAuthenticatedUserId = async (
  event: H3Event,
): Promise<string> => {
  const session = await auth.api.getSession({
    headers: event.node.req.headers as HeadersInit,
  });

  if (!session?.user?.id) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized - please log in',
    });
  }

  return session.user.id;
};
