import { toPng } from 'html-to-image';
import { SHARE_IMAGE_CONFIG } from '~/constants/shareConfig';

export interface UseShareImageReturn {
  /** Generate a PNG blob from a DOM element */
  generateImage: (element: HTMLElement) => Promise<Blob>;
  /** Download a blob as a file */
  downloadImage: (blob: Blob, filename: string) => void;
  /** Share an image using Web Share API (returns false if not supported) */
  shareImage: (blob: Blob, title: string) => Promise<boolean>;
  /** Check if Web Share API is available */
  canShare: () => boolean;
}

/**
 * Composable for generating and sharing images from DOM elements.
 * Uses html-to-image for rendering and Web Share API for native sharing.
 */
export const useShareImage = (): UseShareImageReturn => {
  /**
   * Generate a PNG blob from a DOM element
   */
  const generateImage = async (element: HTMLElement): Promise<Blob> => {
    const dataUrl = await toPng(element, {
      width: SHARE_IMAGE_CONFIG.width,
      height: SHARE_IMAGE_CONFIG.height,
      pixelRatio: SHARE_IMAGE_CONFIG.pixelRatio,
      cacheBust: true,
      fetchRequestInit: {
        mode: 'cors',
      },
    });

    // Convert data URL to blob
    const response = await fetch(dataUrl);
    return response.blob();
  };

  /**
   * Download a blob as a file using a temporary anchor element
   */
  const downloadImage = (blob: Blob, filename: string): void => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  /**
   * Share an image using the native Web Share API
   * Returns true if share was initiated, false if not supported
   */
  const shareImage = async (blob: Blob, title: string): Promise<boolean> => {
    if (!canShare()) {
      return false;
    }

    const file = new File([blob], `${title}.png`, { type: 'image/png' });
    const shareData: ShareData = {
      title,
      files: [file],
    };

    // Check if this specific share is supported (files sharing)
    if (!navigator.canShare?.(shareData)) {
      return false;
    }

    await navigator.share(shareData);
    return true;
  };

  /**
   * Check if Web Share API with file sharing is available
   */
  const canShare = (): boolean => {
    return (
      typeof navigator !== 'undefined' &&
      !!navigator.share &&
      !!navigator.canShare
    );
  };

  return {
    generateImage,
    downloadImage,
    shareImage,
    canShare,
  };
};
