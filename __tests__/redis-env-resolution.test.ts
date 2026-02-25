import { normalizeEnvValue, resolveRedisConfig } from "@/lib/redis-config"

describe("resolveRedisConfig", () => {
  test("returns KV_REST_* values when only KV vars are present", () => {
    const config = resolveRedisConfig({
      KV_REST_API_URL: "https://kv.example.upstash.io",
      KV_REST_API_TOKEN: "kv-token",
    } as NodeJS.ProcessEnv)

    expect(config).toEqual({
      url: "https://kv.example.upstash.io",
      token: "kv-token",
      urlSource: "KV",
      tokenSource: "KV",
    })
  })

  test("returns UPSTASH_KV_* values when present", () => {
    const config = resolveRedisConfig({
      UPSTASH_KV_KV_REST_API_URL: "https://upstash-kv.example.upstash.io",
      UPSTASH_KV_KV_REST_API_TOKEN: "upstash-kv-token",
    } as NodeJS.ProcessEnv)

    expect(config).toEqual({
      url: "https://upstash-kv.example.upstash.io",
      token: "upstash-kv-token",
      urlSource: "UPSTASH_KV",
      tokenSource: "UPSTASH_KV",
    })
  })

  test("returns UPSTASH_REDIS_* values when only redis vars are present", () => {
    const config = resolveRedisConfig({
      UPSTASH_REDIS_REST_URL: "https://redis.example.upstash.io",
      UPSTASH_REDIS_REST_TOKEN: "upstash-redis-token",
    } as NodeJS.ProcessEnv)

    expect(config).toEqual({
      url: "https://redis.example.upstash.io",
      token: "upstash-redis-token",
      urlSource: "UPSTASH_REDIS",
      tokenSource: "UPSTASH_REDIS",
    })
  })

  test("applies priority independently for url and token", () => {
    const config = resolveRedisConfig({
      UPSTASH_KV_KV_REST_API_URL: "https://upstash-kv.example.upstash.io",
      KV_REST_API_URL: "https://kv.example.upstash.io",
      KV_REST_API_TOKEN: "kv-token",
      UPSTASH_REDIS_REST_TOKEN: "upstash-redis-token",
    } as NodeJS.ProcessEnv)

    expect(config).toEqual({
      url: "https://upstash-kv.example.upstash.io",
      token: "kv-token",
      urlSource: "UPSTASH_KV",
      tokenSource: "KV",
    })
  })

  test("returns null when required values are missing", () => {
    expect(resolveRedisConfig({} as NodeJS.ProcessEnv)).toBeNull()
    expect(
      resolveRedisConfig({
        UPSTASH_REDIS_REST_URL: "https://redis.example.upstash.io",
      } as NodeJS.ProcessEnv)
    ).toBeNull()
  })
})

describe("normalizeEnvValue", () => {
  test("strips surrounding quotes and trims whitespace", () => {
    expect(normalizeEnvValue('  "quoted-value"  ')).toBe("quoted-value")
    expect(normalizeEnvValue("  plain-value  ")).toBe("plain-value")
  })

  test("returns null for empty input", () => {
    expect(normalizeEnvValue(undefined)).toBeNull()
    expect(normalizeEnvValue("")).toBeNull()
    expect(normalizeEnvValue("   ")).toBeNull()
  })
})

