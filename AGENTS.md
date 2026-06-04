# AGENTS.md (Root)

## Project Snapshot
- **Repo Type**: Simple Next.js 16 Project (Open Banana - AI Image Generator)
- **Primary Stack**: Next.js 16 (App Router), TypeScript (strict), Tailwind CSS 4, Radix UI, Shadcn UI
- **Package Manager**: pnpm
- **Sub-folder AGENTS.md files**: `app/AGENTS.md`, `components/AGENTS.md`

## Build & Test Commands

```bash
# Development
pnpm dev                        # Start dev server on localhost:3000
pnpm install                    # Install dependencies

# Building
pnpm build                      # Production build (validates all routes)

# Cloudflare Workers (OpenNext)
pnpm preview                    # Build + Wrangler preview (workerd runtime)
pnpm deploy                     # Build + deploy to Cloudflare Workers
# See docs/CLOUDFLARE_DEPLOY.md

# Linting
pnpm lint                       # Run ESLint

# Testing
pnpm test                       # Run all tests
pnpm test:watch                 # Run tests in watch mode
pnpm test -- rate-limit.test.ts # Run a single test file
pnpm test -- --testNamePattern="should validate API key"  # Run single test by name
```

## Code Style Guidelines

### TypeScript
- **Strict mode enabled** (`tsconfig.json`)
- Use explicit return types on exported functions
- Prefer `type` over `interface` for object shapes
- Use `unknown` instead of `any` for error handling

### Imports & Path Aliases
- **Always use `@/` absolute paths**: `@/components/ui/button`, `@/lib/utils`
- Group imports: 1) React/Next, 2) External libs, 3) Internal `@/`, 4) Relative `./`
- Avoid relative imports like `../../components`

### Naming Conventions
| Type | Format | Example |
|------|--------|---------|
| Files | kebab-case | `image-combiner.tsx`, `use-toast.ts` |
| Components | PascalCase | `ImageCombiner`, `Button` |
| Hooks | camelCase with `use` | `useToast`, `useMobile` |
| Functions | camelCase | `generateImage`, `handleSubmit` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRIES`, `API_BASE_URL` |
| Types/Interfaces | PascalCase | `ImageData`, `ApiResponse` |

### Styling (Tailwind CSS 4)
- **Use CSS variables** from `app/globals.css`: `bg-background`, `text-foreground`
- Never hardcode colors like `bg-black` or `text-white`
- Use `cn()` utility for conditional classes
- Tailwind v4 syntax: `@import "tailwindcss"` (not `@tailwind`)

### Components
- Server Components by default (no `"use client"`)
- Add `"use client"` only when using hooks, browser APIs, or event handlers
- Use functional components only (no class components)
- Forward refs for DOM elements using `React.forwardRef`

### Error Handling
```typescript
// API routes: return structured error responses
try {
  // ... logic
} catch (error) {
  return NextResponse.json(
    { error: "Descriptive message", errorType: "ERROR_CODE" },
    { status: 500 }
  )
}

// Client components: use try-catch with toast notifications
try {
  // ... logic
} catch (error) {
  toast({ 
    title: "Error", 
    description: error instanceof Error ? error.message : "Unknown error",
    variant: "destructive"
  })
}
```

### Testing (Jest + ts-jest)
- Test files: `__tests__/*.test.ts` or `__tests__/*.test.tsx`
- Use `testEnvironment: 'jest-environment-node'` for API tests
- Path aliases configured: `@/` maps to root
- Run single test: `pnpm test -- filename.test.ts`

### Commits & Branches
- **Format**: Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`)
- **Main branch**: `main`
- **Feature branches**: `feat/feature-name`, `fix/bug-name`

## Security & Secrets

### Environment Variables
- **Location**: `.env.local` (gitignored)
- **Template**: `.env.local.example`, `.dev.vars.example` (Cloudflare local)
- **Required Variables**:
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk auth (client-side)
  - `CLERK_SECRET_KEY` - Clerk auth (server-side)
  - `BYTEPLUS_API_KEY` - Image generation API
  - `KV_REST_API_URL` / `KV_REST_API_TOKEN` - Upstash Redis

### Rules
- **NEVER** commit `.env.local` or API keys
- **NEVER** expose server-side keys to client (no `NEXT_PUBLIC_` prefix for secrets)
- Rate limiting bypass: `/g` route and `NODE_ENV=development` skip Redis checks

## Project Structure
```
open-banana/
├── app/                    # Next.js App Router
│   ├── api/                # API Route Handlers
│   ├── g/                  # Bypass route (no rate limiting)
│   ├── sign-in/            # Clerk sign-in page
│   ├── sign-up/            # Clerk sign-up page
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Home page
│   └── globals.css         # CSS variables
├── components/             # React components
│   ├── ui/                 # Shadcn UI primitives
│   └── AGENTS.md           # [see components/AGENTS.md](components/AGENTS.md)
├── hooks/                  # Custom React hooks
├── lib/                    # Utilities
├── __tests__/              # Jest test files
└── public/                 # Static assets
```

## Quick Find Commands
```bash
# Find API route handlers
rg -n "export async function (GET|POST|PUT|DELETE)" app/api

# Find React components
rg -n "export (default )?function \w+" components

# Find page components
rg -n "export default" app/**/page.tsx

# Find CSS variables
rg -n "^\s*--" app/globals.css

# Find hook usage
rg -n "use[A-Z]\w+" --type ts
```

## Definition of Done
- [ ] Code passes `pnpm lint`
- [ ] Project builds with `pnpm build`
- [ ] Tests pass with `pnpm test`
- [ ] Environment variables documented if changed
- [ ] Responsive design verified for UI changes
- [ ] API error handling returns appropriate status codes (400, 401, 429, 500)
- [ ] No console errors in browser
