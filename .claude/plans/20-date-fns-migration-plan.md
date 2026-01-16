# date-fns Migration Plan

**Issue:** #20 - Evaluate date library adoption
**Decision:** Adopt date-fns
**Rationale:** Fix timezone bugs, reduce code duplication, improve maintainability

---

## Phase 1: Setup & Foundation

### 1.1 Install Dependencies
```bash
bun add date-fns date-fns-tz
```

- `date-fns` - Core date utilities (tree-shakeable)
- `date-fns-tz` - Timezone support for proper UTC handling

### 1.2 Create Centralized Date Utilities

Create a new shared utility file that wraps date-fns functions for project-specific use:

**File:** `shared/utils/date.utils.ts`

```typescript
// Re-export commonly used date-fns functions for consistency
export {
  startOfDay,
  endOfDay,
  addDays,
  eachDayOfInterval,
  isToday,
  isSameDay,
  parseISO,
  format,
  getHours,
} from 'date-fns';

export { toZonedTime, fromZonedTime } from 'date-fns-tz';
```

This allows:
- Single import location for all date utilities
- Easy swapping if we ever change libraries
- Consistent usage patterns across codebase

---

## Phase 2: Server-Side Migration

### 2.1 Migrate `server/utils/datetime.utils.ts`

**Current functions to replace:**

| Function | date-fns Replacement |
|----------|---------------------|
| `getStartOfDayTimestamp()` | `startOfDay()` + `.getTime()` |
| `getEndOfDayTimestamp()` | `endOfDay()` + `.getTime()` |
| `isPlayedToday()` | `isSameDay()` |
| `isToday()` | `isToday()` from date-fns |
| `dateInRange()` | `isWithinInterval()` |

**Before:**
```typescript
export const getStartOfDayTimestamp = (date = new Date()) => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  return startOfDay.getTime();
};
```

**After:**
```typescript
import { startOfDay } from 'date-fns';

export const getStartOfDayTimestamp = (date = new Date()) =>
  startOfDay(date).getTime();
```

### 2.2 Migrate `server/services/dailyListen.service.ts`

**Key changes:**

1. **Date iteration** (lines 120-143):
   ```typescript
   // Before
   const currentDate = new Date(startDate);
   currentDate.setHours(0, 0, 0, 0);
   while (currentDate <= end) {
     // ...
     currentDate.setDate(currentDate.getDate() + 1);
   }

   // After
   import { eachDayOfInterval, startOfDay } from 'date-fns';

   eachDayOfInterval({
     start: startOfDay(startDate),
     end: startOfDay(endDate),
   }).forEach((day) => {
     // ... immutable, no mutation
   });
   ```

2. **Date string extraction** (lines 112, 127):
   ```typescript
   // Before
   const dateStr = date.toISOString().split('T')[0];

   // After
   import { format } from 'date-fns';
   const dateStr = format(date, 'yyyy-MM-dd');
   ```

### 2.3 Migrate `server/api/listens.get.ts`

**Key changes:**

1. **Default date range calculation** (lines 10-15):
   ```typescript
   // Before
   const today = new Date();
   today.setHours(23, 59, 59, 999);
   const twoWeeksAgo = new Date();
   twoWeeksAgo.setDate(today.getDate() - 14);
   twoWeeksAgo.setHours(0, 0, 0, 0);

   // After
   import { endOfDay, startOfDay, subDays } from 'date-fns';

   const today = new Date();
   const defaultEnd = endOfDay(today);
   const defaultStart = startOfDay(subDays(today, 14));
   ```

### 2.4 Migrate `server/repositories/dailyListen.repository.ts`

Already uses `setUTCHours()` - update to use date-fns for consistency:

```typescript
// Before
const startOfDay = new Date(date);
startOfDay.setUTCHours(0, 0, 0, 0);

// After
import { startOfDay } from 'date-fns';
// date-fns startOfDay respects the input date's timezone
const dayStart = startOfDay(date);
```

---

## Phase 3: Shared Utils Migration

### 3.1 Migrate `shared/utils/listenTime.utils.ts` (Critical Bug Fix)

**Current bug:** Uses `getHours()` which returns server's local timezone hour.

**Fix:** Use date-fns-tz for timezone-aware hour extraction.

```typescript
// Before (buggy)
export const getTrackListenTime = (playedAt: string): ListenTime => {
  const inRange = inHourRange(new Date(playedAt).getHours());
  // ...
};

// After (timezone-aware)
import { getHours } from 'date-fns';

export const getTrackListenTime = (playedAt: string): ListenTime => {
  // For server-side, use UTC hours since Spotify returns UTC timestamps
  // The hour classification is relative to when the track was played
  const hour = getHours(new Date(playedAt));
  const inRange = inHourRange(hour);
  // ...
};
```

**Note:** For true user-timezone support, we'd need to:
1. Store user's timezone preference in database
2. Pass timezone to this function
3. Use `toZonedTime()` from date-fns-tz

This is a larger feature - for now, consistent UTC handling is the fix.

---

## Phase 4: Client-Side Migration

### 4.1 Migrate `app/utils/dateUtils.ts`

**Current functions:**

| Function | date-fns Replacement |
|----------|---------------------|
| `getDaysInMonth()` | `getDaysInMonth()` from date-fns |
| `getOrdinalSuffix()` | Keep (date-fns doesn't have this) |
| `formatDate()` | `format()` with custom ordinal |

```typescript
// Before
export const getDaysInMonth = (year: number, month: number) =>
  new Date(year, month + 1, 0).getDate();

// After
import { getDaysInMonth as dfnsGetDaysInMonth } from 'date-fns';

export const getDaysInMonth = (year: number, month: number) =>
  dfnsGetDaysInMonth(new Date(year, month));
```

**Keep `getOrdinalSuffix()`** - date-fns `format()` doesn't support English ordinals directly. We can use it with `format()`:

```typescript
import { format, getDate } from 'date-fns';

export const formatDate = (date: Date): string => {
  const day = getDate(date);
  const suffix = getOrdinalSuffix(day);
  return format(date, `MMMM d'${suffix}' yyyy`);
};
```

### 4.2 Migrate `app/composables/utils/useDate.ts`

```typescript
// Before
const isToday = () => {
  const today = new Date();
  return (
    date.value.getDate() === today.getDate() &&
    date.value.getMonth() === today.getMonth() &&
    date.value.getFullYear() === today.getFullYear()
  );
};

// After
import { isToday as dfnsIsToday, isFuture as dfnsIsFuture, parseISO } from 'date-fns';

const isToday = () => dfnsIsToday(date.value);
const isFuture = () => dfnsIsFuture(date.value);
```

### 4.3 Migrate `app/composables/state/useCurrentMonth.ts`

```typescript
// Before
const formattedMonth = computed(() =>
  currentMonth.value.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
);

// After
import { format } from 'date-fns';

const formattedMonth = computed(() => format(currentMonth.value, 'MMMM yyyy'));
```

---

## Phase 5: Test Updates

### 5.1 Update Test Factories

No changes needed - factories use `faker.date.*` methods that return native Date objects, which work with date-fns.

### 5.2 Update Unit Tests

Tests for migrated utility functions need updating to match new implementations. The behavior should remain identical.

**Files to update:**
- `server/utils/datetime.utils.test.ts`
- `app/utils/dateUtils.test.ts`
- `app/composables/utils/useDate.test.ts`
- `shared/utils/listenTime.utils.test.ts`

### 5.3 Run Full Test Suite

```bash
bun run test:unit
bun run test:integration
```

---

## Phase 6: Cleanup & Verification

### 6.1 Remove Duplicate Code

After migration, audit for any remaining:
- Manual `setHours(0,0,0,0)` patterns
- Manual `getDate() + 1` arithmetic
- Duplicate `isToday` implementations

### 6.2 Verify Bundle Size

Check that tree-shaking is working:
```bash
bun run build
# Inspect .output size
```

Expected: ~3-5KB additional for date-fns functions used.

### 6.3 Type Check & Lint

```bash
bun run lint
```

---

## Migration Order (Recommended)

Execute phases in this order to minimize risk:

1. **Phase 1** - Install dependencies, create shared utils
2. **Phase 2.1** - Migrate `server/utils/datetime.utils.ts` (foundational)
3. **Phase 3.1** - Fix `shared/utils/listenTime.utils.ts` (critical bug)
4. **Phase 2.2-2.4** - Remaining server-side files
5. **Phase 4** - Client-side files
6. **Phase 5** - Test updates
7. **Phase 6** - Cleanup and verification

---

## Files Changed Summary

| File | Change Type |
|------|-------------|
| `package.json` | Add dependencies |
| `shared/utils/date.utils.ts` | New file (optional re-exports) |
| `server/utils/datetime.utils.ts` | Refactor |
| `server/services/dailyListen.service.ts` | Refactor |
| `server/api/listens.get.ts` | Refactor |
| `server/repositories/dailyListen.repository.ts` | Refactor |
| `shared/utils/listenTime.utils.ts` | Refactor + bug fix |
| `app/utils/dateUtils.ts` | Refactor |
| `app/composables/utils/useDate.ts` | Refactor |
| `app/composables/state/useCurrentMonth.ts` | Refactor |
| `*.test.ts` files | Update tests |

**Total: ~10 files**

---

## Rollback Plan

If issues arise:
1. `git revert` the migration commits
2. `bun remove date-fns date-fns-tz`
3. All native Date code still works

---

## Success Criteria

- [ ] All existing tests pass
- [ ] No timezone-related bugs in listen time classification
- [ ] No duplicate `isToday`/date utility implementations
- [ ] Bundle size increase < 10KB
- [ ] `bun run lint` passes
