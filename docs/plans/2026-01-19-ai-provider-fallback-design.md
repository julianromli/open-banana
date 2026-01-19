# AI Provider Fallback Design

**Date**: 2026-01-19  
**Status**: Draft  
**Author**: AI-assisted brainstorming session

## Overview

Implement fallback mechanism for AI image generation with support for multiple providers:
- **BytePlus** (existing) - Seedream 4.5 via direct API
- **fal.ai** (new) - Seedream 4.5 via fal.ai SDK

## Goals

1. Add fal.ai as fallback provider for image generation
2. Environment-based provider switching (`AI_PROVIDER=BYTEPLUS|FAL-AI`)
3. Automatic fallback on specific errors (401, 429, 5xx)
4. Clean provider abstraction for future extensibility

## Endpoints

| Provider | Text-to-Image | Image-to-Image |
|----------|---------------|----------------|
| BytePlus | `https://ark.ap-southeast.bytepluses.com/api/v3/images/generations` | Same endpoint with `image` param |
| fal.ai | `fal-ai/bytedance/seedream/v4.5/text-to-image` | `fal-ai/bytedance/seedream/v4.5/edit` |

## Design Decisions

### 1. Switching Strategy
**Choice**: Simple Toggle with automatic fallback  
**Reason**: Single env var to switch primary, automatic fallback to secondary on errors

### 2. Fallback Trigger
**Choice**: On specific errors only (401, 429, 5xx)  
**Reason**: 400 errors (bad prompt, content policy) would likely fail on both providers - no point retrying

### 3. Environment Variables
**Choice**: Single provider toggle + both keys
```bash
AI_PROVIDER=BYTEPLUS|FAL-AI  # default: BYTEPLUS
BYTEPLUS_API_KEY=xxx
FAL_KEY=xxx
```
**Reason**: Minimal config, easy to switch primary with one env change

### 4. Implementation Approach
**Choice**: Provider abstraction layer in `lib/ai-providers/`  
**Reason**: Clean separation, testable, easy to add new providers later

### 5. Image Size Handling
**Choice**: Unified aspect ratio input, each provider converts internally  
**Reason**: Minimal frontend changes, providers handle their own format requirements

### 6. Logging
**Choice**: Console logs with existing `[v0] API:` pattern  
**Reason**: Consistent with current codebase, sufficient for debugging

## File Structure

```
lib/
└── ai-providers/
    ├── index.ts           # Export + factory function + fallback executor
    ├── types.ts           # Interface definitions
    ├── byteplus.ts        # BytePlus provider implementation
    ├── fal-ai.ts          # fal.ai provider implementation
    └── utils.ts           # Shared utilities (aspect ratio mapping)
```

## Interface Definition

```typescript
// lib/ai-providers/types.ts

export type AIProviderType = 'BYTEPLUS' | 'FAL-AI'

export interface GenerateImageInput {
  prompt: string
  aspectRatio: string
  mode: 'text-to-image' | 'image-editing'
  images?: string[]  // base64 data URIs for editing mode
}

export interface GenerateImageOutput {
  url: string        // base64 data URI or URL
  prompt: string
}

export interface ImageProvider {
  name: AIProviderType
  isConfigured(): boolean
  generateImage(input: GenerateImageInput): Promise<GenerateImageOutput>
}
```

## Provider Implementations

### BytePlus Provider

```typescript
// lib/ai-providers/byteplus.ts

const BYTEPLUS_ENDPOINT = "https://ark.ap-southeast.bytepluses.com/api/v3/images/generations"

const ASPECT_RATIO_TO_SIZE: Record<string, string> = {
  "1:1": "2048x2048",
  "2:3": "1664x2496",
  "3:2": "2496x1664",
  "3:4": "1728x2304",
  "4:3": "2304x1728",
  "9:16": "1440x2560",
  "16:9": "2560x1440",
  "21:9": "3024x1296",
}

// Request body: { model, prompt, size, image (base64 array), response_format }
// Response: data[0].b64_json or data[0].url
```

### fal.ai Provider

```typescript
// lib/ai-providers/fal-ai.ts

import { fal } from "@fal-ai/client"

const ASPECT_RATIO_TO_FAL_SIZE: Record<string, string> = {
  "1:1": "square_hd",
  "2:3": "portrait_4_3",   // closest match
  "3:2": "landscape_4_3",  // closest match
  "3:4": "portrait_4_3",
  "4:3": "landscape_4_3",
  "9:16": "portrait_16_9",
  "16:9": "landscape_16_9",
  "21:9": "landscape_16_9", // closest match
}

// Text-to-image: fal.subscribe("fal-ai/bytedance/seedream/v4.5/text-to-image")
// Image editing: fal.subscribe("fal-ai/bytedance/seedream/v4.5/edit")
// Input: { prompt, image_size, image_urls (for edit mode) }
// Response: result.data.images[0].url
```

## Fallback Logic

```typescript
// lib/ai-providers/index.ts

export async function generateImageWithFallback(
  input: GenerateImageInput
): Promise<GenerateImageOutput> {
  const primaryType = (process.env.AI_PROVIDER || 'BYTEPLUS') as AIProviderType
  const providers = getConfiguredProviders()
  
  // Sort: primary first, then fallbacks
  const sorted = providers.sort((a, b) => 
    a.name === primaryType ? -1 : b.name === primaryType ? 1 : 0
  )

  let lastError: Error | null = null
  
  for (const provider of sorted) {
    try {
      console.log(`[v0] API: Trying provider: ${provider.name}`)
      const result = await provider.generateImage(input)
      console.log(`[v0] API: Success with provider: ${provider.name}`)
      return result
    } catch (error) {
      lastError = error as Error
      
      if (shouldFallback(error)) {
        console.log(`[v0] API: Provider ${provider.name} failed, trying fallback...`)
        continue
      }
      
      // 400 errors - don't fallback
      console.log(`[v0] API: Provider ${provider.name} failed with non-retriable error`)
      throw error
    }
  }
  
  throw lastError || new Error('No providers available')
}

function shouldFallback(error: unknown): boolean {
  // Return true for: 401, 429, 5xx, timeout, network errors
  // Return false for: 400 (bad request, content policy)
}
```

## Route Handler Changes

```typescript
// app/api/generate-image/route.ts

import { generateImageWithFallback } from "@/lib/ai-providers"

export async function POST(request: NextRequest) {
  // ... existing rate limit logic unchanged ...
  
  const result = await generateImageWithFallback({
    prompt,
    aspectRatio,
    mode: mode as 'text-to-image' | 'image-editing',
    images: imageDataUris.length > 0 ? imageDataUris : undefined,
  })
  
  return NextResponse.json({
    url: result.url,
    prompt: result.prompt,
    description: "",
  })
}
```

## Environment Variables

### Updated `.env.local.example`

```bash
# AI Provider Configuration
# Options: BYTEPLUS | FAL-AI (default: BYTEPLUS)
AI_PROVIDER=BYTEPLUS

# BytePlus API (primary by default)
BYTEPLUS_API_KEY=your_byteplus_api_key

# fal.ai API (fallback by default)
FAL_KEY=your_fal_ai_key

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
CLERK_SECRET_KEY=YOUR_SECRET_KEY

# Redis (Upstash)
KV_REST_API_URL=your_redis_url
KV_REST_API_TOKEN=your_redis_token
```

### Behavior Matrix

| AI_PROVIDER | BYTEPLUS_API_KEY | FAL_KEY | Behavior |
|-------------|------------------|---------|----------|
| BYTEPLUS | Set | Set | BytePlus primary, fal.ai fallback |
| BYTEPLUS | Set | - | BytePlus only, no fallback |
| FAL-AI | Set | Set | fal.ai primary, BytePlus fallback |
| FAL-AI | - | Set | fal.ai only, no fallback |
| - | - | - | Error: No provider configured |

## Dependencies

```bash
pnpm add @fal-ai/client
```

## Implementation Checklist

### 1. Setup
- [ ] `pnpm add @fal-ai/client`
- [ ] Update `.env.local.example` with new env vars

### 2. Create Provider Abstraction
- [ ] `lib/ai-providers/types.ts` - interfaces
- [ ] `lib/ai-providers/utils.ts` - aspect ratio mappings
- [ ] `lib/ai-providers/byteplus.ts` - extract existing logic
- [ ] `lib/ai-providers/fal-ai.ts` - new implementation
- [ ] `lib/ai-providers/index.ts` - factory + fallback executor

### 3. Refactor Route Handler
- [ ] Update `app/api/generate-image/route.ts` - use `generateImageWithFallback()`
- [ ] Remove inlined BytePlus logic

### 4. Testing
- [ ] Test BytePlus primary (FAL_KEY not set)
- [ ] Test fal.ai primary (AI_PROVIDER=FAL-AI)
- [ ] Test fallback trigger (simulate 401/429)
- [ ] Test no fallback on 400 errors

## Files Changed

| File | Action |
|------|--------|
| `lib/ai-providers/types.ts` | New |
| `lib/ai-providers/utils.ts` | New |
| `lib/ai-providers/byteplus.ts` | New |
| `lib/ai-providers/fal-ai.ts` | New |
| `lib/ai-providers/index.ts` | New |
| `app/api/generate-image/route.ts` | Modified |
| `.env.local.example` | Modified |

**Total**: 5 new files, 2 modified files
