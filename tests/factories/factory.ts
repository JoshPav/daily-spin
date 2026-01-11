import merge from 'lodash.merge';

export type Factory<T> = (overrides?: Partial<T>) => T;

export const createFactory =
  <T>(defaultVal: T | (() => T)): Factory<T> =>
  (overrides: Partial<T> = {}) => {
    const base = typeof defaultVal === 'function' ? (defaultVal as () => T)() : defaultVal;
    return merge({}, base, overrides);
  };
