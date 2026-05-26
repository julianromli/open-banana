import type { ImageProvider, GenerateImageInput, GenerateImageOutput } from "./types"
import { ProviderError } from "./types"

const IMAGINER_BASE_URL = "https://imaginer.mirava.studio"

function getApiKey(): string {
  const key = process.env.IMAGINER_KEY
  if (!key) {
    throw new ProviderError(
      "Imaginer API key not configured",
      500,
      "PROVIDER_NOT_CONFIGURED",
      false
    )
  }
  return key
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { ...init, signal: controller.signal })
    return response
  } finally {
    clearTimeout(id)
  }
}

/* ------------------------------------------------------------------ */
/*  Upload reference image                                            */
/* ------------------------------------------------------------------ */

export async function uploadReferenceImage(apiKey: string, blob: Blob): Promise<string> {
  const formData = new FormData()
  formData.append("image", blob, "reference.png")

  const response = await fetchWithTimeout(
    `${IMAGINER_BASE_URL}/api/public/v1/upload`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
    },
    30000
  )

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
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

  return data.image_id as string
}

/* ------------------------------------------------------------------ */
/*  Initiate generation                                               */
/* ------------------------------------------------------------------ */

export interface InitGenerationResult {
  generationId: string
  estimatedSeconds?: number
}

export async function initGeneration(
  apiKey: string,
  requestBody: Record<string, unknown>
): Promise<InitGenerationResult> {
  const response = await fetchWithTimeout(
    `${IMAGINER_BASE_URL}/api/public/v1/generate`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    },
    30000
  )

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const status = response.status

    switch (status) {
      case 401:
        throw new ProviderError("Invalid Imaginer API key", 401, "INVALID_API_KEY", true)
      case 429:
        throw new ProviderError("Imaginer rate limit exceeded", 429, "QUOTA_EXCEEDED", true)
      case 402:
        throw new ProviderError(
          "Imaginer payment required \u2014 insufficient balance",
          402,
          "QUOTA_EXCEEDED",
          false
        )
      default:
        if (status >= 500) {
          throw new ProviderError(
            `Imaginer server error: ${status}`,
            status,
            "SERVER_ERROR",
            true
          )
        }
        throw new ProviderError(
          errorData.message || `Imaginer API error: ${status}`,
          status,
          "BAD_REQUEST",
          false
        )
    }
  }

  const result = await response.json()
  const generationId = result.generation_id

  if (!generationId) {
    throw new ProviderError("No generation ID returned", 500, "NO_OUTPUT", true)
  }

  return {
    generationId,
    estimatedSeconds: result.estimated_seconds,
  }
}

/* ------------------------------------------------------------------ */
/*  Check status once                                                 */
/* ------------------------------------------------------------------ */

export interface CheckStatusResult {
  status: string
  progress: number
  urls?: string[]
  error?: string
}

export async function checkGenerationStatus(
  apiKey: string,
  generationId: string
): Promise<CheckStatusResult> {
  const response = await fetchWithTimeout(
    `${IMAGINER_BASE_URL}/api/public/v1/generate/${generationId}`,
    {
      headers: { Authorization: `Bearer ${apiKey}` },
    },
    15000
  )

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new ProviderError(
      errorData.message || `Failed to check generation status: ${response.status}`,
      response.status,
      "POLL_FAILED",
      response.status === 429 || response.status >= 500
    )
  }

  const data = await response.json()
  return {
    status: data.status ?? "unknown",
    progress: data.progress ?? 0,
    urls: data.urls,
    error: data.error,
  }
}

/* ------------------------------------------------------------------ */
/*  Legacy blocking poll                                              */
/* ------------------------------------------------------------------ */

export async function pollGenerationStatus(
  apiKey: string,
  generationId: string,
  onProgress?: (progress: number, status: string) => void
): Promise<string> {
  const maxAttempts = 120 // 120 attempts * 2 seconds = 240 seconds max (4 min)
  const pollInterval = 2000

  for (let i = 0; i < maxAttempts; i++) {
    const data = await checkGenerationStatus(apiKey, generationId)

    if (data.status === "success") {
      if (!data.urls || data.urls.length === 0) {
        throw new ProviderError("No image URLs in success response", 500, "NO_OUTPUT", true)
      }
      return data.urls[0]
    }

    if (data.status === "failed") {
      throw new ProviderError(
        data.error || "Image generation failed",
        500,
        "GENERATION_FAILED",
        false
      )
    }

    onProgress?.(data.progress, data.status)

    await new Promise((resolve) => setTimeout(resolve, pollInterval))
  }

  throw new ProviderError("Generation timed out", 504, "TIMEOUT", true)
}

/* ------------------------------------------------------------------ */
/*  Helpers to build request body                                     */
/* ------------------------------------------------------------------ */

export async function prepareImageInput(
  apiKey: string,
  input: GenerateImageInput
): Promise<Record<string, unknown>> {
  const refImageIds: string[] = []
  if (input.images && input.images.length > 0) {
    for (const img of input.images) {
      let blob: Blob
      if (typeof img === "string") {
        const match = img.match(/^data:(.+);base64,(.*)$/)
        if (!match) {
          throw new ProviderError("Invalid image data format", 400, "IMAGE_ERROR", false)
        }
        const [, mimeType, base64] = match
        const buffer = Buffer.from(base64, "base64")
        blob = new Blob([buffer], { type: mimeType })
      } else {
        blob = img as Blob
      }
      const imageId = await uploadReferenceImage(apiKey, blob)
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

  return requestBody
}

/* ------------------------------------------------------------------ */
/*  Provider class                                                     */
/* ------------------------------------------------------------------ */

export class NanoBananaProvider implements ImageProvider {
  name = "NANO_BANANA" as const

  isConfigured(): boolean {
    return !!process.env.IMAGINER_KEY
  }

  async generateImage(input: GenerateImageInput): Promise<GenerateImageOutput> {
    const apiKey = getApiKey()
    const requestBody = await prepareImageInput(apiKey, input)
    const { generationId } = await initGeneration(apiKey, requestBody)
    const imageUrl = await pollGenerationStatus(apiKey, generationId)

    return {
      url: imageUrl,
      prompt: input.prompt,
    }
  }
}

export const nanoBananaProvider = new NanoBananaProvider()
