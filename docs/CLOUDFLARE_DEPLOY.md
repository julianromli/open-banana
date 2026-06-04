# Deploy Open Banana to Cloudflare Workers

## Prerequisites

- Cloudflare account (Workers **Paid** recommended for long-running requests; on Free, leave `limits.cpu_ms` commented out in `wrangler.jsonc`)
- `pnpm install`
- `npx wrangler login`
- Production builds use **webpack** (`next build --webpack`) because Turbopack output can break on OpenNext + workerd

## Production URLs

| Purpose | URL |
|---------|-----|
| **Primary (custom domain)** | `https://openbanana.fun` |
| Workers dev subdomain | `https://open-banana.faizintifada.workers.dev` |
| Clerk Frontend API | `https://clerk.openbanana.fun` |

## Local preview (workerd runtime)

1. Copy `[.dev.vars.example](../.dev.vars.example)` to `.dev.vars` and fill in values (same as `.env.local`).
2. Set `NEXT_PUBLIC_APP_URL=https://openbanana.fun` (or your preview URL).
3. Run:

```bash
pnpm preview
```

## Deploy

```bash
pnpm run deploy
```

After deploy, sync secrets from `.env.local` (never commit):

```bash
node scripts/sync-wrangler-secrets.mjs
```

Or set individually with `npx wrangler secret put <KEY>`.

**Required after URL changes:**

1. `NEXT_PUBLIC_APP_URL=https://openbanana.fun` → redeploy so metadata and Clerk embeds match.
2. **Clerk Dashboard** → allowed origins + redirect URLs for `https://openbanana.fun` (and `https://www.openbanana.fun` if used). See [CLERK_DNS.md](CLERK_DNS.md).
3. **Polar** → webhook: `https://openbanana.fun/api/webhook/polar`

## Custom domain on Worker

1. Workers & Pages → **open-banana** → **Settings** → **Domains & Routes** → `openbanana.fun` (+ `www` if needed).
2. Set `NEXT_PUBLIC_APP_URL` to the canonical HTTPS URL and redeploy.

## Scripts

| Script | Purpose |
|--------|---------|
| `pnpm dev` | Next.js dev server (Node) |
| `pnpm preview` | OpenNext build + Wrangler preview |
| `pnpm run deploy` | OpenNext build + deploy to Cloudflare |
| `pnpm run setup-clerk-dns` | Create Clerk CNAMEs (needs `CLOUDFLARE_API_TOKEN`) |
| `pnpm cf-typegen` | Generate `cloudflare-env.d.ts` |

## Auth on Workers

Deploy runs `[scripts/patch-handler-middleware-manifest.mjs](../scripts/patch-handler-middleware-manifest.mjs)` after build.

Auth: client `[AuthGate](../components/auth-gate.tsx)` + `auth()` in API routes. Clerk loads from **`clerk.openbanana.fun`** when DNS is verified (no proxy URL required).

Optional FAPI proxy: set `NEXT_PUBLIC_CLERK_PROXY_URL` and use `[app/clerk-proxy/[[...path]]/route.ts](../app/clerk-proxy/[[...path]]/route.ts)` — only if you cannot use custom Clerk DNS.

Clerk DNS details: **[CLERK_DNS.md](CLERK_DNS.md)**.
