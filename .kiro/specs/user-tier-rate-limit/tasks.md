# Implementation Plan: User Tier Rate Limiting

## Overview

Implementasi sistem tier rate limiting dengan minimal perubahan pada existing code. Fokus pada modifikasi `app/api/generate-image/route.ts` dengan menambahkan tier detection dan tier-aware rate limiting.

## Tasks

- [ ] 1. Create tier configuration and types
  - [ ] 1.1 Add UserTier type and TierConfig interface to route.ts
    - Define `type UserTier = "free" | "pro"`
    - Define `TierConfig` interface with limit, name, rateLimitMessage
    - Create `TIER_CONFIGS` constant with free (5/day) and pro (100/day) configs
    - _Requirements: 2.1, 3.1_

  - [ ] 1.2 Create getUserTier function
    - Import `clerkClient` from `@clerk/nextjs/server`
    - Fetch user's publicMetadata.tier from Clerk
    - Return "pro" if tier is "pro", otherwise return "free"
    - Handle errors by defaulting to "free" tier
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 2. Update rate limiting logic
  - [ ] 2.1 Modify checkRateLimit function signature
    - Add `tier: UserTier` parameter
    - Update return type to include `tier` and `limit` fields
    - Use `TIER_CONFIGS[tier].limit` instead of hardcoded `MAX_REQUESTS_PER_DAY`
    - _Requirements: 2.1, 2.2, 3.1, 3.2_

  - [ ] 2.2 Update POST handler to use tier-aware rate limiting
    - Call `getUserTier(userId)` after authentication
    - Pass tier to `checkRateLimit(userId, tier)`
    - Update rate limit error response with tier-specific message from `TIER_CONFIGS`
    - Include tier in error response body
    - _Requirements: 2.3, 3.3, 6.1, 6.2, 6.3, 6.4_

  - [ ] 2.3 Update response headers
    - Add `X-RateLimit-Tier` header to all responses
    - Ensure `X-RateLimit-Limit` reflects tier-specific limit
    - Update success response headers with tier info
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 3. Checkpoint - Verify implementation
  - Ensure all tests pass, ask the user if questions arise.
  - Test with Clerk user that has publicMetadata.tier = "pro"
  - Test with Clerk user without tier metadata (should default to free)

- [ ] 4. Add property-based tests
  - [ ] 4.1 Set up fast-check testing
    - Install fast-check: `pnpm add -D fast-check`
    - Create test file `__tests__/rate-limit.test.ts`
    - _Requirements: Testing Strategy_

  - [ ] 4.2 Write property test for tier detection
    - **Property 1: Tier Detection Correctness**
    - Generate random metadata objects with various tier values
    - Verify "pro" returns "pro", everything else returns "free"
    - **Validates: Requirements 1.1, 1.2, 1.3**

  - [ ] 4.3 Write property test for rate limit enforcement
    - **Property 2: Rate Limit Enforcement Per Tier**
    - Generate random (tier, count) pairs
    - Verify allowed = count < limit(tier)
    - **Validates: Requirements 2.1, 2.2, 3.1, 3.2**

  - [ ] 4.4 Write property test for error messages
    - **Property 3: Tier-Specific Error Messages**
    - Generate rate limit scenarios per tier
    - Verify free message contains "Upgrade", pro contains "Fair Use"
    - **Validates: Requirements 2.3, 3.3, 6.1, 6.2**

  - [ ] 4.5 Write property test for response headers
    - **Property 4: Response Headers Correctness**
    - Generate responses with various counts/tiers
    - Verify header calculations match formula
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4**

- [ ] 5. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.
  - Verify `pnpm lint` passes
  - Verify `pnpm build` succeeds

## Notes

- All tasks are required including property-based tests
- Tier is fetched from Clerk on each request, so tier changes apply immediately
- Redis key format unchanged - tier info not stored in Redis
- Bypass logic (/g route, dev mode, custom API key) remains unchanged
