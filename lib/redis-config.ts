type RedisEnvSource = "UPSTASH_KV" | "KV" | "UPSTASH_REDIS"

type RedisConfig = {
  url: string
  token: string
  urlSource: RedisEnvSource
  tokenSource: RedisEnvSource
}

type ResolvedEnvValue = {
  value: string
  source: RedisEnvSource
}

const URL_ENV_PRIORITY: Array<{ key: string; source: RedisEnvSource }> = [
  { key: "UPSTASH_KV_KV_REST_API_URL", source: "UPSTASH_KV" },
  { key: "KV_REST_API_URL", source: "KV" },
  { key: "UPSTASH_REDIS_REST_URL", source: "UPSTASH_REDIS" },
]

const TOKEN_ENV_PRIORITY: Array<{ key: string; source: RedisEnvSource }> = [
  { key: "UPSTASH_KV_KV_REST_API_TOKEN", source: "UPSTASH_KV" },
  { key: "KV_REST_API_TOKEN", source: "KV" },
  { key: "UPSTASH_REDIS_REST_TOKEN", source: "UPSTASH_REDIS" },
]

export function normalizeEnvValue(value: string | undefined): string | null {
  if (!value) {
    return null
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  return trimmed.replace(/^"(.*)"$/, "$1")
}

function resolveEnvValue(
  env: NodeJS.ProcessEnv,
  priority: Array<{ key: string; source: RedisEnvSource }>
): ResolvedEnvValue | null {
  for (const entry of priority) {
    const normalized = normalizeEnvValue(env[entry.key])
    if (normalized) {
      return {
        value: normalized,
        source: entry.source,
      }
    }
  }

  return null
}

export function resolveRedisConfig(env: NodeJS.ProcessEnv = process.env): RedisConfig | null {
  const url = resolveEnvValue(env, URL_ENV_PRIORITY)
  const token = resolveEnvValue(env, TOKEN_ENV_PRIORITY)

  if (!url || !token) {
    return null
  }

  return {
    url: url.value,
    token: token.value,
    urlSource: url.source,
    tokenSource: token.source,
  }
}

