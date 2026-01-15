import type { RouteLocationNormalizedGeneric } from 'vue-router';

export enum Route {
  DASHBOARD = '/dashboard',
  BACKLOG = '/backlog',
  LANDING_PAGE = '/',
}

export const isNavigatingTo = (
  to: RouteLocationNormalizedGeneric,
  route: Route,
) => to.path === route;
