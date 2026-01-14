import type { defineEventHandler } from 'h3';
import { vi } from 'vitest';

export type EventHandler<T = unknown> = ReturnType<
  typeof defineEventHandler<Request, Promise<T>>
>;
export type HandlerEvent<T = unknown> = Parameters<EventHandler<T>>[0];

vi.stubGlobal('defineEventHandler', (handler: EventHandler) => handler);

vi.stubGlobal('readBody', (event: HandlerEvent) => {
  const body = (event as unknown as { _requestBody: string })._requestBody;
  return typeof body === 'string' ? JSON.parse(body) : undefined;
});

vi.stubGlobal('getQuery', (event: HandlerEvent) => {
  const path = event._path;
  return Object.fromEntries(new URLSearchParams(path?.split('?')[1]).entries());
});

vi.stubGlobal('getRouterParam', (event: HandlerEvent, param: string) => {
  const params = (event as unknown as { _routerParams: Record<string, string> })
    ._routerParams;
  return params?.[param];
});

vi.stubGlobal(
  'createError',
  (options: { statusCode: number; message: string }) => {
    const error = new Error(options.message);
    Object.assign(error, options);
    return error;
  },
);
