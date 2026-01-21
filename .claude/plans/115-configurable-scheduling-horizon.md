# Plan: Configurable Scheduling Horizon (Issue #115)

## Summary

Allow users to configure how far into the future backlog albums are automatically scheduled, replacing the current hardcoded 7-day horizon.

## Current State

- **Hardcoded horizon**: `server/tasks/scheduleBacklogListens.ts:41` always passes `7` to `BacklogService.scheduleBacklogToFutureListens()`
- **User preferences**: Stored in `User` model with 3 boolean flags
- **Scheduling logic**: `backlog.service.ts` already accepts `daysAhead` parameter
- **Preferences UI**: `app/pages/preferences.vue` uses `PreferenceToggle` components
- **Preferences form**: `app/composables/api/usePreferencesForm.ts` manages local state and API calls

---

## Implementation Steps

### Phase 1: Database Schema

**Step 1.1: Add `scheduleAheadDays` field to User model**

File: `prisma/schema.prisma` (after line 25)

```prisma
model User {
  // ... existing fields
  trackListeningHistory     Boolean @default(true)
  createTodaysAlbumPlaylist Boolean @default(true)
  createSongOfDayPlaylist   Boolean @default(true)
  scheduleAheadDays         Int     @default(14)  // NEW
}
```

**Step 1.2: Create and run migration**

```bash
bun run db:migrate --name add-schedule-ahead-days
```

---

### Phase 2: Shared Schema & Constants

**Step 2.1: Add constants**

File: `shared/schemas/preferences.schema.ts`

```typescript
// Add at top of file
export const SCHEDULE_AHEAD_MIN = 1;
export const SCHEDULE_AHEAD_MAX = 90;
export const SCHEDULE_AHEAD_DEFAULT = 14;
```

**Step 2.2: Update UserPreferencesSchema**

```typescript
export const UserPreferencesSchema = z.object({
  trackListeningHistory: z.boolean(),
  createTodaysAlbumPlaylist: z.boolean(),
  createSongOfDayPlaylist: z.boolean(),
  scheduleAheadDays: z.number().int().min(SCHEDULE_AHEAD_MIN).max(SCHEDULE_AHEAD_MAX),
});
```

The `updatePreferencesSchema` already uses `UserPreferencesSchema.partial()`, so it will automatically support partial updates.

---

### Phase 3: Repository Updates

**Step 3.1: Update User Repository**

File: `server/repositories/user.repository.ts`

Update the `getPreferences()` select clause to include `scheduleAheadDays`:

```typescript
const select = {
  trackListeningHistory: true,
  createTodaysAlbumPlaylist: true,
  createSongOfDayPlaylist: true,
  scheduleAheadDays: true,  // ADD
};
```

Update `updatePreferences()` to handle the new field (should work automatically if using spread).

**Step 3.2: Update user fetching for task**

File: `server/services/user.service.ts`

Update `fetchUsersForRecentlyPlayedProcessing()` to include `scheduleAheadDays`:

```typescript
select: {
  id: true,
  scheduleAheadDays: true,  // ADD
}
```

---

### Phase 4: Task Update

**Step 4.1: Update scheduling task**

File: `server/tasks/scheduleBacklogListens.ts`

Change line 39-42 from:
```typescript
const result = await backlogService.scheduleBacklogToFutureListens(
  user.id,
  7,
);
```

To:
```typescript
const result = await backlogService.scheduleBacklogToFutureListens(
  user.id,
  user.scheduleAheadDays,
);
```

---

### Phase 5: Frontend Updates

**Step 5.1: Create PreferenceSlider component**

File: `app/components/PreferenceSlider.vue`

A new component similar to `PreferenceToggle` but with a range slider:

```vue
<script setup lang="ts">
defineProps<{
  modelValue: number;
  title: string;
  description: string;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  loading?: boolean;
  changed?: boolean;
}>();

defineEmits<{
  'update:modelValue': [value: number];
}>();
</script>

<template>
  <div class="flex items-center justify-between py-3">
    <div class="flex-1 pr-4">
      <h3 class="text-base font-semibold flex items-center gap-2">
        {{ title }}
        <span v-if="changed" class="text-xs text-primary-500">(changed)</span>
      </h3>
      <p class="text-sm text-muted">{{ description }}</p>
    </div>
    <div class="flex items-center gap-3">
      <span class="text-sm font-medium w-16 text-right">
        {{ modelValue }} {{ unit }}
      </span>
      <input
        type="range"
        :value="modelValue"
        :min="min"
        :max="max"
        :step="step ?? 1"
        :disabled="loading"
        class="w-32"
        @input="$emit('update:modelValue', Number(($event.target as HTMLInputElement).value))"
      />
    </div>
  </div>
</template>
```

**Step 5.2: Update preferences page**

File: `app/pages/preferences.vue`

Add the new slider in the Features card (after the toggles, around line 87):

```vue
<PreferenceSlider
  v-model="localPreferences.scheduleAheadDays"
  title="Schedule Ahead"
  description="How many days into the future to automatically schedule backlog albums"
  :min="1"
  :max="90"
  unit="days"
  :loading="pending"
  :changed="isChanged('scheduleAheadDays')"
/>
```

**Step 5.3: Update usePreferencesForm composable**

File: `app/composables/api/usePreferencesForm.ts`

Update the `hasChanges` computed (line 44-50):

```typescript
const hasChanges = computed(() => {
  if (!localPreferences.value) return false;
  return (
    isChanged('trackListeningHistory') ||
    isChanged('createTodaysAlbumPlaylist') ||
    isChanged('createSongOfDayPlaylist') ||
    isChanged('scheduleAheadDays')  // ADD
  );
});
```

---

### Phase 6: Testing

**Step 6.1: Schema validation tests**

File: `shared/schemas/preferences.schema.test.ts` (create if needed)

```typescript
describe('UserPreferencesSchema', () => {
  it('accepts valid scheduleAheadDays values', () => {
    expect(() => UserPreferencesSchema.parse({ ...validPrefs, scheduleAheadDays: 1 })).not.toThrow();
    expect(() => UserPreferencesSchema.parse({ ...validPrefs, scheduleAheadDays: 90 })).not.toThrow();
  });

  it('rejects scheduleAheadDays below minimum', () => {
    expect(() => UserPreferencesSchema.parse({ ...validPrefs, scheduleAheadDays: 0 })).toThrow();
  });

  it('rejects scheduleAheadDays above maximum', () => {
    expect(() => UserPreferencesSchema.parse({ ...validPrefs, scheduleAheadDays: 91 })).toThrow();
  });
});
```

**Step 6.2: Integration tests for scheduling task**

File: `server/tasks/scheduleBacklogListens.integration.ts`

Add test cases:

```typescript
it('respects user scheduleAheadDays preference', async () => {
  // Given: user with scheduleAheadDays = 3
  await prisma.user.update({
    where: { id: userId },
    data: { scheduleAheadDays: 3 },
  });
  // ... add backlog items

  // When
  await scheduleBacklogListens();

  // Then
  const futureListens = await prisma.futureListen.findMany({ where: { userId } });
  expect(futureListens).toHaveLength(3);
});

it('uses default (14) when scheduleAheadDays not set', async () => {
  // Test with default value
});
```

**Step 6.3: API integration tests**

File: `server/api/preferences.integration.ts` (create or update)

```typescript
it('returns scheduleAheadDays in GET response', async () => {
  const result = await handler(createHandlerEvent(userId));
  expect(result.preferences.scheduleAheadDays).toBe(14); // default
});

it('updates scheduleAheadDays via PATCH', async () => {
  await patchHandler(createHandlerEvent(userId, { body: { scheduleAheadDays: 30 } }));

  const result = await handler(createHandlerEvent(userId));
  expect(result.preferences.scheduleAheadDays).toBe(30);
});

it('rejects invalid scheduleAheadDays values', async () => {
  await expect(
    patchHandler(createHandlerEvent(userId, { body: { scheduleAheadDays: 0 } }))
  ).rejects.toThrow();
});
```

**Step 6.4: Component tests**

File: `app/pages/preferences.component.ts`

```typescript
it('renders schedule ahead slider', async () => {
  await mountPage('/preferences');
  expect(screen.getByText('Schedule Ahead')).toBeDefined();
  expect(screen.getByRole('slider')).toBeDefined();
});

it('marks slider as changed when value differs', async () => {
  // Change slider value and verify "(changed)" indicator appears
});
```

---

## Edge Cases Addressed

| Edge Case | How Handled |
|-----------|-------------|
| Timezone consistency | Dates calculated server-side in UTC (existing behavior) |
| Reducing limit | Existing schedules untouched; only new dates considered |
| Large backlog | Weighted random with COUNT + offset (existing efficient algo) |
| API rate limits | One album per day limit already enforced |
| Upper bound | Max 90 days enforced via Zod validation |
| New users | Default 14 days via Prisma schema default |

---

## Files to Modify

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `scheduleAheadDays Int @default(14)` to User |
| `shared/schemas/preferences.schema.ts` | Add constants and field to schema |
| `server/repositories/user.repository.ts` | Include field in queries |
| `server/services/user.service.ts` | Include field in user fetch for task |
| `server/tasks/scheduleBacklogListens.ts` | Use `user.scheduleAheadDays` instead of `7` |
| `app/pages/preferences.vue` | Add PreferenceSlider |
| `app/composables/api/usePreferencesForm.ts` | Add to `hasChanges` check |

## Files to Create

| File | Purpose |
|------|---------|
| `app/components/PreferenceSlider.vue` | New slider component |
| `shared/schemas/preferences.schema.test.ts` | Schema validation tests |
| Migration file (auto-generated) | Add column |

---

## Implementation Order

1. **Database** - Add field to schema + migration
2. **Shared Schema** - Add constants and update Zod schema
3. **Repository** - Update queries to include new field
4. **Service** - Update user fetch for task
5. **Task** - Use user's preference
6. **Frontend** - Create slider component, update page and composable
7. **Tests** - Unit, integration, and component tests

---

## Open Questions for User

1. **Default value**: Is 14 days appropriate, or would you prefer 7 or 30?
2. **UI component**: Slider vs number input vs dropdown with presets?
3. **Immediate scheduling**: Should changing the setting trigger immediate re-scheduling, or wait for next CRON?
