import { type NextRequest, NextResponse } from "next/server"
import { GoogleGenAI } from "@google/genai"
import { Redis } from "@upstash/redis"

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

// Rate limiting: 2 requests per day per IP
const MAX_REQUESTS_PER_DAY = 2

async function checkRateLimit(ip: string): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  const now = Date.now()
  const today = new Date().toISOString().split("T")[0] // YYYY-MM-DD format
  const key = `ratelimit:${ip}:${today}`

  // Get end of day timestamp for expiration
  const endOfDay = new Date()
  endOfDay.setHours(23, 59, 59, 999)
  const resetTime = endOfDay.getTime()
  const ttlSeconds = Math.floor((resetTime - now) / 1000)

  try {
    // Get current count from Redis
    const count = await redis.get<number>(key)

    if (count === null) {
      // First request of the day
      await redis.set(key, 1, { ex: ttlSeconds })
      return { allowed: true, remaining: MAX_REQUESTS_PER_DAY - 1, resetTime }
    }

    // Check if limit exceeded
    if (count >= MAX_REQUESTS_PER_DAY) {
      return { allowed: false, remaining: 0, resetTime }
    }

    // Increment count
    await redis.incr(key)
    return { allowed: true, remaining: MAX_REQUESTS_PER_DAY - count - 1, resetTime }
  } catch (error) {
    console.error("[v0] API: Redis error:", error)
    // Fallback: allow request if Redis fails
    return { allowed: true, remaining: MAX_REQUESTS_PER_DAY, resetTime }
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || request.headers.get("x-real-ip") || "unknown"
    console.log("[v0] API: Request from IP:", ip)

    const userApiKey = request.headers.get("x-api-key")
    const bypassRateLimit = !!userApiKey // Bypass rate limiting if user provides their own key

    const referer = request.headers.get("referer") || ""
    const isDev = process.env.NODE_ENV === "development" || referer.includes("v0.dev") || referer.includes("localhost")
    const bypassRateLimitDev = referer.includes("/g") || isDev

    console.log("[v0] API: User provided API key:", !!userApiKey)
    console.log("[v0] API: Referer:", referer)
    console.log("[v0] API: Is Dev Mode:", isDev)
    console.log("[v0] API: Bypass rate limit:", bypassRateLimit || bypassRateLimitDev)

    // Only apply rate limiting if user didn't provide their own key and not in dev/bypass mode
    if (!bypassRateLimit && !bypassRateLimitDev) {
      const rateLimit = await checkRateLimit(ip)
      console.log("[v0] API: Rate limit check:", rateLimit)

      if (!rateLimit.allowed) {
        const resetDate = new Date(rateLimit.resetTime)
        console.log("[v0] API: Rate limit exceeded for IP:", ip)
        return NextResponse.json(
          {
            error: "Rate limit exceeded",
            message: `You have reached the maximum of ${MAX_REQUESTS_PER_DAY} generations per day. Please try again after ${resetDate.toLocaleTimeString()} or use your own API key.`,
            resetTime: rateLimit.resetTime,
          },
          {
            status: 429,
            headers: {
              "X-RateLimit-Limit": MAX_REQUESTS_PER_DAY.toString(),
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": rateLimit.resetTime.toString(),
            },
          },
        )
      }

      console.log("[v0] API: Starting image generation request")
      console.log("[v0] API: Remaining requests today:", rateLimit.remaining)
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

    const apiKey = userApiKey || process.env.GEMINI_API_KEY

    if (!apiKey) {
      console.log("[v0] API: No API key available")
      return NextResponse.json(
        { error: "API key not configured. Please provide your own API key or contact support." },
        { status: 500 },
      )
    }

    const ai = new GoogleGenAI({ apiKey })

    const getAspectRatioString = (ratio: string): string => {
      // Return the ratio string directly if it matches Gemini's format
      const validRatios = ["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"]
      if (validRatios.includes(ratio)) {
        return ratio
      }

      // Fallback for legacy values
      switch (ratio) {
        case "square":
          return "1:1"
        case "portrait":
          return "9:16"
        case "landscape":
          return "16:9"
        case "wide":
          return "21:9"
        default:
          return "1:1"
      }
    }

    const aspectRatioString = getAspectRatioString(aspectRatio || "square")

    let result: any

    if (mode === "text-to-image") {
      console.log("[v0] API: Using text-to-image mode with Gemini")
      console.log("[v0] API: Using aspect_ratio:", aspectRatioString)

      result = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: prompt,
        config: {
          responseModalities: ["Image"],
          imageConfig: {
            aspectRatio: aspectRatioString,
          },
        },
      })
    } else if (mode === "image-editing") {
      console.log("[v0] API: Using image-editing mode with Gemini")
      console.log("[v0] API: Using aspect_ratio:", aspectRatioString)

      const image1 = formData.get("image1") as File
      const image2 = formData.get("image2") as File
      const image1Url = formData.get("image1Url") as string
      const image2Url = formData.get("image2Url") as string

      // Check if we have at least one image (file or URL)
      const hasImage1 = image1 || image1Url
      const hasImage2 = image2 || image2Url

      if (!hasImage1) {
        console.log("[v0] API: Missing first image for editing mode")
        return NextResponse.json({ error: "At least one image is required for editing mode" }, { status: 400 })
      }

      console.log("[v0] API: Processing images for Gemini")

      const parts: any[] = [{ text: prompt }]

      if (image1) {
        const image1Buffer = await image1.arrayBuffer()
        const image1Base64 = Buffer.from(image1Buffer).toString("base64")
        parts.push({
          inlineData: {
            mimeType: image1.type,
            data: image1Base64,
          },
        })
        console.log("[v0] API: Image1 added as inline data")
      } else if (image1Url) {
        // For URLs, we need to fetch and convert to base64
        try {
          const response = await fetch(image1Url)
          const arrayBuffer = await response.arrayBuffer()
          const base64 = Buffer.from(arrayBuffer).toString("base64")
          const mimeType = response.headers.get("content-type") || "image/jpeg"
          parts.push({
            inlineData: {
              mimeType,
              data: base64,
            },
          })
          console.log("[v0] API: Image1 URL fetched and converted")
        } catch (error) {
          console.error("[v0] API: Error fetching image1 URL:", error)
          return NextResponse.json({ error: "Failed to fetch image from URL" }, { status: 400 })
        }
      }

      if (image2) {
        const image2Buffer = await image2.arrayBuffer()
        const image2Base64 = Buffer.from(image2Buffer).toString("base64")
        parts.push({
          inlineData: {
            mimeType: image2.type,
            data: image2Base64,
          },
        })
        console.log("[v0] API: Image2 added as inline data")
      } else if (image2Url) {
        try {
          const response = await fetch(image2Url)
          const arrayBuffer = await response.arrayBuffer()
          const base64 = Buffer.from(arrayBuffer).toString("base64")
          const mimeType = response.headers.get("content-type") || "image/jpeg"
          parts.push({
            inlineData: {
              mimeType,
              data: base64,
            },
          })
          console.log("[v0] API: Image2 URL fetched and converted")
        } catch (error) {
          console.error("[v0] API: Error fetching image2 URL:", error)
          // Continue with just one image
        }
      }

      console.log("[v0] API: Total parts for editing:", parts.length)

      result = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: [
          {
            role: "user",
            parts,
          },
        ],
        config: {
          responseModalities: ["Image"],
          imageConfig: {
            aspectRatio: aspectRatioString,
          },
        },
      })
    } else {
      console.log("[v0] API: Invalid mode:", mode)
      return NextResponse.json({ error: "Invalid mode. Must be 'text-to-image' or 'image-editing'" }, { status: 400 })
    }

    console.log("[v0] API: Gemini response received")

    const candidate = result.candidates?.[0]
    if (!candidate?.content?.parts) {
      console.log("[v0] API: No image in response")
      throw new Error("No images generated")
    }

    // Find the image part in the response
    const imagePart = candidate.content.parts.find((part: any) => part.inlineData)

    if (!imagePart?.inlineData?.data) {
      console.log("[v0] API: No inline image data found")
      throw new Error("No images generated")
    }

    const mimeType = imagePart.inlineData.mimeType || "image/png"
    const imageUrl = `data:${mimeType};base64,${imagePart.inlineData.data}`

    console.log("[v0] API: Generated image data URL created")

    return NextResponse.json(
      {
        url: imageUrl,
        prompt: prompt,
        description: "",
      },
      {
        headers: {
          "X-RateLimit-Limit": MAX_REQUESTS_PER_DAY.toString(),
          "X-RateLimit-Remaining":
            bypassRateLimit || bypassRateLimitDev
              ? MAX_REQUESTS_PER_DAY.toString()
              : (await redis.get<number>(`ratelimit:${ip}:${new Date().toISOString().split("T")[0]}`))?.toString() ||
                "0",
          "X-RateLimit-Reset":
            bypassRateLimit || bypassRateLimitDev ? "0" : new Date().setHours(23, 59, 59, 999).toString(),
        },
      },
    )
  } catch (error) {
    console.error("[v0] API: Error generating image:", error)

    let statusCode = 500
    let errorType = "UNKNOWN_ERROR"
    let userMessage = "Failed to generate image"
    let details = ""

    if (error && typeof error === "object") {
      const err = error as any

      // API Key errors
      if (err.message?.includes("API_KEY_INVALID") || err.message?.includes("API key not valid")) {
        statusCode = 401
        errorType = "INVALID_API_KEY"
        userMessage = "Invalid API key"
        details = "The provided API key is not valid. Please check your API key and try again."
      } else if (err.message?.includes("quota") || err.message?.includes("QUOTA_EXCEEDED")) {
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
        err.message?.includes("blocked")
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
