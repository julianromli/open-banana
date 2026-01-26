# Requirements Document

## Introduction

Sistem tier untuk rate limiting yang membedakan antara Free user dan Pro user. Free user mendapat limit 5 generate per hari, sedangkan Pro user mendapat limit 100 generate per hari (Fair Use Policy). Sistem ini terintegrasi dengan Clerk authentication dan menggunakan Redis (Upstash) untuk tracking usage.

## Glossary

- **Rate_Limiter**: Komponen yang mengontrol jumlah request yang diizinkan per user berdasarkan tier
- **User_Tier**: Klasifikasi user (free atau pro) yang menentukan limit rate limiting
- **Clerk_Metadata**: Data tambahan yang disimpan di Clerk
 user profile untuk menyimpan informasi tier
- **Free_User**: User dengan tier default, limit 5 generate per hari
- **Pro_User**: User dengan tier pro, limit 100 generate per hari (FUP)
- **Fair_Use_Policy**: Kebijakan penggunaan wajar yang membatasi Pro user hingga 100 generate per hari
- **Redis_Key**: Key yang digunakan untuk menyimpan data rate limiting di Redis

## Requirements

### Requirement 1: User Tier Detection

**User Story:** As a system, I want to detect user tier from Clerk metadata, so that I can apply appropriate rate limits.

#### Acceptance Criteria

1. WHEN a user makes a request, THE Rate_Limiter SHALL retrieve the user's tier from Clerk publicMetadata.tier
2. WHEN publicMetadata.tier is "pro", THE Rate_Limiter SHALL classify the user as Pro_User
3. WHEN publicMetadata.tier is undefined or "free", THE Rate_Limiter SHALL classify the user as Free_User
4. IF Clerk metadata retrieval fails, THEN THE Rate_Limiter SHALL default to Free_User tier

### Requirement 2: Free User Rate Limiting

**User Story:** As a Free user, I want to generate up to 5 images per day, so that I can use the service within free tier limits.

#### Acceptance Criteria

1. THE Rate_Limiter SHALL allow Free_User maximum 5 requests per day
2. WHEN a Free_User exceeds 5 requests, THE Rate_Limiter SHALL reject the request with HTTP 429 status
3. WHEN a Free_User is rate limited, THE Rate_Limiter SHALL return a message suggesting upgrade to Pro tier
4. THE Rate_Limiter SHALL reset Free_User count at UTC midnight

### Requirement 3: Pro User Rate Limiting (Fair Use Policy)

**User Story:** As a Pro user, I want to generate up to 100 images per day under Fair Use Policy, so that I can use the service with higher limits.

#### Acceptance Criteria

1. THE Rate_Limiter SHALL allow Pro_User maximum 100 requests per day under Fair_Use_Policy
2. WHEN a Pro_User exceeds 100 requests, THE Rate_Limiter SHALL reject the request with HTTP 429 status
3. WHEN a Pro_User is rate limited, THE Rate_Limiter SHALL return a message about Fair_Use_Policy limit
4. THE Rate_Limiter SHALL reset Pro_User count at UTC midnight

### Requirement 4: Rate Limit Response Headers

**User Story:** As a client application, I want to receive rate limit information in response headers, so that I can display remaining quota to users.

#### Acceptance Criteria

1. THE Rate_Limiter SHALL include X-RateLimit-Limit header with the user's tier limit
2. THE Rate_Limiter SHALL include X-RateLimit-Remaining header with remaining requests
3. THE Rate_Limiter SHALL include X-RateLimit-Reset header with UTC timestamp for reset time
4. THE Rate_Limiter SHALL include X-RateLimit-Tier header indicating user's tier (free or pro)

### Requirement 5: Bypass Logic Preservation

**User Story:** As a developer, I want existing bypass logic to remain functional, so that testing and custom API key usage continue to work.

#### Acceptance Criteria

1. WHEN request comes from /g route, THE Rate_Limiter SHALL bypass rate limiting
2. WHEN NODE_ENV is development, THE Rate_Limiter SHALL bypass rate limiting
3. WHEN user provides custom API key via x-api-key header, THE Rate_Limiter SHALL bypass rate limiting
4. WHEN rate limiting is bypassed, THE Rate_Limiter SHALL not check or increment usage count

### Requirement 6: Error Messages Per Tier

**User Story:** As a user, I want to receive tier-appropriate error messages when rate limited, so that I understand my options.

#### Acceptance Criteria

1. WHEN a Free_User is rate limited, THE Rate_Limiter SHALL suggest upgrading to Pro tier in the error message
2. WHEN a Pro_User is rate limited, THE Rate_Limiter SHALL explain Fair_Use_Policy in the error message
3. THE Rate_Limiter SHALL include resetTime in all rate limit error responses
4. THE Rate_Limiter SHALL include current tier information in rate limit error responses
