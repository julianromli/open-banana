import { fal } from "@fal-ai/client"
import type { ImageProvider, GenerateImageInput, GenerateImageOutput } from "./types"
import { ProviderError } from "./types"
import { getFalSize } from "./utils"

const TEXT_TO_IMAGE_MODEL = "fal-ai/bytedance/seedream/v4.5/text-to-image"
const IMAGE_EDITING_MODEL = "fal-ai/bytedance/seedream/v4.5/edit"

interface FalImage {
  url: string
  content_type?: string
  file_name?: string
  file_size?: number
  width?: number
  height?: number
}

interface FalTextToImageOutput {
  images: FalImage[]
  seed: number
}

interface FalEditOutput {
  images: FalImage[]
}

export class FalAIProvider implements ImageProvider {
  name = "FAL-AI" as const

  constructor() {
    // Configure fal client if FAL_KEY is available
    if (process.env.FAL_KEY) {
      fal.config({
        credentials: process.env.FAL_KEY,
      })
    }
  }

  isConfigured(): boolean {
    return !!process.env.FAL_KEY
  }

  async generateImage(input: GenerateImageInput): Promise<GenerateImageOutput> {
    if (!process.env.FAL_KEY) {
      throw new ProviderError(
        "fal.ai API key not configured",
        500,
        "PROVIDER_NOT_CONFIGURED",
        false
      )
    }

    // Ensure client is configured
    fal.config({
      credentials: process.env.FAL_KEY,
    })

    const imageSize = getFalSize(input.aspectRatio)

    try {
      if (input.mode === "image-editing" && input.images && input.images.length > 0) {
        return await this.generateEditedImage(input, imageSize)
      } else {
        return await this.generateTextToImage(input, imageSize)
      }
    } catch (error) {
      throw this.handleError(error)
    }
  }

  private async generateTextToImage(
    input: GenerateImageInput,
    imageSize: string
  ): Promise<GenerateImageOutput> {
    console.log("[v0] API: fal.ai - Calling text-to-image API")

    const result = await fal.subscribe(TEXT_TO_IMAGE_MODEL, {
      input: {
        prompt: input.prompt,
        image_size: imageSize,
        num_images: 1,
        enable_safety_checker: true,
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS" && update.logs) {
          update.logs.map((log) => log.message).forEach((msg) => {
            console.log("[v0] API: fal.ai -", msg)
          })
        }
      },
    })

    const data = result.data as FalTextToImageOutput

    if (!data.images || data.images.length === 0) {
      throw new ProviderError("No images generated", 500, "NO_OUTPUT", true)
    }

    console.log("[v0] API: fal.ai - Generated image URL received")

    return {
      url: data.images[0].url,
      prompt: input.prompt,
    }
  }

  private async generateEditedImage(
    input: GenerateImageInput,
    imageSize: string
  ): Promise<GenerateImageOutput> {
    console.log("[v0] API: fal.ai - Calling image editing API")

    const result = await fal.subscribe(IMAGE_EDITING_MODEL, {
      input: {
        prompt: input.prompt,
        image_size: imageSize,
        num_images: 1,
        enable_safety_checker: true,
        image_urls: input.images, // fal.ai accepts base64 data URIs directly
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS" && update.logs) {
          update.logs.map((log) => log.message).forEach((msg) => {
            console.log("[v0] API: fal.ai -", msg)
          })
        }
      },
    })

    const data = result.data as FalEditOutput

    if (!data.images || data.images.length === 0) {
      throw new ProviderError("No images generated", 500, "NO_OUTPUT", true)
    }

    console.log("[v0] API: fal.ai - Edited image URL received")

    return {
      url: data.images[0].url,
      prompt: input.prompt,
    }
  }

  private handleError(error: unknown): ProviderError {
    console.error("[v0] API: fal.ai - Error:", error)

    if (error instanceof ProviderError) {
      return error
    }

    const err = error as { status?: number; message?: string; body?: { detail?: string } }
    const status = err.status || 500
    const message = err.body?.detail || err.message || "Unknown fal.ai error"

    // Determine if retriable (401, 429, 5xx)
    const isRetriable = status === 401 || status === 429 || status >= 500

    if (status === 401) {
      return new ProviderError("Invalid fal.ai API key", 401, "INVALID_API_KEY", isRetriable)
    }

    if (status === 429) {
      return new ProviderError("fal.ai rate limit exceeded", 429, "QUOTA_EXCEEDED", isRetriable)
    }

    if (status >= 500) {
      return new ProviderError(`fal.ai server error: ${status}`, status, "SERVER_ERROR", isRetriable)
    }

    // 400 errors - not retriable
    return new ProviderError(message, status, "BAD_REQUEST", false)
  }
}

export const falAIProvider = new FalAIProvider()
