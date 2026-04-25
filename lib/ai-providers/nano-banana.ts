import type { ImageProvider, GenerateImageInput, GenerateImageOutput } from "./types"
import { ProviderError } from "./types"

const IMAGINER_BASE_URL = "https://imaginer.mirava.studio"

function dataUriToBlob(dataUri: string): Blob {
  const match = dataUri.match(/^data:(.+);base64,(.*)$/)
  if (!match) {
    throw new Error("Invalid data URI")
  }
  const [, mimeType, base64] = match
  const buffer = Buffer.from(base64, "base64")
  return new Blob([buffer], { type: mimeType })
}

async function uploadReferenceImage(apiKey: string, base64DataUri: string): Promise<string> {
  const blob = dataUriToBlob(base64DataUri)
  const formData = new FormData()
  formData.append("image", blob, "reference.png")

  const response = await fetch(`${IMAGINER_BASE_URL}/api/public/v1/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    console.error("[v0] API: NanoBanana - Upload error:", errorData)
    throw new ProviderError(
      errorData.message || `Failed to upload reference image: ${response.status}`,
      response.status,
      "UPLOAD_FAILED",
      response.status === 429 || response.status >= 500
    )
  }

  const data = await response.json()
  if (!data.image_id) {
    throw new ProviderError("No image_id returned from upload", 500, "UPLOAD_FAILED", true)
  }

  console.log("[v0] API: NanoBanana - Reference image uploaded:", data.image_id)
  return data.image_id as string
}

async function pollGenerationStatus(apiKey: string, generationId: string): Promise<string> {
  const maxAttempts = 60 // 60 attempts * 2 seconds = 120 seconds max
  const pollInterval = 2000 // 2 seconds

  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch(`${IMAGINER_BASE_URL}/api/public/v1/generate/${generationId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error("[v0] API: NanoBanana - Poll error:", errorData)
      throw new ProviderError(
        `Failed to check generation status: ${response.status}`,
        response.status,
        "POLL_FAILED",
        response.status === 429 || response.status >= 500
      )
    }

    const data = await response.json()

    if (data.status === "success") {
      if (!data.urls || data.urls.length === 0) {
        throw new ProviderError("No image URLs in success response", 500, "NO_OUTPUT", true)
      }
      console.log("[v0] API: NanoBanana - Generation complete:", generationId)
      return data.urls[0] as string
    }

    if (data.status === "failed") {
      throw new ProviderError(
        data.error || "Image generation failed",
        500,
        "GENERATION_FAILED",
        false
      )
    }

    // processing or polling - log progress and wait
    if (data.progress !== undefined) {
      console.log(`[v0] API: NanoBanana - Generation ${generationId} progress: ${data.progress}%`)
    } else {
      console.log(`[v0] API: NanoBanana - Generation ${generationId} status: ${data.status}`)
    }

    await new Promise((resolve) => setTimeout(resolve, pollInterval))
  }

  throw new ProviderError("Generation timed out", 504, "TIMEOUT", true)
}

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

    // Upload reference images if provided
    const refImageIds: string[] = []
    if (input.images && input.images.length > 0) {
      console.log(`[v0] API: NanoBanana - Uploading ${input.images.length} reference image(s)`)
      for (const imageDataUri of input.images) {
        const imageId = await uploadReferenceImage(apiKey, imageDataUri)
        refImageIds.push(imageId)
      }
    }

    const requestBody: Record<string, unknown> = {
      model_id: "nano-banana-2",
      prompt: input.prompt,
      ratio: input.aspectRatio || "1:1",
      quality: input.quality || "1K",
      style: input.style || "dynamic",
    }

    if (refImageIds.length > 0) {
      requestBody.ref_image_ids = refImageIds
    }

    console.log("[v0] API: NanoBanana - Calling Imaginer generate API")

    const response = await fetch(`${IMAGINER_BASE_URL}/api/public/v1/generate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    })

    console.log("[v0] API: NanoBanana - Generate response status:", response.status)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error("[v0] API: NanoBanana - Generate error:", errorData)

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

      if (response.status === 402) {
        throw new ProviderError(
          "Imaginer payment required — insufficient balance",
          402,
          "QUOTA_EXCEEDED",
          false
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
        errorData.error?.message || errorData.message || `Imaginer API error: ${response.status}`,
        response.status,
        "BAD_REQUEST",
        false
      )
    }

    const result = await response.json()
    const generationId = result.generation_id

    if (!generationId) {
      throw new ProviderError("No generation ID returned", 500, "NO_OUTPUT", true)
    }

    console.log("[v0] API: NanoBanana - Generation ID:", generationId)

    // Poll for completion
    const imageUrl = await pollGenerationStatus(apiKey, generationId)

    return {
      url: imageUrl,
      prompt: input.prompt,
    }
  }
}

export const nanoBananaProvider = new NanoBananaProvider()
