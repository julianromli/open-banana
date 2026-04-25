import { type NextRequest, NextResponse } from "next/server"
import { Redis } from "@upstash/redis"
import { auth, clerkClient } from "@clerk/nextjs/server"
import { generateImageWithFallback, ProviderError } from "@/lib/ai-providers"
import { getUserMessageForErrorType } from "@/lib/generate-image-error"
import { resolveRedisConfig } from "@/lib/redis-config"

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
  return NextResponse.json(body, {
    status,
    headers,
  })
}

async function getUserTier(userId: string): Promise<UserTier> {
  try {
    const client = await clerkClient()
    const user = await client.users.getUser(userId)
    const tier = user.publicMetadata?.tier as UserTier | undefined

    // Return "pro" if tier is explicitly "pro", otherwise return "free"
    if (tier === "pro") {
      return "pro"
    }
    return "free"
  } catch (error) {
    console.error("[v0] API: Error fetching user tier from Clerk:", error)
    // Default to "free" tier on error
    return "free"
  }
}

let redis: Redis | null = null

function getRedis(): Redis | null {
  const config = resolveRedisConfig()

  if (!config) {
    console.warn(
      "[v0] API: Redis URL or token not configured (checked UPSTASH_KV_*, KV_REST_*, UPSTASH_REDIS_*)"
    )
    return null
  }

  if (!redis) {
    console.log(
      `[v0] API: Redis config source: url=${config.urlSource}, token=${config.tokenSource}`
    )
    redis = new Redis({ url: config.url, token: config.token })
  }
  return redis
}

async function checkRateLimit(
  userId: string,
  tier: UserTier,
): Promise<{ allowed: boolean; remaining: number; resetTime: number; tier: UserTier; limit: number }> {
  const limit = TIER_CONFIGS[tier].limit
  const now = new Date()
  const today = now.toISOString().split("T")[0] // YYYY-MM-DD format (UTC)
  const key = `ratelimit:user:${userId}:${today}`

  // Get UTC midnight for expiration
  const endOfDayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0))
  const resetTime = endOfDayUTC.getTime()
  const ttlSeconds = Math.floor((resetTime - now.getTime()) / 1000)

  try {
    const db = getRedis()

    if (!db) {
      console.warn("[v0] API: Redis not available, allowing request")
      return { allowed: true, remaining: limit, resetTime, tier, limit }
    }

    // Get current count from Redis
    const count = await db.get<number>(key)

    if (count === null) {
      // First request of the day
      await db.set(key, 1, { ex: ttlSeconds })
      return { allowed: true, remaining: limit - 1, resetTime, tier, limit }
    }

    // Check if limit exceeded
    if (count >= limit) {
      return { allowed: false, remaining: 0, resetTime, tier, limit }
    }

    // Increment count
    await db.incr(key)
    return { allowed: true, remaining: limit - count - 1, resetTime, tier, limit }
  } catch (error) {
    console.error("[v0] API: Redis error:", error)
    // Fallback: allow request if Redis fails
    return { allowed: true, remaining: limit, resetTime, tier, limit }
  }
}

async function imageToBase64DataUri(source: File | string): Promise<string> {
  if (typeof source === "string") {
    // It's a URL, fetch and convert
    const response = await fetch(source)
    const arrayBuffer = await response.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString("base64")
    const mimeType = response.headers.get("content-type") || "image/jpeg"
    return `data:${mimeType};base64,${base64}`
  } else {
    // It's a File
    const arrayBuffer = await source.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString("base64")
    return `data:${source.type};base64,${base64}`
  }
}

export async function POST(request: NextRequest) {
  try {
    const userApiKey = request.headers.get("x-api-key")
    const bypassRateLimit = !!userApiKey // Bypass rate limiting if user provides their own key

    const referer = request.headers.get("referer") || ""
    const isDev = process.env.NODE_ENV === "development" || referer.includes("v0.dev") || referer.includes("localhost")
    const bypassRateLimitDev = referer.includes("/g") || isDev

    console.log("[v0] API: User provided API key:", !!userApiKey)
    console.log("[v0] API: Referer:", referer)
    console.log("[v0] API: Is Dev Mode:", isDev)
    console.log("[v0] API: Bypass rate limit:", bypassRateLimit || bypassRateLimitDev)

    // Get authenticated user
    let userId: string | null = null
    let userTier: UserTier = "free"
    let rateLimitInfo: { allowed: boolean; remaining: number; resetTime: number; tier: UserTier; limit: number } | null = null
    
    // Only require auth if not in bypass mode
    if (!bypassRateLimit && !bypassRateLimitDev) {
      const { userId: authUserId } = await auth()
      userId = authUserId

      // Require authentication
      if (!userId) {
        console.log("[v0] API: Unauthenticated request, redirecting to sign-in")
        return buildErrorResponse(401, {
          errorType: "AUTH_REQUIRED",
          message: getUserMessageForErrorType("AUTH_REQUIRED"),
          redirectUrl: "/sign-in",
        })
      }

      console.log("[v0] API: Authenticated user:", userId)

      userTier = await getUserTier(userId)
      console.log("[v0] API: User tier:", userTier)

      rateLimitInfo = await checkRateLimit(userId, userTier)
      console.log("[v0] API: Rate limit check:", rateLimitInfo)

      if (!rateLimitInfo.allowed) {
        console.log("[v0] API: Rate limit exceeded for user:", userId)
        const now = Date.now()
        const retryAfter = Math.max(0, Math.ceil((rateLimitInfo.resetTime - now) / 1000))
        return buildErrorResponse(
          429,
          {
            errorType: "RATE_LIMIT_EXCEEDED",
            message: TIER_CONFIGS[rateLimitInfo.tier].rateLimitMessage,
            tier: rateLimitInfo.tier,
            limit: rateLimitInfo.limit,
            resetTime: rateLimitInfo.resetTime,
            retryAfter,
          },
          {
            "X-RateLimit-Limit": rateLimitInfo.limit.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": rateLimitInfo.resetTime.toString(),
            "X-RateLimit-Tier": rateLimitInfo.tier,
          }
        )
      }

      console.log("[v0] API: Starting image generation request")
      console.log("[v0] API: Remaining requests today:", rateLimitInfo.remaining)
    } else {
      console.log("[v0] API: Rate limiting bypassed")
    }

    const formData = await request.formData()
    const mode = formData.get("mode") as string
    const prompt = formData.get("prompt") as string
    const aspectRatio = formData.get("aspectRatio") as string
    const quality = formData.get("quality") as string
    const style = (formData.get("style") as string) || "dynamic"

    console.log("[v0] API: Mode:", mode)
    console.log("[v0] API: Prompt:", prompt)
    console.log("[v0] API: Aspect Ratio:", aspectRatio)
    console.log("[v0] API: Quality:", quality)
    console.log("[v0] API: Style:", style)

    if (!mode || !prompt) {
      console.log("[v0] API: Missing required fields")
      return buildErrorResponse(400, {
        errorType: "INVALID_REQUEST",
        message: getUserMessageForErrorType("INVALID_REQUEST"),
      })
    }

    const validQualities = ["1K", "2K", "4K"]
    if (quality && !validQualities.includes(quality)) {
      console.log("[v0] API: Invalid quality:", quality)
      return buildErrorResponse(400, {
        errorType: "INVALID_REQUEST",
        message: "Invalid quality. Must be one of: 1K, 2K, 4K.",
      })
    }

    const imageDataUris: string[] = []

    if (mode === "image-editing") {
      console.log("[v0] API: Processing images for editing mode")

      const image1 = formData.get("image1") as File
      const image2 = formData.get("image2") as File
      const image1Url = formData.get("image1Url") as string
      const image2Url = formData.get("image2Url") as string

      const hasImage1 = image1 || image1Url
      const hasImage2 = image2 || image2Url

      if (!hasImage1) {
        console.log("[v0] API: Missing first image for editing mode")
        return buildErrorResponse(400, {
          errorType: "IMAGE_ERROR",
          message: getUserMessageForErrorType("IMAGE_ERROR"),
        })
      }

      try {
        if (image1) {
          imageDataUris.push(await imageToBase64DataUri(image1))
          console.log("[v0] API: Image1 converted to data URI")
        } else if (image1Url) {
          imageDataUris.push(await imageToBase64DataUri(image1Url))
          console.log("[v0] API: Image1 URL fetched and converted")
        }

        if (image2) {
          imageDataUris.push(await imageToBase64DataUri(image2))
          console.log("[v0] API: Image2 converted to data URI")
        } else if (image2Url) {
          imageDataUris.push(await imageToBase64DataUri(image2Url))
          console.log("[v0] API: Image2 URL fetched and converted")
        }
      } catch (error) {
        console.error("[v0] API: Error processing images:", error)
        return buildErrorResponse(400, {
          errorType: "IMAGE_ERROR",
          message: getUserMessageForErrorType("IMAGE_ERROR"),
        })
      }

      console.log("[v0] API: Total images prepared:", imageDataUris.length)
    }

    // Use the provider abstraction with automatic fallback
    const result = await generateImageWithFallback({
      prompt,
      aspectRatio: aspectRatio || "1:1",
      mode: mode as "text-to-image" | "image-editing",
      images: imageDataUris.length > 0 ? imageDataUris : undefined,
      quality: (quality as "1K" | "2K" | "4K") || "1K",
      style,
    })

    const responseHeaders: Record<string, string> = {}

    // Only include rate limit headers if rate limiting is active
    if (!bypassRateLimit && !bypassRateLimitDev && userId && rateLimitInfo) {
      responseHeaders["X-RateLimit-Limit"] = rateLimitInfo.limit.toString()
      responseHeaders["X-RateLimit-Remaining"] = rateLimitInfo.remaining.toString()
      responseHeaders["X-RateLimit-Reset"] = rateLimitInfo.resetTime.toString()
      responseHeaders["X-RateLimit-Tier"] = rateLimitInfo.tier
    }

    return NextResponse.json(
      {
        url: result.url,
        prompt: result.prompt,
        description: "",
      },
      {
        headers: responseHeaders,
      },
    )
  } catch (error) {
    console.error("[v0] API: Error generating image:", error)

    // Handle ProviderError with proper status codes
    if (error instanceof ProviderError) {
      const message = getUserMessageForErrorType(error.errorType)
      console.error("[v0] API: ProviderError detail:", {
        statusCode: error.statusCode,
        errorType: error.errorType,
        detail: error.message,
      })
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

      // API Key errors
      if (
        err.message?.includes("API_KEY_INVALID") ||
        err.message?.includes("API key not valid") ||
        err.message?.includes("401")
      ) {
        statusCode = 401
        errorType = "INVALID_API_KEY"
        errorMessage = getUserMessageForErrorType(errorType)
      } else if (
        err.message?.includes("quota") ||
        err.message?.includes("QUOTA_EXCEEDED") ||
        err.message?.includes("429")
      ) {
        statusCode = 429
        errorType = "QUOTA_EXCEEDED"
        errorMessage = getUserMessageForErrorType(errorType)
      } else if (err.message?.includes("RESOURCE_EXHAUSTED")) {
        statusCode = 429
        errorType = "RESOURCE_EXHAUSTED"
        errorMessage = getUserMessageForErrorType(errorType)
      }
      // Content policy errors
      else if (
        err.message?.includes("SAFETY") ||
        err.message?.includes("content policy") ||
        err.message?.includes("blocked") ||
        err.message?.includes("sensitive")
      ) {
        statusCode = 400
        errorType = "CONTENT_POLICY_VIOLATION"
        errorMessage = getUserMessageForErrorType(errorType)
      }
      // Image format/size errors
      else if (err.message?.includes("image") && (err.message?.includes("format") || err.message?.includes("size"))) {
        statusCode = 400
        errorType = "IMAGE_ERROR"
        errorMessage = getUserMessageForErrorType(errorType)
      }
      // Network/timeout errors
      else if (err.message?.includes("timeout") || err.message?.includes("DEADLINE_EXCEEDED")) {
        statusCode = 504
        errorType = "TIMEOUT"
        errorMessage = getUserMessageForErrorType(errorType)
      } else if (
        err.message?.includes("network") ||
        err.message?.includes("ENOTFOUND") ||
        err.message?.includes("fetch")
      ) {
        statusCode = 503
        errorType = "NETWORK_ERROR"
        errorMessage = getUserMessageForErrorType(errorType)
      }
      // Invalid request errors
      else if (err.message?.includes("INVALID_ARGUMENT") || err.message?.includes("invalid")) {
        statusCode = 400
        errorType = "INVALID_REQUEST"
        errorMessage = getUserMessageForErrorType(errorType)
      }
      // Model not found/unavailable
      else if (err.message?.includes("NOT_FOUND") || err.message?.includes("model")) {
        statusCode = 503
        errorType = "MODEL_UNAVAILABLE"
        errorMessage = getUserMessageForErrorType(errorType)
      }
      // Generic error fallback
      else {
        errorMessage = getUserMessageForErrorType("UNKNOWN_ERROR")
      }

      console.error("[v0] API: Error type:", errorType)
      console.error("[v0] API: Error message:", err.message)
      console.error("[v0] API: Status code:", statusCode)
    } else {
      console.error("[v0] API: Unknown thrown error:", String(error))
    }

    return buildErrorResponse(statusCode, {
      errorType,
      message: errorMessage,
    })
  }
}
