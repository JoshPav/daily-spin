import { customSessionClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/vue';
import type { auth } from '../../shared/auth';

export const {
  signIn,
  signOut,
  useSession,
  getSession,
  getAccessToken,
  refreshToken,
} = createAuthClient({
  plugins: [customSessionClient<typeof auth>()],
});
