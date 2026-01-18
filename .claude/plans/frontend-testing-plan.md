# Frontend Component Testing Implementation Plan

## Overview

This plan outlines the implementation of @nuxt/test-utils component testing for the DailySpin Nuxt 4 application, specifically targeting the dashboard component testing flow:

1. Load Dashboard - albums should be displayed
2. Scrolls to today
3. Click today's album
4. Modal opens and displays correct data

## Test Flow Components

```
dashboard.vue
├── useListens() composable -> GET /api/listens
├── useFutureListens() composable -> GET /api/future-listens
├── useScrollToToday() composable
├── StickyMonthHeader.vue
├── FutureAlbumDay.vue (for future dates)
│   └── AlbumDayCard.vue
└── PastAlbumDay.vue (for past/today dates)
    ├── AlbumDayCard.vue
    ├── useOverlay() -> LazyDailyListensModal
    └── DailyListensModal.vue
        └── AlbumCarousel.vue
```

## Implementation Steps

### Phase 1: Configuration

1. Update `vitest.config.ts` to add component test project using `defineVitestProject`
2. Add `@nuxt/test-utils/module` to `nuxt.config.ts`
3. Add `test:component` script to `package.json`
4. Create `tests/component.setup.ts` with base mocks

### Phase 2: Test Infrastructure

1. Create component test factories (or reuse existing `api.factory.ts`)
2. Mock `IntersectionObserver` and `scrollTo` globally
3. Set up auth mocking for component tests

### Phase 3: Dashboard Tests

1. Write "albums displayed" test
2. Write "scroll to today" test
3. Write "click album opens modal" test
4. Write "modal displays correct data" test

## Key Dependencies to Mock

1. **API Endpoints**: `GET /api/listens`, `GET /api/future-listens`
2. **Browser APIs**: `IntersectionObserver`, `scrollTo`
3. **NuxtUI**: `useOverlay` for modal tracking

## Test Commands

```bash
# Run only component tests
bun run test:component

# Run component tests in watch mode
bunx vitest --project component --watch

# Run specific test file
bunx vitest --project component app/pages/dashboard.component.ts
```
