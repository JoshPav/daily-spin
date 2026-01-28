/**
 * Share image configuration for Instagram Stories format
 */
export const SHARE_IMAGE_CONFIG = {
  /** Instagram Stories dimensions (9:16 aspect ratio) */
  width: 1080,
  height: 1920,
  /** Pixel ratio for retina displays */
  pixelRatio: 2,
} as const;

/**
 * Calendar grid configuration for monthly summary
 */
export const CALENDAR_GRID_CONFIG = {
  /** Number of columns in the calendar grid */
  columns: 5,
  /** Maximum number of days in a month */
  maxDays: 31,
} as const;
