import { faker } from '@faker-js/faker';
import type { Prisma } from '@prisma/client';
import { createFactory } from './factory';

export const userCreateInput = createFactory<Prisma.UserCreateInput>(() => ({
  email: faker.internet.email(),
  name: faker.person.fullName(),
  trackListeningHistory: true,
  createTodaysAlbumPlaylist: true,
  createSongOfDayPlaylist: true,
  accounts: {
    create: {
      providerId: 'spotify',
      accountId: faker.string.uuid(),
      id: faker.string.uuid(),
      accessToken: faker.internet.jwt(),
      refreshToken: faker.internet.jwt(),
      accessTokenExpiresAt: faker.date.soon({ days: 1 }),
      scope:
        'user-read-recently-played playlist-modify-public playlist-modify-private',
    },
  },
  sessions: {
    create: {
      id: faker.string.uuid(),
      token: faker.internet.jwt(),
      expiresAt: faker.date.soon({ days: 1 }),
    },
  },
}));
