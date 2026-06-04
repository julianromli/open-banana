/** Canonical app URL for metadata, JSON-LD, and Polar return URLs. */
export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "")
  }
  return "https://openbanana.fun"
}
