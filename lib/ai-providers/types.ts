export type AIProviderType = "BYTEPLUS" | "FAL-AI"

export interface GenerateImageInput {
  prompt: string
  aspectRatio: string
  mode: "text-to-image" | "image-editing"
  images?: string[] // base64 data URIs for editing mode
}

export interface GenerateImageOutput {
  url: string // base64 data URI or URL
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
