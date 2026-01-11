import merge from 'lodash.merge';

export type Factory<T> = (overrides?: Partial<T>) => T;

export const createFactory =
  <T>(defaultVal: T): Factory<T> =>
  (overrides: Partial<T> = {}) =>
    merge(defaultVal, overrides);
