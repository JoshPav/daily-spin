# DailySpin PWA Implementation Plan

## Summary

Convert DailySpin into a Progressive Web App with installability, service worker caching, and push notifications for Spotify re-auth reminders and favorite song prompts.

## Phase 1: Basic PWA Setup

### 1.1 Install PWA Module

```bash
bun add @vite-pwa/nuxt
```

### 1.2 Generate App Icons

Create square icons from the logo for `/public/icons/`:
- `pwa-192x192.png` - Standard PWA icon
- `pwa-512x512.png` - Large icon / maskable
- `apple-touch-icon.png` - 180x180 for iOS

The existing logo is horizontal (203x44). Extract the calendar/record mark from the left side of `/public/DailySpinLogo.svg` to create a distinctive square icon.

### 1.3 Configure PWA Module

**Update `nuxt.config.ts`:**

- Add `@vite-pwa/nuxt` to modules
- Configure manifest with app name, theme color (#D5651B), icons
- Set `registerType: 'autoUpdate'` for automatic SW updates
- Configure workbox runtime caching for:
  - Google Fonts (CacheFirst, 1 year)
  - Spotify album images at i.scdn.co (CacheFirst, 30 days)

### 1.4 Add PWA Meta Tags

**Update `app/app.vue`:**

Add to `useHead()`:
- `viewport` with `viewport-fit=cover`
- `theme-color` (#D5651B)
- `apple-mobile-web-app-capable`
- `apple-mobile-web-app-status-bar-style`
- `apple-touch-icon` link

### 1.5 Install Prompt UI

**Create `app/composables/pwa/usePWA.ts`:**
- Handle `beforeinstallprompt` event
- Expose `showInstallPrompt`, `installPWA()`, `cancelInstallPrompt()`

**Create `app/components/pwa/InstallPrompt.vue`:**
- Fixed banner at bottom when install is available
- "Install" and "Not now" buttons
- Remember dismissal for 7 days in localStorage

**Create `app/components/pwa/IOSInstallInstructions.vue`:**
- Modal with step-by-step Safari "Add to Home Screen" instructions
- Show for iOS users who can't use beforeinstallprompt

---

## Phase 2: Push Notifications Infrastructure

### 2.1 VAPID Keys Setup

Generate keys and add to environment:
```bash
bunx web-push generate-vapid-keys
```

Add to `.env`:
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT` (mailto:email)

**Update `nuxt.config.ts` runtimeConfig:**
- Add `vapidPrivateKey`, `vapidSubject` (server)
- Add `vapidPublicKey` to `public` (client)

### 2.2 Database Schema

**Update `prisma/schema.prisma`:**

```prisma
model PushSubscription {
  id             String    @id @default(cuid())
  userId         String
  endpoint       String    @unique
  p256dh         String
  auth           String
  expirationTime DateTime?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("push_subscription")
}
```

Add `pushSubscriptions PushSubscription[]` relation to User model.

### 2.3 Install web-push

```bash
bun add web-push
bun add -D @types/web-push
```

### 2.4 Server Infrastructure

**Create `shared/schemas/push.schema.ts`:**
- `subscribePushSchema` (body: endpoint, keys, expirationTime)
- `unsubscribePushSchema` (body: endpoint)

**Create `server/repositories/pushSubscription.repository.ts`:**
- `createSubscription(userId, subscription)` - upsert by endpoint
- `getSubscriptionsForUser(userId)`
- `deleteSubscription(id)`
- `deleteByEndpoint(endpoint)`

**Create `server/services/push.service.ts`:**
- Initialize webPush with VAPID credentials
- `sendToUser(userId, payload)` - send to all user's subscriptions
- Handle 410 responses by removing expired subscriptions

**Create `server/api/push/subscribe.post.ts`:**
- Validate with `subscribePushSchema`
- Store subscription via repository

**Create `server/api/push/unsubscribe.post.ts`:**
- Validate with `unsubscribePushSchema`
- Remove subscription via repository

### 2.5 Custom Service Worker

Switch to `injectManifest` mode in nuxt.config.ts pwa config:
- `strategies: 'injectManifest'`
- `srcDir: 'service-worker'`
- `filename: 'sw.ts'`

**Create `service-worker/sw.ts`:**
- Precache with workbox
- Handle `push` event - show notification with title, body, icon, actions
- Handle `notificationclick` - navigate to appropriate URL based on action

### 2.6 Client Composable

**Create `app/composables/pwa/usePushNotifications.ts`:**
- Track `permission`, `isSubscribed`, `loading` state
- `requestPermission()` - request Notification permission
- `subscribe()` - subscribe via PushManager, POST to /api/push/subscribe
- `unsubscribe()` - unsubscribe and POST to /api/push/unsubscribe
- Helper to convert VAPID key to Uint8Array

### 2.7 Notification Settings UI

**Create `app/components/settings/NotificationSettings.vue`:**
- Toggle switch for push notifications
- Show blocked state if permission denied
- Sub-toggles for notification types (favorite song, reauth)

---

## Phase 3: Notification Triggers

### 3.1 Spotify Re-auth Notification

**Update `server/services/spotify/spotify.service.ts`:**

In the token refresh failure handler (where `requiresReauth` is set to true), add:
```typescript
const pushService = new PushService();
await pushService.sendToUser(userId, {
  title: 'Spotify Connection Expired',
  body: 'Tap to reconnect your Spotify account.',
  data: { type: 'reauth', url: '/' },
  actions: [{ action: 'reauth', title: 'Reconnect' }],
});
```

### 3.2 Favorite Song Reminder

**Add to `server/repositories/dailyListen.repository.ts`:**
- `getUsersWithoutFavoriteSong(date)` - find users with listens today but no favorite song, who have push subscriptions

**Create `server/tasks/sendFavoriteSongReminders.ts`:**
- Query users without favorite song for today
- Send push notification to each: "Pick Your Song of the Day"
- Include album count in message

**Update `nuxt.config.ts` scheduledTasks:**
- Add `'0 20 * * *': ['sendFavoriteSongReminders']` (8 PM UTC)

---

## Files to Create/Modify

### New Files
- `app/composables/pwa/usePWA.ts`
- `app/composables/pwa/usePushNotifications.ts`
- `app/components/pwa/InstallPrompt.vue`
- `app/components/pwa/IOSInstallInstructions.vue`
- `app/components/settings/NotificationSettings.vue`
- `public/icons/pwa-192x192.png`
- `public/icons/pwa-512x512.png`
- `public/icons/apple-touch-icon.png`
- `server/api/push/subscribe.post.ts`
- `server/api/push/unsubscribe.post.ts`
- `server/repositories/pushSubscription.repository.ts`
- `server/services/push.service.ts`
- `server/tasks/sendFavoriteSongReminders.ts`
- `service-worker/sw.ts`
- `shared/schemas/push.schema.ts`

### Modified Files
- `nuxt.config.ts` - PWA module, runtime config, scheduled tasks
- `app/app.vue` - PWA meta tags
- `prisma/schema.prisma` - PushSubscription model
- `server/services/spotify/spotify.service.ts` - reauth notification
- `server/repositories/dailyListen.repository.ts` - getUsersWithoutFavoriteSong

---

## Verification

### Phase 1 Testing
1. Run `bun run dev` and open Chrome DevTools > Application > Manifest
2. Verify manifest loads with correct name, icons, theme color
3. Run Lighthouse PWA audit - should pass installability checks
4. Test install prompt appears (Chrome desktop/Android)
5. Test iOS Safari "Add to Home Screen" flow
6. Verify app opens in standalone mode after install
7. Check fonts and Spotify images are cached (DevTools > Application > Cache Storage)

### Phase 2 Testing
1. Run migration: `bun run db:migrate`
2. Test subscribe endpoint: enable notifications in UI, verify DB record created
3. Test unsubscribe endpoint: disable notifications, verify DB record removed
4. Send test notification via web-push CLI or service
5. Verify notification appears with correct title/body/icon
6. Test notification click navigates to correct URL

### Phase 3 Testing
1. Simulate token refresh failure, verify reauth notification sent
2. Create daily listen without favorite song, run reminder task manually
3. Verify notification prompts to select favorite song
4. Test notification click opens dashboard
