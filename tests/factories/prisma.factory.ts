import { faker } from '@faker-js/faker';
import type { Prisma } from '@prisma/client';
import { createFactory } from './factory';

export const userCreateInput = createFactory<Prisma.UserCreateInput>(() => ({
  email: faker.internet.email(),
  name: faker.person.fullName(),
  accounts: {
    create: {
      providerId: 'spotify',
      accountId: faker.string.uuid(),
      id: faker.string.uuid(),
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
