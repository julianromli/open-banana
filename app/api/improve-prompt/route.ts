import { type NextRequest, NextResponse } from "next/server"
import { GoogleGenAI } from "@google/genai"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const userApiKey = request.headers.get("x-api-key")
    const { prompt, mode } = await request.json()

    console.log("[v0] Improve Prompt API: Request received")
    console.log("[v0] Improve Prompt API: Prompt length:", prompt?.length)
    console.log("[v0] Improve Prompt API: Mode:", mode)

    // Validation
    if (!prompt || typeof prompt !== "string") {
      console.log("[v0] Improve Prompt API: Invalid prompt")
      return NextResponse.json({ error: "Prompt is required", errorType: "INVALID_REQUEST" }, { status: 400 })
    }

    const trimmedPrompt = prompt.trim()

    if (trimmedPrompt.length < 3) {
      console.log("[v0] Improve Prompt API: Prompt too short")
      return NextResponse.json(
        { error: "Prompt too short", details: "Please enter at least 3 characters", errorType: "PROMPT_TOO_SHORT" },
        { status: 400 },
      )
    }

    if (trimmedPrompt.length > 500) {
      console.log("[v0] Improve Prompt API: Prompt too long")
      return NextResponse.json(
        {
          error: "Prompt too long",
          details: "Please keep your prompt under 500 characters",
          errorType: "PROMPT_TOO_LONG",
        },
        { status: 400 },
      )
    }

    // Use user API key or system key
    const apiKey = userApiKey || process.env.GEMINI_API_KEY

    if (!apiKey) {
      console.log("[v0] Improve Prompt API: No API key available")
      return NextResponse.json(
        { error: "API key required", details: "Please add your API key to use this feature", errorType: "NO_API_KEY" },
        { status: 401 },
      )
    }

    const ai = new GoogleGenAI({ apiKey })

    // System prompt for enhancement
    const systemPrompt = `You are an expert at writing detailed image generation prompts. Enhance the following prompt by adding:
- Artistic elements (style, mood, atmosphere)
- Technical details (quality, resolution, rendering style)
- Composition details (framing, perspective, focus)
- Lighting and color descriptions
- Specific descriptors for clarity

Keep it balanced between artistic and technical aspects. Return only the enhanced prompt in under 200 words. Do not add explanations or extra text.

Original prompt: ${trimmedPrompt}`

    console.log("[v0] Improve Prompt API: Calling Gemini 2.5 Flash-Lite")

    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: systemPrompt,
    })

    console.log("[v0] Improve Prompt API: Response received")

    const candidate = result.candidates?.[0]
    if (!candidate?.content?.parts?.[0]?.text) {
      console.log("[v0] Improve Prompt API: No text in response")
      throw new Error("No improved prompt generated")
    }

    let improvedPrompt = candidate.content.parts[0].text.trim()

    // Truncate if too long (max 1000 chars output)
    if (improvedPrompt.length > 1000) {
      improvedPrompt = improvedPrompt.substring(0, 997) + "..."
      console.log("[v0] Improve Prompt API: Truncated output to 1000 chars")
    }

    console.log("[v0] Improve Prompt API: Improved prompt length:", improvedPrompt.length)

    return NextResponse.json({
      originalPrompt: trimmedPrompt,
      improvedPrompt,
    })
  } catch (error) {
    console.error("[v0] Improve Prompt API: Error:", error)

    let statusCode = 500
    let errorType = "UNKNOWN_ERROR"
    let userMessage = "Failed to improve prompt"
    let details = ""

    if (error && typeof error === "object") {
      const err = error as any

      if (err.message?.includes("API_KEY_INVALID") || err.message?.includes("API key not valid")) {
        statusCode = 401
        errorType = "INVALID_API_KEY"
        userMessage = "Invalid API key"
        details = "Please check your API key"
      } else if (err.message?.includes("quota") || err.message?.includes("QUOTA_EXCEEDED")) {
        statusCode = 429
        errorType = "QUOTA_EXCEEDED"
        userMessage = "API quota exceeded"
        details = "Please try again later"
      } else if (err.message?.includes("timeout") || err.message?.includes("DEADLINE_EXCEEDED")) {
        statusCode = 504
        errorType = "TIMEOUT"
        userMessage = "Request timed out"
        details = "Please try again"
      } else if (err.message?.includes("network")) {
        statusCode = 503
        errorType = "NETWORK_ERROR"
        userMessage = "Network error"
        details = "Please check your connection"
      } else {
        details = err.message || "Please try again"
      }
    } else {
      details = String(error)
    }

    return NextResponse.json(
      {
        error: userMessage,
        details,
        errorType,
      },
      { status: statusCode },
    )
  }
}
