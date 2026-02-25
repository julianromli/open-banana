import { getUserMessageForErrorType } from "@/lib/generate-image-error"

describe("getUserMessageForErrorType", () => {
  test("maps expected error types to one-sentence user messages", () => {
    expect(getUserMessageForErrorType("AUTH_REQUIRED")).toBe("Please sign in to continue.")
    expect(getUserMessageForErrorType("INVALID_API_KEY")).toBe("Your API key is invalid.")
    expect(getUserMessageForErrorType("RATE_LIMIT_EXCEEDED")).toBe("You have reached your daily limit.")
    expect(getUserMessageForErrorType("CONTENT_POLICY_VIOLATION")).toBe(
      "Your prompt cannot be processed due to content safety rules."
    )
    expect(getUserMessageForErrorType("IMAGE_ERROR")).toBe("Your image format or size is not supported.")
    expect(getUserMessageForErrorType("PROVIDER_VALIDATION_ERROR")).toBe(
      "Your request could not be processed. Please try a different prompt."
    )
    expect(getUserMessageForErrorType("MODEL_UNAVAILABLE")).toBe(
      "The generation service is temporarily unavailable."
    )
    expect(getUserMessageForErrorType("NETWORK_ERROR")).toBe("Network issue detected. Please try again.")
  })

  test("uses fallback for unknown error type", () => {
    expect(getUserMessageForErrorType("SOMETHING_NEW", "Fallback text")).toBe("Fallback text")
    expect(getUserMessageForErrorType("SOMETHING_NEW")).toBe("Something went wrong. Please try again.")
  })
})

