# Plan: Migrate Image Generation to Nano Banana 2 with Quality & Style Settings

## Goal
Migrate the image generation backend and UI to use model **"nano banana 2"** with user-configurable **quality (1K / 2K / 4K)**, fixed **style (dynamic)**, and existing **aspect ratio** support. Update the UI to expose quality selection and reflect the new model.

## Current Context
- **Stack**: Next.js 16 App Router, TypeScript, Tailwind CSS 4, Shadcn UI
- **Current Providers**: BytePlus (`seedream-4-5-251128`) primary, Fal.ai (`seedream/v4.5`) fallback
- **Current Input Type**: `GenerateImageInput` has `prompt`, `aspectRatio`, `mode`, `images` — **no quality or style fields**
- **Current UI**: Aspect ratio dropdown exists in `image-combiner.tsx`; no quality/style controls
- **Tests**: Jest tests exist for provider fallback, rate limiting, error mapping

## Assumptions
1. "Nano banana 2" is a **completely separate API** with its own endpoint and API key — not a parameter change on BytePlus.
2. The underlying API accepts `quality` (string/enum) and `style` (string) in the request body.
3. Quality levels map to output resolution:
   - **1K** → ~1024px longest side (standard)
   - **2K** → ~2048px longest side (high)
   - **4K** → ~4096px longest side (ultra)
4. Style is locked to `"dynamic"` — shown in UI as read-only badge for clarity.

## Step-by-Step Plan

### 1. Extend Types & Interfaces
**Files**: `lib/ai-providers/types.ts`
- Add `NANO_BANANA` to `AIProviderType` union
- Add `quality?: "1K" | "2K" | "4K"` to `GenerateImageInput`
- Add `style?: string` to `GenerateImageInput` (optional, for future flexibility)

### 2. Add Quality Mapping Utilities
**Files**: `lib/ai-providers/utils.ts`
- Create `QUALITY_TO_SIZE_MULTIPLIER: Record<string, number>` — maps quality to dimension multiplier
- Create `getQualityDimensions(baseSize: string, quality: string): string` that scales aspect-ratio base dimensions
  - Example: 1:1 at 1K = 1024x1024, 2K = 2048x2048, 4K = 4096x4096
- Export `DEFAULT_QUALITY = "1K"`

### 3. Create New Provider — Nano Banana 2
**Files**: `lib/ai-providers/nano-banana.ts` (new file)
- Implement `NanoBananaProvider` class implementing `ImageProvider`
- Use `IMAGINER_KEY` env var for auth
- Use a dedicated endpoint (placeholder TBD)
- In `generateImage()`:
  - Read `input.quality` (default `"1K"`)
  - Compute scaled `size` via `getQualityDimensions()` based on aspect ratio + quality
  - Send `style: "dynamic"` in request body
  - Send `model: "nano-banana-2"` in request body
  - Return `{ url, prompt }` matching existing `GenerateImageOutput`
  - Implement same error handling pattern as BytePlus (401, 429, 5xx, 400)

### 4. Register New Provider & Update Fallback Chain
**Files**: `lib/ai-providers/index.ts`
- Import `nanoBananaProvider` from `./nano-banana`
- Add `NANO_BANANA` to `providers` record
- Update `getPrimaryProviderType()` to return `"NANO_BANANA"` as default (or when `AI_PROVIDER=NANO_BANANA`)
- Fallback order: NANO_BANANA → BYTEPLUS → FAL-AI

### 5. Update Fallback Provider (Fal.ai)
**Files**: `lib/ai-providers/fal-ai.ts`
- In `generateTextToImage()` and `generateEditedImage()`:
  - Accept quality via input; map to fal.ai-compatible `image_size` or custom dimension if supported
  - Inject `style: "dynamic"` into input payload if the fal.ai model supports it
  - If fal.ai does not support style/quality params, log a warning and degrade gracefully

### 6. Wire API Route
**Files**: `app/api/generate-image/route.ts`
- Read `quality` and `style` from `formData`
- Pass them into `generateImageWithFallback({ ..., quality, style: style || "dynamic" })`
- Validate `quality` is one of `["1K", "2K", "4K"]`, return 400 if invalid

### 7. Update UI — Add Quality Selector & Style Badge
**Files**: `components/image-combiner.tsx`
- Add state: `const [quality, setQuality] = useState<string>("1K")`
- In the Input section (next to aspect ratio dropdown), add a `<Select>` for quality:
  - Options: 1K (Standard), 2K (High), 4K (Ultra)
  - Use same Shadcn Select styling as aspect ratio
- Add a read-only style badge showing `"Dynamic"` next to quality (visually indicates the locked style)
- In `generateImage()`:
  - Append `quality` to FormData sent to `/api/generate-image`
  - Append `style: "dynamic"` to FormData
- Update API key localStorage key from `"byteplus-api-key"` to `"nano-banana-api-key"`
- Update API key input placeholder & label text to reference Nano Banana Console

### 8. Update Environment & Documentation
**Files**: `.env.local.example`
- Add placeholder:
```
# Nano Banana API (new primary provider)
IMAGINER_KEY=your_imaginer_key
```

**Files**: `README.md`, `AGENTS.md`, `app/layout.tsx`, `app/page.tsx`
- Update descriptions from "Powered by Gemini 2.5 Flash / Seedream" to "Powered by Nano Banana 2"
- Update metadata keywords in `layout.tsx`
- Update hidden SEO description in `page.tsx`

### 9. Update Tests
**Files**: `__tests__/ai-provider-fallback.test.ts`, `__tests__/generate-image-error-message.test.ts`
- Update mock inputs in fallback tests to include `quality: "1K"`
- Add test: invalid quality returns 400 from API route
- Add test: Nano Banana provider returns correct output format
- Update any snapshots if error messages changed

## Files Likely to Change
| File | Change |
|------|--------|
| `lib/ai-providers/types.ts` | Add `NANO_BANANA` to union, add `quality`/`style` to input |
| `lib/ai-providers/utils.ts` | Add quality-to-dimension mapping functions |
| `lib/ai-providers/nano-banana.ts` | **New file** — Nano Banana 2 provider implementation |
| `lib/ai-providers/index.ts` | Register new provider, update fallback chain |
| `lib/ai-providers/fal-ai.ts` | Forward quality/style if supported |
| `app/api/generate-image/route.ts` | Parse quality/style from FormData, validate |
| `components/image-combiner.tsx` | Add quality `<Select>`, style badge, update API key UI |
| `__tests__/ai-provider-fallback.test.ts` | Update mocks with quality + new provider |
| `__tests__/generate-image-error-message.test.ts` | Add quality validation test |
| `app/layout.tsx` | Update SEO metadata |
| `app/page.tsx` | Update hidden SEO description |
| `.env.local.example` | Add `IMAGINER_KEY` placeholder |

## Verification Steps
1. `pnpm lint` passes with no errors
2. `pnpm build` passes (type-checks + route validation)
3. `pnpm test` passes (all existing + new tests)
4. Manual UI check:
   - Quality selector appears next to aspect ratio
   - Style badge shows "Dynamic"
   - Generating with 1K/2K/4K each produces different request sizes
   - Network tab shows `model: "nano-banana-2"` and `style: "dynamic"` in API request body
   - API key section references Nano Banana instead of BytePlus

## Risks, Tradeoffs & Open Questions
1. **Endpoint TBD**: The exact Nano Banana 2 endpoint URL is unknown — placeholder must be filled before deployment.
2. **Fal.ai Compatibility**: Fal.ai may not support `style` or custom quality dimensions beyond its preset `image_size` values. The fallback provider may need to ignore these params or map them to closest presets.
3. **Performance**: 4K images are significantly larger (slower generation, more bandwidth, higher storage). Rate limits may need adjustment if users select 4K frequently.
4. **Auth Scheme Unknown**: Whether Nano Banana uses Bearer token, API key header, or another auth mechanism is TBD — implement as Bearer (`Authorization: Bearer ${key}`) as the default assumption, adjust if needed.
