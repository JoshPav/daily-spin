/**
 * Push notification browser API mocks for component tests.
 *
 * These mocks simulate the browser's Push API, Notification API, and Service Worker
 * to enable testing push notification functionality without real browser support.
 *
 * @example
 * import {
 *   setupPushNotificationMocks,
 *   createMockPushSubscription,
 *   setMockNotificationPermission,
 *   setMockPushSubscription,
 *   resetPushNotificationMocks,
 * } from '~~/tests/component';
 *
 * beforeEach(() => {
 *   resetPushNotificationMocks();
 *   setupPushNotificationMocks();
 * });
 */

/** Valid base64url-encoded VAPID public key for testing (65 bytes for P-256) */
export const TEST_VAPID_PUBLIC_KEY =
  'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';

/** Mock state - can be modified by tests */
let mockNotificationPermission: NotificationPermission = 'default';
let mockPushSubscription: PushSubscription | null = null;

/** Set the mock notification permission state */
export const setMockNotificationPermission = (
  permission: NotificationPermission,
): void => {
  mockNotificationPermission = permission;
};

/** Set the mock push subscription state */
export const setMockPushSubscription = (
  subscription: PushSubscription | null,
): void => {
  mockPushSubscription = subscription;
};

/** Reset all push notification mock state to defaults */
export const resetPushNotificationMocks = (): void => {
  mockNotificationPermission = 'default';
  mockPushSubscription = null;
};

/** Create a mock PushSubscription object */
export const createMockPushSubscription = (): PushSubscription => ({
  endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint',
  expirationTime: null,
  options: {
    applicationServerKey: null,
    userVisibleOnly: true,
  },
  getKey: () => null,
  toJSON: () => ({
    endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint',
    keys: {
      p256dh: 'test-p256dh-key',
      auth: 'test-auth-key',
    },
  }),
  unsubscribe: async () => {
    mockPushSubscription = null;
    return true;
  },
});

/** Create a mock PushManager object */
const createMockPushManager = (): PushManager => ({
  getSubscription: async () => mockPushSubscription,
  subscribe: async () => {
    mockPushSubscription = createMockPushSubscription();
    return mockPushSubscription;
  },
  permissionState: async () => mockNotificationPermission as PermissionState,
});

/** Create a mock ServiceWorkerRegistration object */
const createMockServiceWorkerRegistration = (): ServiceWorkerRegistration =>
  ({
    pushManager: createMockPushManager(),
    scope: '/',
    active: {} as ServiceWorker,
    installing: null,
    waiting: null,
    updateViaCache: 'imports' as ServiceWorkerUpdateViaCache,
  }) as unknown as ServiceWorkerRegistration;

/**
 * Setup browser API mocks for push notifications.
 * Call this in beforeEach after setting any custom permission/subscription state.
 *
 * Mocks:
 * - window.Notification (with permission and requestPermission)
 * - window.PushManager
 * - navigator.serviceWorker
 */
export const setupPushNotificationMocks = (): void => {
  // Mock Notification API
  // biome-ignore lint/complexity/noStaticOnlyClass: mocking extnerla lib
  const MockNotification = class {
    static permission: NotificationPermission = mockNotificationPermission;
    static requestPermission = async () => {
      mockNotificationPermission = 'granted';
      MockNotification.permission = 'granted';
      return 'granted' as NotificationPermission;
    };
  };
  Object.defineProperty(window, 'Notification', {
    value: MockNotification,
    writable: true,
    configurable: true,
  });

  // Mock PushManager on window
  Object.defineProperty(window, 'PushManager', {
    value: class {},
    writable: true,
    configurable: true,
  });

  // Mock navigator.serviceWorker
  Object.defineProperty(navigator, 'serviceWorker', {
    value: {
      ready: Promise.resolve(createMockServiceWorkerRegistration()),
      controller: {} as ServiceWorker,
      getRegistration: async () => createMockServiceWorkerRegistration(),
      getRegistrations: async () => [createMockServiceWorkerRegistration()],
      register: async () => createMockServiceWorkerRegistration(),
      addEventListener: () => {},
      removeEventListener: () => {},
    },
    writable: true,
    configurable: true,
  });
};
