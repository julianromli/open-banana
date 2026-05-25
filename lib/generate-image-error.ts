/**
 * Centralized error type definitions and user-friendly messages
 * for the generate-image API route and provider layer.
 */

export type GenerateErrorType =
  | "AUTH_REQUIRED"
  | "RATE_LIMIT_EXCEEDED"
  | "INVALID_REQUEST"
  | "IMAGE_ERROR"
  | "INVALID_API_KEY"
  | "QUOTA_EXCEEDED"
  | "RESOURCE_EXHAUSTED"
  | "CONTENT_POLICY_VIOLATION"
  | "TIMEOUT"
  | "NETWORK_ERROR"
  | "MODEL_UNAVAILABLE"
  | "PROVIDER_NOT_CONFIGURED"
  | "NO_PROVIDER_CONFIGURED"
  | "GENERATION_FAILED"
  | "UPLOAD_FAILED"
  | "POLL_FAILED"
  | "NO_OUTPUT"
  | "PROVIDER_VALIDATION_ERROR"
  | "SERVER_ERROR"
  | "ALL_PROVIDERS_FAILED"
  | "UNKNOWN_ERROR"

/**
 * Map internal error types to user-facing messages.
 */
const ERROR_MESSAGES: Record<GenerateErrorType, string> = {
  AUTH_REQUIRED: "Please sign in to continue.",
  RATE_LIMIT_EXCEEDED: "You have reached your daily limit.",
  INVALID_REQUEST: "Invalid request parameters. Please check your prompt and settings.",
  IMAGE_ERROR: "Your image format or size is not supported.",
  INVALID_API_KEY: "Your API key is invalid.",
  QUOTA_EXCEEDED: "API quota or credit balance exhausted. Please check your Imaginer dashboard.",
  RESOURCE_EXHAUSTED: "Service temporarily overloaded. Please try again in a moment.",
  CONTENT_POLICY_VIOLATION:
    "Your prompt cannot be processed due to content safety rules.",
  TIMEOUT: "Generation timed out. The model may be busy—please try again.",
  NETWORK_ERROR: "Network issue detected. Please try again.",
  MODEL_UNAVAILABLE: "The generation service is temporarily unavailable.",
  PROVIDER_NOT_CONFIGURED: "Provider is not configured.",
  NO_PROVIDER_CONFIGURED:
    "No AI providers are configured. Please set IMAGINER_KEY, BYTEPLUS_API_KEY, or FAL_KEY.",
  GENERATION_FAILED:
    "Image generation failed. Please adjust your prompt or parameters and try again.",
  UPLOAD_FAILED:
    "Failed to upload reference image. Make sure it is a valid JPG/PNG/WebP under 10 MB.",
  POLL_FAILED: "Failed to check generation status. The task may still be running.",
  NO_OUTPUT: "No image was returned. This may be a temporary issue—please try again.",
  PROVIDER_VALIDATION_ERROR:
    "Your request could not be processed. Please try a different prompt.",
  SERVER_ERROR: "Server error. Please try again later.",
  ALL_PROVIDERS_FAILED: "All image generation providers failed. Please try again later.",
  UNKNOWN_ERROR: "Something went wrong. Please try again.",
}

export function getUserMessageForErrorType(
  type: string,
  fallback?: string
): string {
  const message = ERROR_MESSAGES[type as GenerateErrorType]
  if (message) return message
  return fallback ?? ERROR_MESSAGES.UNKNOWN_ERROR
}

/**
 * HTTP status code mapping for error types.
 */
const ERROR_STATUS_CODES: Record<GenerateErrorType, number> = {
  AUTH_REQUIRED: 401,
  RATE_LIMIT_EXCEEDED: 429,
  INVALID_REQUEST: 400,
  IMAGE_ERROR: 400,
  INVALID_API_KEY: 401,
  QUOTA_EXCEEDED: 429,
  RESOURCE_EXHAUSTED: 429,
  CONTENT_POLICY_VIOLATION: 400,
  TIMEOUT: 504,
  NETWORK_ERROR: 503,
  MODEL_UNAVAILABLE: 503,
  PROVIDER_NOT_CONFIGURED: 500,
  NO_PROVIDER_CONFIGURED: 500,
  GENERATION_FAILED: 500,
  UPLOAD_FAILED: 500,
  POLL_FAILED: 500,
  NO_OUTPUT: 500,
  PROVIDER_VALIDATION_ERROR: 422,
  SERVER_ERROR: 500,
  ALL_PROVIDERS_FAILED: 500,
  UNKNOWN_ERROR: 500,
}

export function getStatusCodeForErrorType(type: string): number {
  return ERROR_STATUS_CODES[type as GenerateErrorType] ?? 500
}
