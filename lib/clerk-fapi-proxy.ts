import { getClerkProxyUrl } from "@/lib/clerk-proxy-url"

/** Default Clerk Frontend API origin (production). */
const DEFAULT_FAPI_ORIGIN = "https://frontend-api.clerk.services"

function getClerkFapiOrigin(): string {
  const fromEnv = process.env.CLERK_FAPI_URL?.trim()
  if (fromEnv) return fromEnv.replace(/\/$/, "")
  return DEFAULT_FAPI_ORIGIN
}

/**
 * Proxy a request to Clerk Frontend API (for /clerk-proxy/* on Workers).
 * @see https://clerk.com/docs/guides/dashboard/dns-domains/proxy-fapi
 */
export async function proxyClerkFrontendApi(request: Request): Promise<Response> {
  const requestUrl = new URL(request.url)
  const proxyBase = new URL(getClerkProxyUrl())
  const proxyPrefix = proxyBase.pathname.replace(/\/$/, "")
  let path = requestUrl.pathname
  if (path.startsWith(proxyPrefix)) {
    path = path.slice(proxyPrefix.length) || "/"
  }

  const fapiOrigin = getClerkFapiOrigin()
  const target = `${fapiOrigin}${path}${requestUrl.search}`

  const headers = new Headers()
  headers.set("Clerk-Proxy-Url", `${proxyBase.origin}${proxyPrefix}/`)
  const secret = process.env.CLERK_SECRET_KEY
  if (secret) {
    headers.set("Clerk-Secret-Key", secret)
  }
  const clientIp =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for") ??
    ""
  if (clientIp) {
    headers.set("X-Forwarded-For", clientIp)
  }
  const accept = request.headers.get("accept")
  if (accept) headers.set("Accept", accept)

  return fetch(target, {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
    redirect: "manual",
  })
}
