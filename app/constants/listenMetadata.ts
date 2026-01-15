import type { Component } from 'vue';
import type { ListenMethod, ListenOrder, ListenTime } from '#shared/schema';
import { Icons } from '~/components/common/icons';
import type { RadioOption } from '~/components/common/RadioGroup.types';

export interface ListenMetadataConfig {
  label: string;
  icon: string | Component;
}

/**
 * Converts a listen metadata config object to RadioOption array format
 */
export function toRadioOptions<T extends string>(
  config: Record<T, ListenMetadataConfig>,
): RadioOption<T>[] {
  return Object.entries<ListenMetadataConfig>(config).map(
    ([value, { icon, label }]) => ({
      label,
      value: value as T,
      icon,
    }),
  );
}

export const LISTEN_METHOD_CONFIG: Record<ListenMethod, ListenMetadataConfig> =
  {
    spotify: { label: 'Spotify', icon: Icons.SPOTIFY },
    vinyl: { label: 'Vinyl', icon: Icons.VINYL },
    streamed: { label: 'Streamed', icon: Icons.AUDIO_LINES },
  };

export const LISTEN_TIME_CONFIG: Record<ListenTime, ListenMetadataConfig> = {
  morning: { label: 'Morning', icon: Icons.SUNRISE },
  noon: { label: 'Afternoon', icon: Icons.SUN },
  evening: { label: 'Evening', icon: Icons.SUNSET },
  night: { label: 'Night', icon: Icons.MOON_STAR },
};

export const LISTEN_ORDER_CONFIG: Record<ListenOrder, ListenMetadataConfig> = {
  ordered: { label: 'Ordered', icon: Icons.ORDERED },
  shuffled: { label: 'Shuffled', icon: Icons.SHUFFLED },
  interrupted: { label: 'Interrupted', icon: Icons.INTERRUPTED },
};
