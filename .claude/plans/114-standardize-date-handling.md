# Plan: Standardize Date Handling to `YYYY-MM-DD` (#114)

## Overview

This plan outlines the work required to standardize date handling across the DailySpin API and frontend to use `YYYY-MM-DD` format instead of full ISO datetime strings for day-level date fields.

## Current State Analysis

### Database Layer
- `DailyListen.date` and `FutureListen.date` use `DateTime @db.Date` (date-only storage)
- No changes needed at the database level

### API Layer - Current Patterns
| Location | Current Format | Target Format |
|----------|---------------|---------------|
| GET `/api/listens` response | `2026-01-15T00:00:00.000Z` | `2026-01-15` |
| GET `/api/listens` query params | Full ISO datetime | `YYYY-MM-DD` |
| POST `/api/listens` body | Full ISO datetime | `YYYY-MM-DD` |
| PATCH `/api/listens/[date]/*` path param | Already expects `YYYY-MM-DD` | `YYYY-MM-DD` |
| GET `/api/future-listens` response | `2026-01-15T00:00:00.000Z` | `2026-01-15` |
| POST `/api/future-listens` body | Full ISO datetime | `YYYY-MM-DD` |
| DELETE `/api/future-listens/:id` | N/A | N/A |
| GET `/api/backlog` response `addedAt` | Full ISO datetime | Keep as-is (timestamp) |

### Frontend Layer - Current Patterns
- `toDateKey()` utility already extracts `YYYY-MM-DD` from ISO strings
- API calls use `.toISOString()` for date parameters
- Calendar components use `YYYY-MM-DD` keys internally

---

## Implementation Phases

### Phase 1: Schema Definitions

Create reusable date schema helpers and update all shared schemas.

**Files to modify:**
- `shared/schemas/common.schema.ts`
- `shared/schemas/listens.schema.ts`
- `shared/schemas/futureListen.schema.ts`

**Changes:**

1. **Add new date format helpers** in `common.schema.ts`:
   ```typescript
   // YYYY-MM-DD date string schema for API requests/responses
   export const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
     message: 'Date must be in YYYY-MM-DD format',
   });

   // Transform YYYY-MM-DD string to Date object (for internal use)
   export const dateStringToDate = dateString.transform((d) => new Date(`${d}T00:00:00.000Z`));

   // Optional date query parameter
   export const optionalDateQuery = z
     .string()
     .regex(/^\d{4}-\d{2}-\d{2}$/)
     .optional();
   ```

2. **Update `listens.schema.ts`**:
   - Change `DailyListensSchema.date` from `z.string()` to `dateString`
   - Update `getListensSchema.query` to use `optionalDateQuery` instead of `optionalDateTimeQuery`
   - Update `addAlbumListenSchema.body.date` to use `dateString`

3. **Update `futureListen.schema.ts`**:
   - Change `FutureListenItemSchema.date` from `z.string()` to `dateString`
   - Update `addFutureListenSchema.body.date` to use `dateString`

---

### Phase 2: Server-Side Mappers & Services

Update all code that transforms dates for API responses.

**Files to modify:**
- `server/mappers/listenMapper.ts`
- `server/services/futureListen.service.ts`
- `server/services/dailyListen.service.ts`

**Changes:**

1. **Create a date formatting utility** (if not exists) in `server/utils/date.ts`:
   ```typescript
   import { format } from 'date-fns';

   /** Formats a Date to YYYY-MM-DD string for API responses */
   export const toDateString = (date: Date): string => format(date, 'yyyy-MM-dd');
   ```

2. **Update `listenMapper.ts`** (line 7):
   ```typescript
   // Before
   date: dailyListens.date.toISOString(),

   // After
   date: toDateString(dailyListens.date),
   ```

3. **Update `futureListen.service.ts`** (line 26):
   ```typescript
   // Before
   date: item.date.toISOString(),

   // After
   date: toDateString(item.date),
   ```

4. **Update `dailyListen.service.ts`** `fillMissingDays()` method (line 170):
   ```typescript
   // Before
   date: day.toISOString(),

   // After
   date: toDateString(day),
   ```

---

### Phase 3: API Request Handling

Update API handlers to parse `YYYY-MM-DD` date strings.

**Files to modify:**
- `server/api/listens/index.get.ts`
- `server/api/listens/index.post.ts`
- `server/api/future-listens/index.post.ts`

**Changes:**

1. **GET `/api/listens`**: Query params already transformed by schema. Verify the new schema transforms `YYYY-MM-DD` to Date correctly.

2. **POST `/api/listens`**: The service receives the validated body. Update date parsing:
   ```typescript
   // The schema transforms YYYY-MM-DD to Date, so this should work as-is
   // Just verify the flow: body.date is now a Date after schema transformation
   ```

3. **POST `/api/future-listens`**: Same pattern - verify schema transformation works.

---

### Phase 4: Frontend API Calls

Update all frontend composables that send dates to the API.

**Files to modify:**
- `app/composables/api/useListens.ts`
- `app/composables/api/useLogAlbum.ts`
- `app/composables/api/useScheduleAlbum.ts` (if exists)
- `app/composables/api/useFavoriteSong.ts` (already uses correct format)

**Changes:**

1. **Update `useListens.ts`** (lines 41-42):
   ```typescript
   // Before
   query: {
     startDate: startDate.toISOString(),
     endDate: endDate.toISOString(),
   }

   // After
   query: {
     startDate: toDateKey(startDate),
     endDate: toDateKey(endDate),
   }
   ```

2. **Update `useLogAlbum.ts`** (line 37):
   ```typescript
   // Before
   date: date.toISOString(),

   // After
   date: toDateKey(date),
   ```

3. **Update any other composables** that send dates in request bodies.

---

### Phase 5: Frontend Date Parsing

Update frontend code that receives dates from the API.

**Files to check/modify:**
- `app/utils/dateUtils.ts` - Already handles both formats via `toDateKey()`
- `app/composables/` - Check for places that parse API date strings
- `app/components/` - Check for direct date parsing from API responses

**Changes:**

1. **Verify `toDateKey()`** handles the new format (it already does - just extracts `YYYY-MM-DD`).

2. **Search for places that create `new Date()` from API response dates** and ensure they handle `YYYY-MM-DD`:
   ```typescript
   // When parsing YYYY-MM-DD for display/manipulation:
   // Option A: Just use the string directly for comparisons
   // Option B: If Date object needed: new Date(`${dateString}T00:00:00`)
   ```

3. **Update any date comparisons** to use string comparison where appropriate (since `YYYY-MM-DD` strings sort correctly).

---

### Phase 6: Test Updates

Update all tests to use the new date format.

**Test files to modify:**
- `server/api/listens/index.get.integration.ts`
- `server/api/listens/index.post.integration.ts`
- `server/api/future-listens/*.integration.ts`
- `tests/factories/` - May need to update factory date output
- Any component tests that mock API responses

**Changes:**

1. **Update expected API response dates**:
   ```typescript
   // Before
   expect(result[0].date).toBe('2026-01-15T00:00:00.000Z');

   // After
   expect(result[0].date).toBe('2026-01-15');
   ```

2. **Update test request payloads**:
   ```typescript
   // Before
   body: { date: '2026-01-15T00:00:00.000Z', ... }

   // After
   body: { date: '2026-01-15', ... }
   ```

3. **Update query parameter tests**:
   ```typescript
   // Before
   query: { startDate: '2026-01-15T00:00:00.000Z', endDate: '2026-01-16T00:00:00.000Z' }

   // After
   query: { startDate: '2026-01-15', endDate: '2026-01-16' }
   ```

---

## File Change Summary

| File | Changes |
|------|---------|
| `shared/schemas/common.schema.ts` | Add `dateString`, `dateStringToDate`, `optionalDateQuery` helpers |
| `shared/schemas/listens.schema.ts` | Update date fields to use new helpers |
| `shared/schemas/futureListen.schema.ts` | Update date fields to use new helpers |
| `server/utils/date.ts` | Add `toDateString()` utility (new file or add to existing) |
| `server/mappers/listenMapper.ts` | Use `toDateString()` instead of `.toISOString()` |
| `server/services/futureListen.service.ts` | Use `toDateString()` in mapper |
| `server/services/dailyListen.service.ts` | Use `toDateString()` in `fillMissingDays()` |
| `app/composables/api/useListens.ts` | Use `toDateKey()` for query params |
| `app/composables/api/useLogAlbum.ts` | Use `toDateKey()` for request body date |
| `app/composables/api/useScheduleAlbum.ts` | Use `toDateKey()` for request body date |
| `server/api/listens/*.integration.ts` | Update test expectations |
| `server/api/future-listens/*.integration.ts` | Update test expectations |
| Component test files | Update mocked API response dates |

---

## Testing Strategy

1. **Unit Tests**: Verify new schema validators accept `YYYY-MM-DD` and reject invalid formats
2. **Integration Tests**: Run full API integration tests with new format
3. **Component Tests**: Verify frontend correctly handles new response format
4. **Manual Testing**:
   - Log an album and verify it appears on correct day
   - Schedule a future listen and verify date displays correctly
   - Check dashboard calendar view shows correct dates
   - Test across different browser timezones

---

## Rollout Considerations

### Breaking Change Handling
This is a breaking API change. Options:

1. **Big bang** (recommended for this project): Update all at once since:
   - Internal application with no external API consumers
   - Frontend and backend deployed together
   - Simplifies implementation

2. **Gradual migration** (if needed):
   - Accept both formats on input during transition
   - Always return new format in responses
   - Remove old format acceptance after frontend is updated

### Backwards Compatibility Notes
- Existing data in database uses Date objects, unaffected
- Cached API responses on client may have old format - `toDateKey()` already handles this
- No database migration needed

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Timezone bugs in Date parsing | Medium | High | Always create dates at UTC midnight: `new Date('${dateString}T00:00:00.000Z')` |
| Missed date conversion location | Medium | Medium | Comprehensive grep for `.toISOString()` and date string patterns |
| Test failures | High | Low | Expected; update tests as part of implementation |
| Frontend date comparison bugs | Low | Medium | Use string comparison for YYYY-MM-DD where possible |

---

## Definition of Done

- [ ] All API responses return dates in `YYYY-MM-DD` format
- [ ] All API requests accept dates in `YYYY-MM-DD` format
- [ ] Frontend sends dates as `YYYY-MM-DD` strings
- [ ] All integration tests pass with new format
- [ ] All component tests pass
- [ ] Manual testing confirms no date shifting across timezones
- [ ] No `toISOString()` calls remain for day-level date fields

---

## Estimated Effort

This is a medium-sized refactoring task touching multiple layers:
- Schema changes: ~1 hour
- Server-side changes: ~2 hours
- Frontend changes: ~1 hour
- Test updates: ~2 hours
- Manual testing: ~1 hour

**Total: ~7 hours of implementation work**
