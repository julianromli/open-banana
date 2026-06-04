/**
 * Create Clerk production DNS records in Cloudflare (DNS only / grey cloud).
 * Targets match Clerk's standard production CNAMEs; verify in Clerk Dashboard → Domains.
 *
 * Usage:
 *   node scripts/setup-clerk-dns.mjs
 *   $env:CLOUDFLARE_API_TOKEN="..."; node scripts/setup-clerk-dns.mjs
 *
 * Requires: wrangler login (OAuth) or API token with Zone DNS Edit
 */
import { readFileSync, existsSync } from "node:fs"
import { spawnSync } from "node:child_process"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const ZONE_NAME = "openbanana.fun"

/** @type {{ name: string; type: string; content: string; proxied: boolean }[]} */
const CLERK_RECORDS = [
  { name: "clerk", type: "CNAME", content: "frontend-api.clerk.services", proxied: false },
  { name: "accounts", type: "CNAME", content: "accounts.clerk.services", proxied: false },
]

function loadEnvFile(path) {
  if (!existsSync(path)) return
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq < 1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = value
  }
}

function getCloudflareToken() {
  loadEnvFile(join(root, ".env.local"))
  if (process.env.CLOUDFLARE_API_TOKEN?.trim()) {
    return process.env.CLOUDFLARE_API_TOKEN.trim()
  }
  if (process.env.CF_API_TOKEN?.trim()) {
    return process.env.CF_API_TOKEN.trim()
  }
  return getWranglerToken()
}

function getWranglerToken() {
  const result = spawnSync("npx", ["wrangler", "auth", "token", "--json"], {
    cwd: root,
    encoding: "utf8",
    shell: true,
  })
  if (result.status !== 0) {
    console.error(result.stderr || "wrangler auth token failed")
    process.exit(1)
  }
  const match = result.stdout.match(/\{[\s\S]*\}/)
  if (!match) {
    console.error("Could not parse wrangler auth token JSON")
    process.exit(1)
  }
  const json = JSON.parse(match[0])
  if (!json.token) {
    console.error("No OAuth token from wrangler")
    process.exit(1)
  }
  return json.token
}

async function cfApi(token, path, options = {}) {
  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  })
  const data = await res.json()
  if (!data.success) {
    const err =
      data.errors?.map((e) => `${e.code}: ${e.message}`).join("; ") || res.statusText
    throw new Error(err)
  }
  return data
}

async function main() {
  const token = getCloudflareToken()
  const zones = await cfApi(token, `/zones?name=${ZONE_NAME}`)
  const zone = zones.result?.[0]
  if (!zone?.id) {
    console.error(`Zone not found: ${ZONE_NAME}. Add domain to Cloudflare first.`)
    process.exit(1)
  }
  console.log(`Zone ${ZONE_NAME} id=${zone.id}`)

  const existing = await cfApi(token, `/zones/${zone.id}/dns_records?per_page=100`)
  const byKey = new Map(existing.result.map((r) => [`${r.type}:${r.name}`, r]))

  for (const rec of CLERK_RECORDS) {
    const fqdn = `${rec.name}.${ZONE_NAME}`
    const key = `${rec.type}:${fqdn}`
    const found = byKey.get(key)
    const body = {
      type: rec.type,
      name: rec.name,
      content: rec.content,
      proxied: rec.proxied,
      ttl: 1,
    }

    if (found) {
      if (found.content === rec.content && found.proxied === rec.proxied) {
        console.log(`OK ${key} -> ${rec.content} (proxied=${rec.proxied})`)
        continue
      }
      await cfApi(token, `/zones/${zone.id}/dns_records/${found.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      })
      console.log(`UPDATED ${key} -> ${rec.content} (proxied=${rec.proxied})`)
    } else {
      await cfApi(token, `/zones/${zone.id}/dns_records`, {
        method: "POST",
        body: JSON.stringify(body),
      })
      console.log(`CREATED ${key} -> ${rec.content} (proxied=${rec.proxied})`)
    }
  }

  console.log("\nVerify: nslookup clerk.openbanana.fun 8.8.8.8")
  console.log("Clerk Dashboard → Domains should show Verified after propagation.")
}

main().catch((e) => {
  console.error(e.message)
  if (String(e.message).includes("Authentication") || String(e.message).includes("10000")) {
    console.error(
      "\nOAuth token lacks DNS write. Either:\n" +
        "  1. Cloudflare Dashboard → DNS → add CNAME clerk + accounts (DNS only)\n" +
        "  2. Create API token (Zone DNS Edit) and run:\n" +
        "     $env:CLOUDFLARE_API_TOKEN='...'; node scripts/setup-clerk-dns.mjs"
    )
  }
  process.exit(1)
})
