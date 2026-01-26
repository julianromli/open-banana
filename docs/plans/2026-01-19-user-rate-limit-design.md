# User-Based Rate Limiting Design

**Date**: 2026-01-19  
**Status**: Implemented

## Overview

Change rate limiting from IP-based (5/day) to Clerk User ID-based (10/day).

## Requirements

- Max 5 generations per user per day
- Only authenticated Clerk users can generate
- Anonymous users redirected to `/sign-in`
- Daily reset at midnight UTC
- Keep bypass logic for `/g` route, dev mode, and custom API key

## Changes

### 1. Authentication & User Identification

**File**: `app/api/generate-image/route.ts`

- Import: `import { auth } from "@clerk/nextjs/server"`
- Get user ID: `const { userId } = await auth()`
- If `userId` is null and not bypassed: Return 401 with `redirectUrl: "/sign-in"`

### 2. Redis Key Structure

| Current | New |
|---------|-----|
| `ratelimit:{ip}:{date}` | `ratelimit:user:{userId}:{date}` |

Example: `ratelimit:user:user_2abc123xyz:2026-01-19`

### 3. Rate Limit Constant

```typescript
const MAX_REQUESTS_PER_DAY = 5
```

### 4. checkRateLimit Function

**Signature change**:
```typescript
// Before
async function checkRateLimit(ip: string): Promise<{...}>

// After
async function checkRateLimit(userId: string): Promise<{...}>
```

**UTC midnight TTL calculation**:
```typescript
const now = new Date()
const endOfDayUTC = new Date(Date.UTC(
  now.getUTCFullYear(), 
  now.getUTCMonth(), 
  now.getUTCDate() + 1, 
  0, 0, 0
))
const ttlSeconds = Math.floor((endOfDayUTC.getTime() - now.getTime()) / 1000)
```

### 5. POST Handler Flow

```
1. Check bypass conditions (userApiKey, /g route, dev mode)
2. If NOT bypassed:
   a. Call auth() to get userId
   b. If no userId -> Return 401 with redirectUrl: "/sign-in"
   c. Call checkRateLimit(userId)
   d. If not allowed -> Return 429 with limit message
3. Continue with image generation...
```

### 6. Response Formats

**401 Unauthenticated**:
```json
{
  "error": "Authentication required",
  "message": "Please sign in to generate images",
  "redirectUrl": "/sign-in"
}
```

**429 Rate Limited**:
```json
{
  "error": "Rate limit exceeded",
  "message": "You have reached the maximum of 5 generations per day. Please try again tomorrow or use your own API key.",
  "resetTime": 1737331200000
}
```

## Comparison Table

| Aspect | Current | New |
|--------|---------|-----|
| Identifier | IP address | Clerk User ID |
| Limit | - | 5/day |
| Anonymous users | Allowed (IP limit) | Blocked (401 + redirect) |
| Redis key | `ratelimit:{ip}:{date}` | `ratelimit:user:{userId}:{date}` |
| Reset time | End of local day | Midnight UTC |
| Bypass | /g + dev + custom API key | Same (unchanged) |

## Files to Modify

1. `app/api/generate-image/route.ts` - Main changes

## Notes

- No frontend changes required for basic functionality
- Frontend can optionally handle 401 redirectUrl for smoother UX
- Existing bypass logic (custom API key, /g route, dev mode) remains unchanged
