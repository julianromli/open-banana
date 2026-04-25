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

type FalValidationErrorItem = {
  loc?: unknown[]
  msg?: unknown
  type?: unknown
}

type FalErrorBody = {
  detail?: unknown
}

type FalErrorShape = {
  status?: number
  message?: string
  body?: FalErrorBody
  requestId?: string
}

function formatFalValidationDetail(detail: unknown): string | null {
  if (typeof detail === "string") {
    return detail
  }

  if (Array.isArray(detail)) {
    const formatted = detail
      .map((item) => {
        if (!item || typeof item !== "object") {
          return typeof item === "string" ? item : null
        }

        const errorItem = item as FalValidationErrorItem
        const loc = Array.isArray(errorItem.loc)
          ? errorItem.loc.map((entry) => String(entry)).join(".")
          : "body"
        const message =
          typeof errorItem.msg === "string"
            ? errorItem.msg
            : errorItem.msg
              ? String(errorItem.msg)
              : "Validation error"
        const type = typeof errorItem.type === "string" ? ` (${errorItem.type})` : ""

        return `${loc}: ${message}${type}`
      })
      .filter((item): item is string => !!item)

    if (formatted.length > 0) {
      return formatted.join("; ")
    }
  }

  if (detail && typeof detail === "object") {
    try {
      return JSON.stringify(detail)
    } catch {
      return "Unknown validation error"
    }
  }

  return null
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

    // fal.ai uses presets; quality/style are not directly supported via this model
    if (input.quality && input.quality !== "1K") {
      console.log(`[v0] API: fal.ai - Note: quality ${input.quality} not supported, using preset size`)
    }
    if (input.style && input.style !== "dynamic") {
      console.log(`[v0] API: fal.ai - Note: style ${input.style} not supported by fallback model`)
    }

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

    // fal.ai uses presets; quality/style are not directly supported via this model
    if (input.quality && input.quality !== "1K") {
      console.log(`[v0] API: fal.ai - Note: quality ${input.quality} not supported, using preset size`)
    }
    if (input.style && input.style !== "dynamic") {
      console.log(`[v0] API: fal.ai - Note: style ${input.style} not supported by fallback model`)
    }

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

    const err = error as FalErrorShape
    const status = err.status || 500
    const detail = formatFalValidationDetail(err.body?.detail)
    const message = detail || err.message || "Unknown fal.ai error"

    if (err.requestId) {
      console.error("[v0] API: fal.ai - Request ID:", err.requestId)
    }
    if (detail) {
      console.error("[v0] API: fal.ai - Parsed validation detail:", detail)
    }

    // Determine if retriable (401, 422, 429, 5xx)
    const isRetriable = status === 401 || status === 422 || status === 429 || status >= 500

    if (status === 401) {
      return new ProviderError("Invalid fal.ai API key", 401, "INVALID_API_KEY", isRetriable)
    }

    if (status === 422) {
      return new ProviderError(message, 422, "PROVIDER_VALIDATION_ERROR", isRetriable)
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
