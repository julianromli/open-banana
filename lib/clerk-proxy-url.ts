import { getSiteUrl } from "@/lib/site-url"

/** Optional Clerk FAPI proxy (only when `NEXT_PUBLIC_CLERK_PROXY_URL` is set). */
export function getClerkProxyUrl(): string | undefined {
  const fromEnv = process.env.NEXT_PUBLIC_CLERK_PROXY_URL?.trim()
  if (!fromEnv) return undefined
  return fromEnv.replace(/\/$/, "")
}
