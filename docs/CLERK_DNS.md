# Clerk DNS for openbanana.fun

Production Clerk uses **Frontend API** `clerk.openbanana.fun` and **Account portal** `accounts.openbanana.fun`. All records should show **Verified** in Clerk Dashboard → Configure → Domains.

## Clerk Dashboard (app URL)

Add your **primary app URL**:

- **Allowed origins:** `https://openbanana.fun`
- **Redirect URLs:** `https://openbanana.fun/*`

Also keep `https://open-banana.faizintifada.workers.dev` if you still use the Workers subdomain.

## Cloudflare DNS

| Type | Name | Target | Proxy |
|------|------|--------|-------|
| CNAME | `clerk` | `frontend-api.clerk.services` | DNS only (grey cloud) |
| CNAME | `accounts` | `accounts.clerk.services` | DNS only |

Email records (`clkmail`, `clk._domainkey`, `clk2._domainkey`) are shown in Clerk Dashboard when using Clerk email.

Automate (API token with **Zone → DNS → Edit**):

```powershell
$env:CLOUDFLARE_API_TOKEN = "your-token"
pnpm run setup-clerk-dns
```

## Verify

```powershell
nslookup clerk.openbanana.fun 8.8.8.8
curl -sI "https://clerk.openbanana.fun/npm/@clerk/clerk-js@5/dist/clerk.browser.js"
```

Expect HTTP **200** or **307** to a versioned `clerk.browser.js` URL — not `ERR_NAME_NOT_RESOLVED`.

## After DNS works

1. Set `NEXT_PUBLIC_APP_URL=https://openbanana.fun` in `.env.local`, Worker secrets, and redeploy.
2. Remove `NEXT_PUBLIC_CLERK_PROXY_URL` from secrets if you no longer need the Workers proxy fallback.
3. Hard-refresh `https://openbanana.fun`.
