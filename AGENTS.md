# AGENTS.md (Root)

## Project Snapshot
- **Repo Type**: Simple Next.js 16 Project (Open Banana - AI Image Generator)
- **Primary Stack**: Next.js 16 (App Router), TypeScript (strict), Tailwind CSS 4, Radix UI, Shadcn UI
- **Package Manager**: pnpm
- **Sub-folder AGENTS.md files**: `app/AGENTS.md`, `components/AGENTS.md`

## Root Setup Commands
```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build

# Lint code
pnpm lint
```

## Universal Conventions

### Code Style
- **TypeScript**: Strict mode enabled (`tsconfig.json`)
- **Imports**: Use `@/` absolute paths (e.g., `@/components/ui/button`, `@/lib/utils`)
- **Styling**: Tailwind CSS 4 utility classes + CSS variables from `app/globals.css`
- **Components**: Functional components only, use React hooks

### Naming
- **Files**: kebab-case (`image-combiner.tsx`, `use-toast.ts`)
- **Components**: PascalCase exports (`ImageCombiner`, `Button`)
- **Hooks**: camelCase with `use` prefix (`useToast`, `useMobile`)

### Commits & Branches
- **Format**: Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`)
- **Main branch**: `main`
- **Feature branches**: `feat/feature-name`, `fix/bug-name`

## Security & Secrets

### Environment Variables
- **Location**: `.env.local` (gitignored)
- **Template**: `.env.local.example`
- **Required Variables**:
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk auth (client-side)
  - `CLERK_SECRET_KEY` - Clerk auth (server-side)
  - `BYTEPLUS_API_KEY` - Image generation API
  - `KV_REST_API_URL` / `KV_REST_API_TOKEN` - Upstash Redis

### Rules
- **NEVER** commit `.env.local` or API keys
- **NEVER** expose server-side keys to client (no `NEXT_PUBLIC_` prefix for secrets)
- Rate limiting bypass: `/g` route and `NODE_ENV=development` skip Redis checks

## JIT Index - Directory Map

### Project Structure
```
open-banana/
├── app/                    # Next.js App Router
│   ├── api/                # API Route Handlers
│   │   ├── generate-image/ # Main image generation endpoint
│   │   ├── improve-prompt/ # Prompt improvement endpoint
│   │   └── proxy-image/    # Image proxy endpoint
│   ├── g/                  # Bypass route (no rate limiting)
│   ├── sign-in/            # Clerk sign-in page
│   ├── sign-up/            # Clerk sign-up page
│   ├── privacy-policy/     # Legal page
│   ├── layout.tsx          # Root layout (Clerk, fonts, metadata)
│   ├── page.tsx            # Home page
│   └── globals.css         # CSS variables & Tailwind config
│   └── AGENTS.md           # [see app/AGENTS.md](app/AGENTS.md)
├── components/             # React components
│   ├── ui/                 # Shadcn UI primitives
│   ├── image-combiner.tsx  # Main feature component
│   ├── theme-provider.tsx  # next-themes provider
│   └── AGENTS.md           # [see components/AGENTS.md](components/AGENTS.md)
├── hooks/                  # Custom React hooks
│   ├── use-toast.ts        # Toast notifications
│   └── use-mobile.ts       # Mobile detection
├── lib/                    # Utilities
│   └── utils.ts            # cn() class merge utility
├── public/                 # Static assets
└── components.json         # Shadcn UI config
```

### Quick Find Commands
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

# Find Clerk auth usage
rg -n "@clerk/nextjs" .
```

## Key Files Reference
| Purpose | File |
|---------|------|
| Root Layout | `app/layout.tsx` |
| Theme CSS | `app/globals.css` |
| Main API | `app/api/generate-image/route.ts` |
| Class Utility | `lib/utils.ts` |
| Shadcn Config | `components.json` |
| TypeScript Config | `tsconfig.json` |

## Definition of Done
- [ ] Code passes `pnpm lint`
- [ ] Project builds with `pnpm build`
- [ ] Environment variables documented if changed
- [ ] Responsive design verified for UI changes
- [ ] API error handling returns appropriate status codes (400, 401, 429, 500)
- [ ] No console errors in browser
