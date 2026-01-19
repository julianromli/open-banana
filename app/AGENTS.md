# app/AGENTS.md

## Package Identity
- **Purpose**: Next.js App Router - pages, layouts, and API route handlers for Open Banana AI Image Generator
- **Primary Tech**: Next.js 16 App Router, Route Handlers, Clerk Auth, Upstash Redis, BytePlus API

## Setup & Run
```bash
pnpm dev          # Start dev server on localhost:3000
pnpm build        # Production build (validates all routes)
pnpm lint         # Lint check
```

## Patterns & Conventions

### Directory Structure
```
app/
├── api/                    # API Route Handlers (server-only)
│   ├── generate-image/     # POST: Image generation with rate limiting
│   ├── improve-prompt/     # POST: AI prompt enhancement
│   └── proxy-image/        # GET: Image proxy for CORS
├── g/                      # Bypass route (development, no rate limiting)
├── sign-in/[[...sign-in]]/ # Clerk sign-in (catch-all route)
├── sign-up/[[...sign-up]]/ # Clerk sign-up (catch-all route)
├── privacy-policy/         # Static legal page
├── layout.tsx              # Root layout with Clerk, fonts, SEO metadata
├── page.tsx                # Home page
└── globals.css             # CSS variables, theme tokens
```

### Route Handlers (API)
- ✅ **DO**: Export named functions `GET`, `POST`, `PUT`, `DELETE`
- ✅ **DO**: Use `NextResponse.json()` for all responses
- ✅ **DO**: Return appropriate HTTP status codes (400, 401, 429, 500)
- ✅ **DO**: Implement try-catch with detailed error responses
- ✅ **DO**: Use Upstash Redis for rate limiting (see `generate-image/route.ts`)
- ❌ **DON'T**: Import client-side hooks in route handlers
- ❌ **DON'T**: Expose API keys - use `process.env` server-side only

**Example Pattern** - `app/api/generate-image/route.ts`:
```typescript
import { NextResponse, type NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    // ... processing logic
    return NextResponse.json({ data }, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: "Error message", errorType: "ERROR_CODE" },
      { status: 500 }
    )
  }
}
```

### Page Components
- ✅ **DO**: Server Components by default (no `"use client"`)
- ✅ **DO**: Add `"use client"` only when using hooks, browser APIs, or event handlers
- ✅ **DO**: Use `<Suspense>` for async data boundaries
- ✅ **DO**: Export `metadata` object for SEO (see `layout.tsx`)

**Example Pattern** - Server page (`app/page.tsx`):
```typescript
import { ImageCombiner } from "@/components/image-combiner"

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <ImageCombiner />
    </main>
  )
}
```

### Layouts
- ✅ **DO**: Wrap with `<ClerkProvider>` for auth (already in `layout.tsx`)
- ✅ **DO**: Include JSON-LD structured data for SEO
- ✅ **DO**: Use Google Fonts via `next/font/google`
- ✅ **DO**: Use `<Suspense>` around `{children}`

### CSS & Theming
- **File**: `app/globals.css`
- ✅ **DO**: Use CSS variables (`--background`, `--foreground`, `--primary`, etc.)
- ✅ **DO**: Use Tailwind utility classes referencing CSS variables
- ❌ **DON'T**: Hardcode colors - use `bg-background`, `text-foreground`, etc.

**Available CSS Variables** (see `globals.css`):
```css
--background, --foreground, --primary, --secondary
--muted, --accent, --destructive, --border, --input, --ring
--card, --popover, --sidebar (+ foreground variants)
--chart-1 through --chart-5
--radius (0rem for sharp corners)
```

## Touch Points / Key Files
| Purpose | File |
|---------|------|
| Root Layout | `app/layout.tsx` - Clerk, fonts, SEO metadata |
| Global Styles | `app/globals.css` - CSS variables, theme |
| Main API | `app/api/generate-image/route.ts` - Full API pattern |
| Home Page | `app/page.tsx` - Server component example |
| Auth Pages | `app/sign-in/`, `app/sign-up/` - Clerk integration |

## JIT Index Hints
```bash
# Find all route handlers
rg -n "export async function (GET|POST|PUT|DELETE)" app/api

# Find all pages
find app -name "page.tsx"

# Find API usage patterns
rg -n "NextResponse.json" app/api

# Find metadata exports
rg -n "export const metadata" app

# Find error handling
rg -n "status: (400|401|429|500)" app/api

# Find rate limiting logic
rg -n "rateLimit|Redis" app/api
```

## Common Gotchas

### Redis/Upstash
- Requires `KV_REST_API_URL` and `KV_REST_API_TOKEN` in `.env.local`
- Falls back gracefully if not configured (allows all requests)
- Rate limit: 5 requests/day/IP (configurable in `generate-image/route.ts`)

### Clerk Auth
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` required for client-side
- `CLERK_SECRET_KEY` required for server-side auth checks
- Catch-all routes: `[[...sign-in]]` pattern for Clerk pages

### Rate Limiting Bypass
- `/g` route path bypasses rate limiting
- `NODE_ENV=development` bypasses rate limiting
- Custom API key via `x-api-key` header bypasses rate limiting

## Pre-PR Checks
```bash
# Must pass before PR
pnpm lint && pnpm build
```
