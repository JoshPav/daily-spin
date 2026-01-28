import type { Task } from 'nitropack/types';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  createDailyListens,
  createPushSubscription,
  createUser,
} from '~~/tests/db/utils';
import { albumListenInput } from '~~/tests/factories/prisma.factory';

vi.stubGlobal('defineTask', (task: Task<string>) => task);

// Mock the PushService
const mockSendToUser = vi.fn().mockResolvedValue(1);
vi.mock('~~/server/services/push.service', () => ({
  PushService: class MockPushService {
    sendToUser = mockSendToUser;
  },
}));

// Import after mocking
import { sendFavoriteSongReminders } from './sendFavoriteSongReminders';

describe('sendFavoriteSongReminders Task Integration Tests', () => {
  const today = new Date('2026-01-15T20:00:00.000Z');
  const startOfDay = new Date('2026-01-15T00:00:00.000Z');

  beforeAll(() => {
    vi.setSystemTime(today);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return no users when no users have listens today', async () => {
    // Given
    await createUser();

    // When
    const response = await sendFavoriteSongReminders();

    // Then
    expect(response.result).toEqual('No users to remind');
    expect(mockSendToUser).not.toHaveBeenCalled();
  });

  it('should return no users when users have listens but no push subscriptions', async () => {
    // Given
    const user = await createUser();
    await createDailyListens({
      userId: user.id,
      date: startOfDay,
      albumListen: albumListenInput(),
    });

    // When
    const response = await sendFavoriteSongReminders();

    // Then
    expect(response.result).toEqual('No users to remind');
    expect(mockSendToUser).not.toHaveBeenCalled();
  });

  it('should return no users when users have favorite song already set', async () => {
    // Given
    const user = await createUser();
    await createPushSubscription({ userId: user.id });

    const dailyListen = await createDailyListens({
      userId: user.id,
      date: startOfDay,
      albumListen: albumListenInput(),
    });

    // Set favorite song
    const { getTestPrisma } = await import('~~/tests/db/setup');
    await getTestPrisma().dailyListen.update({
      where: { id: dailyListen.id },
      data: {
        favoriteSongId: 'spotify:track:123',
        favoriteSongName: 'Test Song',
        favoriteSongTrackNumber: 1,
      },
    });

    // When
    const response = await sendFavoriteSongReminders();

    // Then
    expect(response.result).toEqual('No users to remind');
    expect(mockSendToUser).not.toHaveBeenCalled();
  });

  it('should send reminder to user with listens but no favorite song', async () => {
    // Given
    const user = await createUser();
    await createPushSubscription({ userId: user.id });
    await createDailyListens({
      userId: user.id,
      date: startOfDay,
      albumListen: albumListenInput(),
    });

    // When
    const response = await sendFavoriteSongReminders();

    // Then
    expect(response.result).toEqual('Sent 1 reminder(s), 0 failed');
    expect(mockSendToUser).toHaveBeenCalledTimes(1);
    expect(mockSendToUser).toHaveBeenCalledWith(user.id, {
      title: 'Pick Your Song of the Day',
      body: 'You listened to 1 album today. Choose your favorite track!',
      data: { type: 'favorite-song', url: '/dashboard' },
      actions: [{ action: 'view', title: 'Choose' }],
    });
  });

  it('should include correct album count in notification', async () => {
    // Given
    const user = await createUser();
    await createPushSubscription({ userId: user.id });
    await createDailyListens({
      userId: user.id,
      date: startOfDay,
      albumListens: [
        albumListenInput(),
        albumListenInput(),
        albumListenInput(),
      ],
    });

    // When
    const response = await sendFavoriteSongReminders();

    // Then
    expect(response.result).toEqual('Sent 1 reminder(s), 0 failed');
    expect(mockSendToUser).toHaveBeenCalledWith(
      user.id,
      expect.objectContaining({
        body: 'You listened to 3 albums today. Choose your favorite track!',
      }),
    );
  });

  it('should send reminders to multiple users', async () => {
    // Given
    const user1 = await createUser();
    const user2 = await createUser();

    await createPushSubscription({ userId: user1.id });
    await createPushSubscription({ userId: user2.id });

    await createDailyListens({
      userId: user1.id,
      date: startOfDay,
      albumListen: albumListenInput(),
    });
    await createDailyListens({
      userId: user2.id,
      date: startOfDay,
      albumListens: [albumListenInput(), albumListenInput()],
    });

    // When
    const response = await sendFavoriteSongReminders();

    // Then
    expect(response.result).toEqual('Sent 2 reminder(s), 0 failed');
    expect(mockSendToUser).toHaveBeenCalledTimes(2);
  });

  it('should not send reminder for listens from previous days', async () => {
    // Given
    const user = await createUser();
    await createPushSubscription({ userId: user.id });

    const yesterday = new Date('2026-01-14T00:00:00.000Z');
    await createDailyListens({
      userId: user.id,
      date: yesterday,
      albumListen: albumListenInput(),
    });

    // When
    const response = await sendFavoriteSongReminders();

    // Then
    expect(response.result).toEqual('No users to remind');
    expect(mockSendToUser).not.toHaveBeenCalled();
  });

  it('should handle push notification failure gracefully', async () => {
    // Given
    const user = await createUser();
    await createPushSubscription({ userId: user.id });
    await createDailyListens({
      userId: user.id,
      date: startOfDay,
      albumListen: albumListenInput(),
    });

    mockSendToUser.mockRejectedValueOnce(new Error('Push failed'));

    // When
    const response = await sendFavoriteSongReminders();

    // Then
    expect(response.result).toEqual('Sent 0 reminder(s), 1 failed');
    expect(response.failed).toBe(1);
  });
});
