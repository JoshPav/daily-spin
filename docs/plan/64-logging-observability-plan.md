# Logging and Observability Enhancement Plan

**Issue:** [#64](https://github.com/JoshPav/daily-spin/issues/64)
**Branch:** `feat/64-logging-observability`

## Investigation Summary

Current state: **Minimal, ad-hoc logging with no structured approach**

### Key Findings

- **Total console statements:** 11 across entire server codebase
- **Logging libraries:** None (no pino, winston, consola, etc.)
- **API request logging:** None
- **Database operation logging:** None
- **Structured logging:** None
- **Error context:** Inconsistent (some errors have context, most don't)
- **User/request correlation:** None

### Critical Gaps

1. No API request/response logging - can't track user activity
2. No database operation logging - can't debug data issues
3. Inconsistent error handling patterns across services
4. Silent failures in multiple places (errors caught and suppressed)
5. No user context in logs - can't trace user-specific issues
6. No performance metrics - can't identify slow operations
7. No Spotify API rate limit tracking
8. Minimal scheduled task logging
9. No environment-based log levels

### Files with NO Logging

- **All API routes** (8 endpoints)
- **All repositories** (4 files)
- **Auth middleware**
- **Most services** (3 out of 7)
- **All utilities**

## Proposed Solution

### 1. Logging Library Selection

**Recommendation: Consola**

Why consola over pino/winston:
- Official Nuxt/Nitro recommendation
- Zero-config, works out of the box with Nuxt
- Browser and Node.js compatible (works client + server)
- Built-in log levels with colors
- Tagged logging support
- Minimal dependencies
- Active maintenance by UnJS team

Alternative considered:
- **Pino:** More performant for high-throughput apps, but overkill for current scale
- **Winston:** Feature-rich but heavier, more configuration needed

### 2. Implementation Strategy

#### Phase 1: Foundation (Core Infrastructure)
- Install and configure consola
- Create centralized logger utility with typed wrappers
- Define log levels by environment
- Set up request ID generation middleware
- Add user context extraction utility

#### Phase 2: API Layer Logging
- Add request/response logging middleware
- Log all API endpoint entry/exit points
- Add error logging with full context in API handlers
- Track API response times

#### Phase 3: Service Layer Logging
- Add structured logging to all services
- Log Spotify API calls (request/response/errors)
- Log business logic decisions
- Add performance timing for expensive operations
- Track external API rate limits

#### Phase 4: Data Layer Logging
- Add query logging to repositories (optional/debug level)
- Log database errors with context
- Track slow queries (>100ms threshold)

#### Phase 5: Scheduled Tasks
- Enhance CRON task logging
- Add start/end/duration tracking
- Log processing results and errors

#### Phase 6: Error Handling Standardization
- Create consistent error handling patterns
- Add error classes with proper context
- Standardize try-catch patterns across layers
- Remove silent error suppression

### 3. Logging Conventions

#### Log Levels
- **fatal:** Application crash, immediate attention
- **error:** Operation failed, requires investigation
- **warn:** Unexpected behavior, but operation succeeded
- **info:** Important business events (user actions, external API calls)
- **debug:** Detailed diagnostic information (dev/staging only)
- **trace:** Very detailed, function entry/exit (dev only)

#### Environment Configuration
- **Production:** info, warn, error, fatal
- **Staging:** debug, info, warn, error, fatal
- **Development:** All levels (trace through fatal)

#### Metadata Standards
Every log should include:
- `timestamp` (automatic via consola)
- `level` (automatic)
- `requestId` (for request-scoped logs)
- `userId` (when available)
- `path` (for API logs)
- `duration` (for operation timing)
- `error` (for error logs - full stack trace)

#### Message Patterns
- **API requests:** `[HTTP GET /api/listens] userId=123 requestId=abc`
- **Service operations:** `[SpotifyService] Refreshing access token userId=123`
- **Database operations:** `[DailyListenRepository] Creating daily listen userId=123 date=2026-01-15`
- **Errors:** `[Error] Failed to fetch Spotify data userId=123 error=TokenExpired stack=...`

### 4. File Structure

```
server/
  utils/
    logger.ts              # Centralized logger configuration and wrappers
    requestContext.ts      # Request ID and user context utilities
  middleware/
    logging.ts             # Request/response logging middleware
```

### 5. Sensitive Data Filtering

Data to NEVER log:
- Access tokens
- Refresh tokens
- Passwords
- Full session objects
- Credit card numbers

Pattern for safe logging:
```typescript
logger.info('Token refreshed', {
  userId,
  tokenPreview: token.slice(0, 10) + '...',  // First 10 chars only
  expiresIn: 3600
});
```

### 6. Implementation Steps

#### Step 1: Install Dependencies
```bash
bun add consola
bun add -d @types/node  # If not already present
```

#### Step 2: Create Logger Utility (`server/utils/logger.ts`)
- Export configured consola instance
- Add typed wrapper functions
- Configure log levels by environment
- Add helper for creating tagged loggers

#### Step 3: Create Request Context Utility (`server/utils/requestContext.ts`)
- Request ID generation
- User ID extraction from event
- Context attachment to logs

#### Step 4: Add Logging Middleware (`server/middleware/logging.ts`)
- Generate request ID
- Log incoming requests
- Log outgoing responses
- Track request duration
- Log errors with full context

#### Step 5: Update Services
- Replace all `console.*` with structured logger
- Add operation timing
- Add error context
- Log external API calls
- Add user context to all logs

#### Step 6: Update API Handlers
- Add entry/exit logging
- Add error logging with request context
- Remove silent failures

#### Step 7: Update Repositories (optional)
- Add debug-level query logging
- Log errors with full context

#### Step 8: Update Scheduled Tasks
- Enhance existing logs with structure
- Add timing and result tracking

#### Step 9: Update CLAUDE.md
- Document logging conventions
- Add examples of proper usage
- Document sensitive data filtering rules

### 7. Testing Strategy

#### Manual Testing
- Verify logs appear correctly in development
- Test different log levels
- Verify environment-based filtering
- Check sensitive data is filtered

#### Integration Tests
- Mock logger in existing tests to avoid noise
- Add tests for logger utility functions
- Add tests for request context extraction

### 8. Success Metrics

After implementation:
- [ ] All API endpoints have request/response logging
- [ ] All service operations have structured logging
- [ ] All errors logged with full context (no silent failures)
- [ ] Request IDs present in all request-scoped logs
- [ ] User IDs present where available
- [ ] Performance timing on slow operations
- [ ] No sensitive data in logs
- [ ] Environment-based log level filtering works
- [ ] Scheduled tasks have comprehensive logging
- [ ] Zero `console.*` statements remaining

### 9. Future Enhancements (Out of Scope)

- Log aggregation service (Datadog, LogRocket, Sentry)
- Log rotation and retention policies
- Structured error reporting UI
- Real-time log streaming dashboard
- Alerting on error patterns
- Performance monitoring integration

## Decision Points for User

1. **Log level in production:** Recommend `info` and above. Too verbose?
2. **Database query logging:** Enable at debug level or skip entirely?
3. **Spotify API logging:** Log all requests or just errors?
4. **Request body logging:** Log in dev/staging only or production too?
5. **Performance threshold:** What duration is "slow"? (Suggest: >100ms warn, >500ms error)

## Estimated File Changes

- **New files:** 3 (logger.ts, requestContext.ts, logging.ts middleware)
- **Modified files:** ~20
  - 8 API routes
  - 7 services
  - 4 repositories
  - 1 scheduled task
  - CLAUDE.md

## Breaking Changes

None - this is purely additive.

## Rollout Plan

1. Create PR with Phase 1 (foundation)
2. User reviews logging patterns in dev
3. Iterate on format/conventions if needed
4. Complete remaining phases
5. Test in staging/production
6. Monitor log volume and adjust levels if needed
