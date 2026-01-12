import { createAuthClient } from 'better-auth/vue';

export const authClient = createAuthClient({
  /** The base URL of the server (optional if you're using the same domain) */
  baseURL: 'http://127.0.0.1:3000',
});

const { useSession, signOut } = authClient;

export { useSession, signOut };
