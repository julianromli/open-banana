# Perbaikan E2E Imaginer Provider — Open Banana

## Problem Statement
Generate image biasa (text-to-image) tidak works. Backend-to-Imaginer flow ada bottleneck dan error handling terputus.

## Root Cause Analysis
1. **Missing `lib/generate-image-error.ts`** → Semua error jatuh ke fallback generic
2. **Image-to-Image flow ineffisien** → Frontend: File → base64 → FormData(File) → Backend: base64 → Provider: Blob → Upload. 3x konversi.
3. **Proxy image route terlalu strict** → Hanya `fal.media`, tapi Imaginer return Tencent COS URLs → download/copy gagal
4. **Build gagal** → Clerk env missing saat prerender
5. **Test gagal** → 1 test fail di `ai-provider-fallback.test.ts`
6. **Progress bar palsu** → Frontend increment otomatis, tidak pakai data real dari Imaginer polling

## Phase 1: Fix Foundation
- [ ] Fix `.env.local.example` + tambah dummy Clerk key untuk build
- [ ] Update `next.config.ts` supaya build bisa jalan tanpa Clerk key (optional for prerender)
- [ ] Create `lib/generate-image-error.ts`

## Phase 2: Fix Backend Provider (`lib/ai-providers/`)
- [ ] Refactor `nano-banana.ts`:
  - [ ] Bersihkan logging
  - [ ] Add fetch timeout wrapper (30s generate, 15s poll)
  - [ ] Fix `pollGenerationStatus`: handle `status === "processing"` dan `"polling"`
  - [ ] Pastikan `quality` mapping benar (1K/2K/4K → Imaginer accepts these strings)
- [ ] Update `index.ts` fallback chain: kalau semua provider fail, throw error yang informatif

## Phase 3: Fix API Route (`app/api/generate-image/`)
- [ ] Simplify image handling: pass File/URL langsung, skip base64 round-trip
- [ ] Validasi provider config di awal (IMAGINER_KEY exists?)
- [ ] Wire error handling ke `generate-image-error.ts`
- [ ] Return progress/status via SSE atau simulated streaming untuk UX real-time

## Phase 4: Fix Proxy & Frontend
- [ ] Expand `proxy-image/route.ts` domain whitelist
- [ ] Frontend: pakai proxy untuk copy/download semua image
- [ ] Fix progress bar: consume real status dari backend response
- [ ] Fix copy image flow (CORS-safe via proxy)

## Phase 5: Verify
- [ ] `pnpm build` clean
- [ ] `pnpm test` all pass
- [ ] Test real text-to-image via IMAGINER_KEY aktif
