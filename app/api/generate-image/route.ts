import { type NextRequest, NextResponse } from "next/server"
import { Redis } from "@upstash/redis"
import { auth, clerkClient } from "@clerk/nextjs/server"
import { generateImageWithFallback, ProviderError } from "@/lib/ai-providers"

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
  const url = process.env.UPSTASH_KV_KV_REST_API_URL || process.env.KV_REST_API_URL
  const token = process.env.UPSTASH_KV_KV_REST_API_TOKEN || process.env.KV_REST_API_TOKEN

  if (!url || !token) {
    console.warn("[v0] API: Redis URL or token not configured")
    return null
  }

  if (!redis) {
    redis = new Redis({ url, token })
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
        return NextResponse.json(
          {
            error: "Authentication required",
            message: "Please sign in to generate images",
            redirectUrl: "/sign-in",
          },
          { status: 401 },
        )
      }

      console.log("[v0] API: Authenticated user:", userId)

      userTier = await getUserTier(userId)
      console.log("[v0] API: User tier:", userTier)

      rateLimitInfo = await checkRateLimit(userId, userTier)
      console.log("[v0] API: Rate limit check:", rateLimitInfo)

      if (!rateLimitInfo.allowed) {
        console.log("[v0] API: Rate limit exceeded for user:", userId)
        return NextResponse.json(
          {
            error: "Rate limit exceeded",
            message: TIER_CONFIGS[rateLimitInfo.tier].rateLimitMessage,
            tier: rateLimitInfo.tier,
            limit: rateLimitInfo.limit,
            resetTime: rateLimitInfo.resetTime,
          },
          {
            status: 429,
            headers: {
              "X-RateLimit-Limit": rateLimitInfo.limit.toString(),
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": rateLimitInfo.resetTime.toString(),
              "X-RateLimit-Tier": rateLimitInfo.tier,
            },
          },
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

    console.log("[v0] API: Mode:", mode)
    console.log("[v0] API: Prompt:", prompt)
    console.log("[v0] API: Aspect Ratio:", aspectRatio)

    if (!mode || !prompt) {
      console.log("[v0] API: Missing required fields")
      return NextResponse.json({ error: "Mode and prompt are required" }, { status: 400 })
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
        return NextResponse.json({ error: "At least one image is required for editing mode" }, { status: 400 })
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
        return NextResponse.json({ error: "Failed to process images" }, { status: 400 })
      }

      console.log("[v0] API: Total images prepared:", imageDataUris.length)
    }

    // Use the provider abstraction with automatic fallback
    const result = await generateImageWithFallback({
      prompt,
      aspectRatio: aspectRatio || "1:1",
      mode: mode as "text-to-image" | "image-editing",
      images: imageDataUris.length > 0 ? imageDataUris : undefined,
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
      return NextResponse.json(
        {
          error: error.message,
          errorType: error.errorType,
          details: error.message,
        },
        { status: error.statusCode },
      )
    }

    let statusCode = 500
    let errorType = "UNKNOWN_ERROR"
    let userMessage = "Failed to generate image"
    let details = ""

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
        userMessage = "Invalid API key"
        details = "The provided API key is not valid. Please check your API key and try again."
      } else if (
        err.message?.includes("quota") ||
        err.message?.includes("QUOTA_EXCEEDED") ||
        err.message?.includes("429")
      ) {
        statusCode = 429
        errorType = "QUOTA_EXCEEDED"
        userMessage = "API quota exceeded"
        details = "You've reached your API quota limit. Please try again later or upgrade your plan."
      } else if (err.message?.includes("RESOURCE_EXHAUSTED")) {
        statusCode = 429
        errorType = "RESOURCE_EXHAUSTED"
        userMessage = "Resource limit reached"
        details = "The API is currently overloaded. Please try again in a moment."
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
        userMessage = "Content policy violation"
        details = "Your prompt may contain content that violates our policies. Please try a different prompt."
      }
      // Image format/size errors
      else if (err.message?.includes("image") && (err.message?.includes("format") || err.message?.includes("size"))) {
        statusCode = 400
        errorType = "IMAGE_ERROR"
        userMessage = "Image format or size error"
        details = "Please ensure your images are in a supported format (JPEG, PNG, WebP) and under 20MB."
      }
      // Network/timeout errors
      else if (err.message?.includes("timeout") || err.message?.includes("DEADLINE_EXCEEDED")) {
        statusCode = 504
        errorType = "TIMEOUT"
        userMessage = "Request timed out"
        details = "The request took too long to complete. Please try again with a simpler prompt or smaller images."
      } else if (
        err.message?.includes("network") ||
        err.message?.includes("ENOTFOUND") ||
        err.message?.includes("fetch")
      ) {
        statusCode = 503
        errorType = "NETWORK_ERROR"
        userMessage = "Network error"
        details = "Unable to connect to the image generation service. Please check your connection and try again."
      }
      // Invalid request errors
      else if (err.message?.includes("INVALID_ARGUMENT") || err.message?.includes("invalid")) {
        statusCode = 400
        errorType = "INVALID_REQUEST"
        userMessage = "Invalid request"
        details = err.message || "The request parameters are invalid. Please check your inputs and try again."
      }
      // Model not found/unavailable
      else if (err.message?.includes("NOT_FOUND") || err.message?.includes("model")) {
        statusCode = 503
        errorType = "MODEL_UNAVAILABLE"
        userMessage = "Service temporarily unavailable"
        details = "The image generation model is temporarily unavailable. Please try again later."
      }
      // Generic error fallback
      else {
        details = err.message || "An unexpected error occurred. Please try again."
      }

      console.error("[v0] API: Error type:", errorType)
      console.error("[v0] API: Error message:", err.message)
      console.error("[v0] API: Status code:", statusCode)
    } else {
      details = String(error)
    }

    return NextResponse.json(
      {
        error: userMessage,
        details: details,
        errorType: errorType,
      },
      { status: statusCode },
    )
  }
}
