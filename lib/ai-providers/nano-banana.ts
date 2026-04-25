import type { ImageProvider, GenerateImageInput, GenerateImageOutput } from "./types"
import { ProviderError } from "./types"
import { getNanoBananaSize, DEFAULT_QUALITY } from "./utils"

const NANO_BANANA_ENDPOINT = "https://api.imaginer.ai/v1/images/generations"

export class NanoBananaProvider implements ImageProvider {
  name = "NANO_BANANA" as const

  isConfigured(): boolean {
    return !!process.env.IMAGINER_KEY
  }

  async generateImage(input: GenerateImageInput): Promise<GenerateImageOutput> {
    const apiKey = process.env.IMAGINER_KEY

    if (!apiKey) {
      throw new ProviderError(
        "Imaginer API key not configured",
        500,
        "PROVIDER_NOT_CONFIGURED",
        false
      )
    }

    const quality = input.quality || DEFAULT_QUALITY
    const size = getNanoBananaSize(input.aspectRatio, quality)
    const style = input.style || "dynamic"

    const requestBody: Record<string, unknown> = {
      model: "nano-banana-2",
      prompt: input.prompt,
      size: size,
      style: style,
      quality: quality,
      sequential_image_generation: "disabled",
      watermark: false,
      response_format: "b64_json",
      optimize_prompt_options: {
        mode: "standard",
      },
    }

    // Add images for image-editing mode
    if (input.mode === "image-editing" && input.images && input.images.length > 0) {
      requestBody.image = input.images
    }

    console.log("[v0] API: NanoBanana - Calling Imaginer API")

    const response = await fetch(NANO_BANANA_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    })

    console.log("[v0] API: NanoBanana - Response status:", response.status)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error("[v0] API: NanoBanana - Error response:", errorData)

      const isRetriable = response.status === 401 || response.status === 429 || response.status >= 500

      if (response.status === 401) {
        throw new ProviderError(
          "Invalid Imaginer API key",
          401,
          "INVALID_API_KEY",
          isRetriable
        )
      }

      if (response.status === 429) {
        throw new ProviderError(
          "Imaginer rate limit exceeded",
          429,
          "QUOTA_EXCEEDED",
          isRetriable
        )
      }

      if (response.status >= 500) {
        throw new ProviderError(
          `Imaginer server error: ${response.status}`,
          response.status,
          "SERVER_ERROR",
          isRetriable
        )
      }

      // 400 errors - not retriable
      throw new ProviderError(
        errorData.error?.message || `Imaginer API error: ${response.status}`,
        response.status,
        "BAD_REQUEST",
        false
      )
    }

    const result = await response.json()
    const imageData = result.data?.[0]

    if (!imageData) {
      throw new ProviderError("No images generated", 500, "NO_OUTPUT", true)
    }

    let imageUrl: string

    if (imageData.b64_json) {
      imageUrl = `data:image/png;base64,${imageData.b64_json}`
      console.log("[v0] API: NanoBanana - Generated image from b64_json")
    } else if (imageData.url) {
      imageUrl = imageData.url
      console.log("[v0] API: NanoBanana - Generated image URL received")
    } else {
      throw new ProviderError(
        "Unexpected response format from Imaginer API",
        500,
        "INVALID_RESPONSE",
        true
      )
    }

    return {
      url: imageUrl,
      prompt: input.prompt,
    }
  }
}

export const nanoBananaProvider = new NanoBananaProvider()
