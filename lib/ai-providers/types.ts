export type AIProviderType = "NANO_BANANA" | "BYTEPLUS" | "FAL-AI"

export type ImageQuality = "1K" | "2K" | "4K"

/**
 * Image input can be either:
 * - string: base64 data URI (legacy / fallback support)
 * - Blob / File: for direct FormData upload (preferred, avoids double encoding)
 */
export type ImageInput = string | Blob

export interface GenerateImageInput {
  prompt: string
  aspectRatio: string
  mode: "text-to-image" | "image-editing"
  images?: ImageInput[]
  quality?: ImageQuality
  style?: string
}

export interface GenerateImageOutput {
  url: string
  prompt: string
}

export interface ImageProvider {
  name: AIProviderType
  isConfigured(): boolean
  generateImage(input: GenerateImageInput): Promise<GenerateImageOutput>
}

export class ProviderError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errorType: string,
    public isRetriable: boolean
  ) {
    super(message)
    this.name = "ProviderError"
  }
}
