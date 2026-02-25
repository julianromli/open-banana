import type { AIProviderType, ImageProvider, GenerateImageInput, GenerateImageOutput } from "./types"
import { ProviderError } from "./types"
import { bytePlusProvider } from "./byteplus"
import { falAIProvider } from "./fal-ai"

// Re-export types
export type { AIProviderType, ImageProvider, GenerateImageInput, GenerateImageOutput }
export { ProviderError }

// All available providers
const providers: Record<AIProviderType, ImageProvider> = {
  BYTEPLUS: bytePlusProvider,
  "FAL-AI": falAIProvider,
}

/**
 * Get a specific provider by type
 */
export function getProvider(type: AIProviderType): ImageProvider {
  const provider = providers[type]
  if (!provider) {
    throw new Error(`Unknown provider type: ${type}`)
  }
  return provider
}

/**
 * Get all configured providers (those with API keys set)
 */
export function getConfiguredProviders(): ImageProvider[] {
  return Object.values(providers).filter((p) => p.isConfigured())
}

/**
 * Get the primary provider type from environment
 */
export function getPrimaryProviderType(): AIProviderType {
  const envValue = process.env.AI_PROVIDER?.toUpperCase()
  if (envValue === "FAL-AI" || envValue === "FALAI" || envValue === "FAL") {
    return "FAL-AI"
  }
  return "BYTEPLUS" // default
}

/**
 * Generate image with automatic fallback on retriable errors (401, 422, 429, 5xx)
 * Does NOT fallback on non-retriable 4xx errors (e.g. content policy violations)
 */
export async function generateImageWithFallback(
  input: GenerateImageInput
): Promise<GenerateImageOutput> {
  const primaryType = getPrimaryProviderType()
  const configuredProviders = getConfiguredProviders()

  if (configuredProviders.length === 0) {
    throw new ProviderError(
      "No AI providers configured. Please set BYTEPLUS_API_KEY or FAL_KEY.",
      500,
      "NO_PROVIDER_CONFIGURED",
      false
    )
  }

  // Sort providers: primary first, then others as fallback
  const sortedProviders = [...configuredProviders].sort((a, b) => {
    if (a.name === primaryType) return -1
    if (b.name === primaryType) return 1
    return 0
  })

  console.log(
    "[v0] API: Configured providers:",
    sortedProviders.map((p) => p.name).join(", ")
  )
  console.log("[v0] API: Primary provider:", primaryType)

  let lastError: ProviderError | null = null

  for (const provider of sortedProviders) {
    try {
      console.log(`[v0] API: Trying provider: ${provider.name}`)
      const result = await provider.generateImage(input)
      console.log(`[v0] API: Success with provider: ${provider.name}`)
      return result
    } catch (error) {
      const providerError =
        error instanceof ProviderError
          ? error
          : new ProviderError(
              error instanceof Error ? error.message : "Unknown error",
              500,
              "UNKNOWN_ERROR",
              true
            )

      lastError = providerError

      console.error(
        `[v0] API: Provider ${provider.name} failed:`,
        providerError.message,
        `(retriable: ${providerError.isRetriable})`
      )

      // Only fallback if the error is retriable (401, 429, 5xx)
      if (providerError.isRetriable) {
        console.log(`[v0] API: Error is retriable, trying fallback...`)
        continue
      }

      // Non-retriable error (400) - throw immediately, don't try fallback
      console.log(`[v0] API: Error is not retriable, throwing immediately`)
      throw providerError
    }
  }

  // All providers failed with retriable errors
  throw (
    lastError ||
    new ProviderError("All providers failed", 500, "ALL_PROVIDERS_FAILED", false)
  )
}
