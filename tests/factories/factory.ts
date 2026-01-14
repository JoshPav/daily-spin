import merge from 'lodash.merge';

export type Factory<T> = (overrides?: DeepPartial<T>) => T;

type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

export const createFactory =
  <T>(defaultVal: T | (() => T)): Factory<T> =>
  (overrides: DeepPartial<T> = {} as DeepPartial<T>) => {
    const base =
      typeof defaultVal === 'function' ? (defaultVal as () => T)() : defaultVal;
    return merge({}, base, overrides);
  };
