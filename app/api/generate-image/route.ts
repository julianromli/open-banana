import { type NextRequest, NextResponse } from "next/server"
import { Redis } from "@upstash/redis"
import { auth, clerkClient } from "@clerk/nextjs/server"
import { generateImageWithFallback, ProviderError } from "@/lib/ai-providers"
import { getUserMessageForErrorType } from "@/lib/generate-image-error"
import { resolveRedisConfig } from "@/lib/redis-config"
import type { ImageInput } from "@/lib/ai-providers/types"

// User tier types and configuration
type UserTier = "free" | "pro"

interface TierConfig {
  limit: number
  name: string
  rateLimitMessage: string
}

const TIER_CONFIGS: Record<UserTier, TierConfig> = {
  free: {
    limit: 5,
    name: "Free",
    rateLimitMessage:
      "You have reached the maximum of 5 generations per day. Upgrade to Pro for 100 generations per day.",
  },
  pro: {
    limit: 100,
    name: "Pro",
    rateLimitMessage:
      "You have reached the Fair Use Policy limit of 100 generations per day. Your limit will reset at midnight UTC.",
  },
}

type GenerateImageErrorBody = {
  errorType: string
  message: string
  redirectUrl?: string
  retryAfter?: number
  resetTime?: number
  tier?: UserTier
  limit?: number
}

function buildErrorResponse(
  status: number,
  body: GenerateImageErrorBody,
  headers?: Record<string, string>
): NextResponse {
  return NextResponse.json(body, { status, headers })
}

async function getUserTier(userId: string): Promise<UserTier> {
  try {
    const client = await clerkClient()
    const user = await client.users.getUser(userId)
    const tier = user.publicMetadata?.tier as UserTier | undefined
    return tier === "pro" ? "pro" : "free"
  } catch (error) {
    console.error("[v0] API: Error fetching user tier from Clerk:", error)
    return "free"
  }
}

let redis: Redis | null = null

function getRedis(): Redis | null {
  const config = resolveRedisConfig()
  if (!config) {
    console.warn("[v0] API: Redis URL or token not configured")
    return null
  }
  if (!redis) {
    redis = new Redis({ url: config.url, token: config.token })
  }
  return redis
}

async function checkRateLimit(userId: string, tier: UserTier) {
  const limit = TIER_CONFIGS[tier].limit
  const now = new Date()
  const today = now.toISOString().split("T")[0]
  const key = `ratelimit:user:${userId}:${today}`

  const endOfDayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0))
  const resetTime = endOfDayUTC.getTime()
  const ttlSeconds = Math.floor((resetTime - now.getTime()) / 1000)

  try {
    const db = getRedis()
    if (!db) {
      return { allowed: true, remaining: limit, resetTime, tier, limit }
    }

    const count = await db.get<number>(key)

    if (count === null) {
      await db.set(key, 1, { ex: ttlSeconds })
      return { allowed: true, remaining: limit - 1, resetTime, tier, limit }
    }

    if (count >= limit) {
      return { allowed: false, remaining: 0, resetTime, tier, limit }
    }

    await db.incr(key)
    return { allowed: true, remaining: limit - count - 1, resetTime, tier, limit }
  } catch (error) {
    console.error("[v0] API: Redis error:", error)
    return { allowed: true, remaining: limit, resetTime, tier, limit }
  }
}

async function urlToBlob(url: string): Promise<Blob> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch image URL: ${response.status}`)
  }
  return await response.blob()
}

export async function POST(request: NextRequest) {
  try {
    const userApiKey = request.headers.get("x-api-key")
    const bypassRateLimit = !!userApiKey

    const referer = request.headers.get("referer") || ""
    const isDev = process.env.NODE_ENV === "development" || referer.includes("v0.dev") || referer.includes("localhost")
    const bypassRateLimitDev = referer.includes("/g") || isDev

    let userId: string | null = null
    let userTier: UserTier = "free"
    let rateLimitInfo: { allowed: boolean; remaining: number; resetTime: number; tier: UserTier; limit: number } | null = null

    if (!bypassRateLimit && !bypassRateLimitDev) {
      const { userId: authUserId } = await auth()
      userId = authUserId
      if (!userId) {
        return buildErrorResponse(401, {
          errorType: "AUTH_REQUIRED",
          message: getUserMessageForErrorType("AUTH_REQUIRED"),
          redirectUrl: "/sign-in",
        })
      }
      userTier = await getUserTier(userId)
      rateLimitInfo = await checkRateLimit(userId, userTier)
      if (!rateLimitInfo.allowed) {
        const retryAfter = Math.max(0, Math.ceil((rateLimitInfo.resetTime - Date.now()) / 1000))
        return buildErrorResponse(429, {
          errorType: "RATE_LIMIT_EXCEEDED",
          message: TIER_CONFIGS[rateLimitInfo.tier].rateLimitMessage,
          tier: rateLimitInfo.tier,
          limit: rateLimitInfo.limit,
          resetTime: rateLimitInfo.resetTime,
          retryAfter,
        }, {
          "X-RateLimit-Limit": rateLimitInfo.limit.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": rateLimitInfo.resetTime.toString(),
          "X-RateLimit-Tier": rateLimitInfo.tier,
        })
      }
    }

    const formData = await request.formData()
    const mode = formData.get("mode") as string
    const prompt = formData.get("prompt") as string
    const aspectRatio = formData.get("aspectRatio") as string
    const quality = formData.get("quality") as string
    const style = (formData.get("style") as string) || "dynamic"

    if (!mode || !prompt) {
      return buildErrorResponse(400, {
        errorType: "INVALID_REQUEST",
        message: getUserMessageForErrorType("INVALID_REQUEST"),
      })
    }

    const validQualities = ["1K", "2K", "4K"] as const
    if (quality && !validQualities.includes(quality as typeof validQualities[number])) {
      return buildErrorResponse(400, {
        errorType: "INVALID_REQUEST",
        message: "Invalid quality. Must be one of: 1K, 2K, 4K.",
      })
    }

    const images: ImageInput[] = []

    if (mode === "image-editing") {
      const image1 = formData.get("image1") as File | null
      const image2 = formData.get("image2") as File | null
      const image1Url = formData.get("image1Url") as string
      const image2Url = formData.get("image2Url") as string

      const hasImage1 = image1 || image1Url
      if (!hasImage1) {
        return buildErrorResponse(400, {
          errorType: "IMAGE_ERROR",
          message: getUserMessageForErrorType("IMAGE_ERROR"),
        })
      }

      try {
        if (image1) {
          images.push(image1)
        } else if (image1Url) {
          images.push(await urlToBlob(image1Url))
        }

        if (image2) {
          images.push(image2)
        } else if (image2Url) {
          const blob = await urlToBlob(image2Url)
          if (blob.size > 0) images.push(blob)
        }
      } catch (error) {
        console.error("[v0] API: Error processing images:", error)
        return buildErrorResponse(400, {
          errorType: "IMAGE_ERROR",
          message: getUserMessageForErrorType("IMAGE_ERROR"),
        })
      }
    }

    const result = await generateImageWithFallback({
      prompt,
      aspectRatio: aspectRatio || "1:1",
      mode: mode as "text-to-image" | "image-editing",
      images: images.length > 0 ? images : undefined,
      quality: (quality as "1K" | "2K" | "4K") || "1K",
      style,
    })

    const responseHeaders: Record<string, string> = {}
    if (!bypassRateLimit && !bypassRateLimitDev && userId && rateLimitInfo) {
      responseHeaders["X-RateLimit-Limit"] = rateLimitInfo.limit.toString()
      responseHeaders["X-RateLimit-Remaining"] = rateLimitInfo.remaining.toString()
      responseHeaders["X-RateLimit-Reset"] = rateLimitInfo.resetTime.toString()
      responseHeaders["X-RateLimit-Tier"] = rateLimitInfo.tier
    }

    return NextResponse.json(
      { url: result.url, prompt: result.prompt, description: "" },
      { headers: responseHeaders }
    )
  } catch (error) {
    console.error("[v0] API: Error generating image:", error)

    if (error instanceof ProviderError) {
      const message = getUserMessageForErrorType(error.errorType, error.message)
      return buildErrorResponse(error.statusCode, {
        errorType: error.errorType,
        message,
      })
    }

    let statusCode = 500
    let errorType = "UNKNOWN_ERROR"
    let errorMessage = getUserMessageForErrorType("UNKNOWN_ERROR")

    if (error && typeof error === "object") {
      const err = error as { message?: string }
      if (
        err.message?.includes("API_KEY") ||
        err.message?.includes("401") ||
        err.message?.includes("not valid")
      ) {
        statusCode = 401
        errorType = "INVALID_API_KEY"
      } else if (
        err.message?.includes("quota") ||
        err.message?.includes("429")
      ) {
        statusCode = 429
        errorType = "QUOTA_EXCEEDED"
      } else if (err.message?.includes("timeout")) {
        statusCode = 504
        errorType = "TIMEOUT"
      } else if (err.message?.includes("fetch") || err.message?.includes("network")) {
        statusCode = 503
        errorType = "NETWORK_ERROR"
      }
      errorMessage = getUserMessageForErrorType(errorType, err.message || errorMessage)
    }

    return buildErrorResponse(statusCode, { errorType, message: errorMessage })
  }
}
