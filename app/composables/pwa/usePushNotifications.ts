import { computed, onMounted, ref } from 'vue';

type NotificationPermission = 'default' | 'granted' | 'denied';

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
    if (typeof window === 'undefined') return;

    supported.value =
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window;

    if (!supported.value) return;

    permission.value = Notification.permission;

    // Check if already subscribed
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      isSubscribed.value = !!subscription;
    } catch (error) {
      console.error('Failed to check push subscription:', error);
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
   */
  const subscribe = async (): Promise<boolean> => {
    if (!supported.value || !config.public.vapidPublicKey) {
      console.warn(
        'Push notifications not supported or VAPID key not configured',
      );
      return false;
    }

    loading.value = true;

    try {
      // Request permission if not already granted
      if (permission.value !== 'granted') {
        const granted = await requestPermission();
        if (!granted) {
          loading.value = false;
          return false;
        }
      }

      const registration = await navigator.serviceWorker.ready;

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
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      return false;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Unsubscribe from push notifications
   */
  const unsubscribe = async (): Promise<boolean> => {
    if (!supported.value) return false;

    loading.value = true;

    try {
      const registration = await navigator.serviceWorker.ready;
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
   */
  const toggle = async (): Promise<boolean> => {
    if (isSubscribed.value) {
      return unsubscribe();
    }
    return subscribe();
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
