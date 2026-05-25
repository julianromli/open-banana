import { type NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

/**
 * Allowed image origin patterns for the proxy.
 * More permissive than before: any imaginer.qcloud / myqcloud / fal.media
 * is whitelisted. This prevents takedown-triggered CORS failures on
 * copy/download from the frontend.
 */
const ALLOWED_IMAGE_ORIGINS = [
  "fal.media",
  "myqcloud.com",
  "qcloud.com",
  "imaginer.mirava.studio",
]

function isAllowedImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return ALLOWED_IMAGE_ORIGINS.some((origin) =>
      parsed.hostname.endsWith(origin)
    )
  } catch {
    return false
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const imageUrl = searchParams.get("url")

    if (!imageUrl) {
      return NextResponse.json(
        { error: "URL parameter is required" },
        { status: 400 }
      )
    }

    if (!isAllowedImageUrl(imageUrl)) {
      return NextResponse.json(
        { error: "Invalid URL origin" },
        { status: 400 }
      )
    }

    const response = await fetch(imageUrl, {
      headers: {
        // Some COS URLs require a referer or UA
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`)
    }

    const imageBuffer = await response.arrayBuffer()
    const contentType =
      response.headers.get("content-type") || "image/png"

    return new NextResponse(imageBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000",
        // Allow cross-origin access from our own frontend
        "Access-Control-Allow-Origin": "*",
      },
    })
  } catch (error) {
    console.error("Error proxying image:", error)
    return NextResponse.json(
      { error: "Failed to proxy image" },
      { status: 500 }
    )
  }
}
