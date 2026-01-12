import { auth } from '~/lib/auth';

/**
 * Authentication middleware that runs for all API routes.
 * Extracts the session and attaches userId to event.context.
 * Throws 401 if authentication is required but not present.
 */
export default defineEventHandler(async (event) => {
  const path = event.path;

  // Skip auth check for auth routes themselves
  if (path.startsWith('/api/auth/')) {
    return;
  }

  // For API routes (except auth), require authentication
  if (path.startsWith('/api/')) {
    const session = await auth.api.getSession({
      headers: event.node.req.headers as HeadersInit,
    });

    if (!session?.user?.id) {
      throw createError({
        statusCode: 401,
        message: 'Unauthorized - please log in',
      });
    }

    // Attach session and userId to context - guaranteed to exist for API routes
    event.context.session = session;
    event.context.userId = session.user.id;
  }
});
