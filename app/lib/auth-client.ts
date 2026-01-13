import { createAuthClient } from 'better-auth/vue';

export const { signIn, signOut, useSession, getSession, getAccessToken } =
  createAuthClient();
