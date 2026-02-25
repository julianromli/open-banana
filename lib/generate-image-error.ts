export function getUserMessageForErrorType(errorType: string, fallbackMessage?: string): string {
  switch (errorType) {
    case "AUTH_REQUIRED":
      return "Please sign in to continue."
    case "INVALID_API_KEY":
      return "Your API key is invalid."
    case "RATE_LIMIT_EXCEEDED":
    case "QUOTA_EXCEEDED":
    case "RESOURCE_EXHAUSTED":
      return "You have reached your daily limit."
    case "CONTENT_POLICY_VIOLATION":
      return "Your prompt cannot be processed due to content safety rules."
    case "IMAGE_ERROR":
      return "Your image format or size is not supported."
    case "PROVIDER_VALIDATION_ERROR":
    case "INVALID_REQUEST":
      return "Your request could not be processed. Please try a different prompt."
    case "MODEL_UNAVAILABLE":
      return "The generation service is temporarily unavailable."
    case "NETWORK_ERROR":
    case "TIMEOUT":
      return "Network issue detected. Please try again."
    case "UNKNOWN_ERROR":
    default:
      return fallbackMessage || "Something went wrong. Please try again."
  }
}

