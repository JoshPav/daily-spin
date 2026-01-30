import { computed, onMounted, ref } from 'vue';

type NotificationPermission = 'default' | 'granted' | 'denied';

const SERVICE_WORKER_READY_TIMEOUT_MS = 5000;

/**
 * Wait for the service worker to be ready, with a timeout.
 * Returns the registration if ready, or null if timed out.
 */
async function waitForServiceWorkerReady(
  timeoutMs: number,
): Promise<ServiceWorkerRegistration | null> {
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
  ]);
}

/**
 * Convert a base64 VAPID public key to Uint8Array for PushManager
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const usePushNotifications = () => {
  const permission = ref<NotificationPermission>('default');
  const isSubscribed = ref(false);
  const loading = ref(false);
  const supported = ref(false);
  const checking = ref(true);

  const config = useRuntimeConfig();

  const isBlocked = computed(() => permission.value === 'denied');
  const canSubscribe = computed(
    () =>
      supported.value && permission.value !== 'denied' && !isSubscribed.value,
  );

  /**
   * Check if push notifications are supported and get current state
   */
  const checkSupport = async () => {
    if (typeof window === 'undefined') {
      checking.value = false;
      return;
    }

    supported.value =
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window;

    if (!supported.value) {
      checking.value = false;
      return;
    }

    permission.value = Notification.permission;

    // Check if already subscribed (with timeout to prevent hanging on mobile)
    try {
      const registration = await waitForServiceWorkerReady(
        SERVICE_WORKER_READY_TIMEOUT_MS,
      );
      if (registration) {
        const subscription = await registration.pushManager.getSubscription();
        isSubscribed.value = !!subscription;
      }
    } catch (error) {
      console.error('Failed to check push subscription:', error);
    } finally {
      checking.value = false;
    }
  };

  /**
   * Request notification permission from the user
   */
  const requestPermission = async (): Promise<boolean> => {
    if (!supported.value) return false;

    try {
      const result = await Notification.requestPermission();
      permission.value = result;
      return result === 'granted';
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    }
  };

  /**
   * Subscribe to push notifications
   * NOTE: Permission should be requested in toggle() before calling this,
   * to ensure it happens directly on user gesture (required by mobile browsers).
   * NOTE: Loading state is managed by toggle(), not this function.
   */
  const subscribe = async (): Promise<boolean> => {
    if (!supported.value || !config.public.vapidPublicKey) {
      console.warn(
        'Push notifications not supported or VAPID key not configured',
      );
      return false;
    }

    // Permission must already be granted (requested in toggle before this call)
    if (permission.value !== 'granted') {
      console.warn('Permission not granted before subscribe call');
      return false;
    }

    const registration = await waitForServiceWorkerReady(
      SERVICE_WORKER_READY_TIMEOUT_MS,
    );
    if (!registration) {
      console.warn('Service worker not ready for push subscription');
      return false;
    }

    // Subscribe to push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        config.public.vapidPublicKey as string,
      ),
    });

    // Send subscription to server
    const subscriptionJson = subscription.toJSON();
    await $fetch('/api/push/subscribe', {
      method: 'POST',
      body: {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscriptionJson.keys?.p256dh,
          auth: subscriptionJson.keys?.auth,
        },
        expirationTime: subscription.expirationTime,
      },
    });

    isSubscribed.value = true;
    return true;
  };

  /**
   * Unsubscribe from push notifications
   */
  const unsubscribe = async (): Promise<boolean> => {
    if (!supported.value) return false;

    loading.value = true;

    try {
      const registration = await waitForServiceWorkerReady(
        SERVICE_WORKER_READY_TIMEOUT_MS,
      );
      if (!registration) {
        console.warn('Service worker not ready for push unsubscription');
        return false;
      }
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Notify server first
        await $fetch('/api/push/unsubscribe', {
          method: 'POST',
          body: {
            endpoint: subscription.endpoint,
          },
        });

        // Then unsubscribe locally
        await subscription.unsubscribe();
      }

      isSubscribed.value = false;
      return true;
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      return false;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Toggle subscription state
   * IMPORTANT: On mobile browsers, requestPermission must be called as directly
   * as possible from user gesture. We call it here before any other async work.
   */
  const toggle = async (): Promise<boolean> => {
    if (isSubscribed.value) {
      return unsubscribe();
    }

    // Set loading immediately so user sees feedback
    loading.value = true;

    try {
      // Request permission immediately on user gesture (critical for mobile browsers)
      // This must happen BEFORE any async operations to satisfy iOS Safari's requirements
      if (permission.value !== 'granted') {
        const granted = await requestPermission();
        if (!granted) {
          return false;
        }
      }

      return await subscribe();
    } catch (error) {
      console.error('Failed to toggle push notifications:', error);
      return false;
    } finally {
      // Ensure loading is always reset
      // Note: subscribe() also sets loading=false, but this catches any edge cases
      loading.value = false;
    }
  };

  onMounted(() => {
    checkSupport();
  });

  return {
    // State
    permission,
    isSubscribed,
    loading,
    supported,
    checking,
    // Computed
    isBlocked,
    canSubscribe,
    // Methods
    requestPermission,
    subscribe,
    unsubscribe,
    toggle,
    checkSupport,
  };
};
