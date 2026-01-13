declare module 'h3' {
  interface H3EventContext {
    /**
     * The authenticated user's ID.
     * Guaranteed to be set by auth middleware for all /api/* routes (except /api/auth/*).
     */
    userId: string;
    /**
     * The full session object from BetterAuth.
     * Guaranteed to be set by auth middleware for all /api/* routes (except /api/auth/*).
     */
    session: Awaited<
      ReturnType<typeof import('~/lib/auth').auth.api.getSession>
    >;
  }
}

export {};
