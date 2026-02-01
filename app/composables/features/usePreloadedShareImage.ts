import { toPng } from 'html-to-image';
import { type MaybeRefOrGetter, ref, toValue, watch } from 'vue';
import { SHARE_IMAGE_CONFIG } from '~/constants/shareConfig';

export interface UsePreloadedShareImageOptions {
  /** Function that returns the HTML element to capture */
  getElement: () => HTMLElement | null | undefined;
  /** When true, start preloading in the background */
  shouldPreload: MaybeRefOrGetter<boolean>;
}

export interface UsePreloadedShareImageReturn {
  /**
   * Get the image blob. Returns immediately if preloaded,
   * otherwise waits for generation to complete.
   */
  getImage: () => Promise<Blob>;
  /**
   * True only when user has requested the image and we're
   * still waiting for it to generate. Use this for button loading states.
   */
  isWaiting: Readonly<Ref<boolean>>;
  /** Reset the preloaded image (e.g., when data changes) */
  reset: () => void;
}

/**
 * Composable that preloads a share image in the background.
 *
 * The image is generated as soon as `shouldPreload` becomes true.
 * When the user requests the image via `getImage()`:
 * - If already preloaded: returns immediately
 * - If still generating: sets `isWaiting` to true and waits
 * - If not started: starts generation and waits
 *
 * The `isWaiting` ref is only true when the user has requested
 * the image and we're waiting - NOT during background preloading.
 */
export const usePreloadedShareImage = (
  options: UsePreloadedShareImageOptions,
): UsePreloadedShareImageReturn => {
  const { getElement, shouldPreload } = options;

  // State
  const preloadedBlob = ref<Blob | null>(null);
  const isWaiting = ref(false);

  // Promise tracking for concurrent requests
  let preloadPromise: Promise<Blob> | null = null;

  /**
   * Generate the image from the DOM element
   */
  const generateImage = async (): Promise<Blob> => {
    const element = getElement();
    if (!element) {
      throw new Error('Element not available for image generation');
    }

    const dataUrl = await toPng(element, {
      width: SHARE_IMAGE_CONFIG.width,
      height: SHARE_IMAGE_CONFIG.height,
      pixelRatio: SHARE_IMAGE_CONFIG.pixelRatio,
      cacheBust: true,
      fetchRequestInit: {
        mode: 'cors',
      },
    });

    const response = await fetch(dataUrl);
    return response.blob();
  };

  /**
   * Start preloading in the background and return the promise
   */
  const startPreload = (): Promise<Blob> => {
    if (preloadPromise) {
      return preloadPromise;
    }

    if (preloadedBlob.value) {
      return Promise.resolve(preloadedBlob.value);
    }

    preloadPromise = generateImage()
      .then((blob) => {
        preloadedBlob.value = blob;
        return blob;
      })
      .catch((error) => {
        // Reset on error so next attempt can try again
        preloadPromise = null;
        throw error;
      });

    return preloadPromise;
  };

  /**
   * Get the image, waiting if necessary
   */
  const getImage = async (): Promise<Blob> => {
    // If already preloaded, return immediately
    if (preloadedBlob.value) {
      return preloadedBlob.value;
    }

    // If preloading in progress, wait for it
    if (preloadPromise) {
      isWaiting.value = true;
      try {
        return await preloadPromise;
      } finally {
        isWaiting.value = false;
      }
    }

    // Not started yet, start now and wait
    isWaiting.value = true;
    try {
      return await startPreload();
    } finally {
      isWaiting.value = false;
    }
  };

  /**
   * Reset the preloaded image
   */
  const reset = () => {
    preloadedBlob.value = null;
    preloadPromise = null;
  };

  // Watch for shouldPreload to become true and start preloading
  watch(
    () => toValue(shouldPreload),
    (should) => {
      if (should) {
        // Small delay to ensure DOM is ready after data loads
        setTimeout(() => {
          startPreload();
        }, 100);
      } else {
        reset();
      }
    },
    { immediate: true },
  );

  return {
    getImage,
    isWaiting,
    reset,
  };
};
