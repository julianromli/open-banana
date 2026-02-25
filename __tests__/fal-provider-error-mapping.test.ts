const mockSubscribe = jest.fn()
const mockConfig = jest.fn()

jest.mock("@fal-ai/client", () => ({
  fal: {
    subscribe: (...args: unknown[]) => mockSubscribe(...args),
    config: (...args: unknown[]) => mockConfig(...args),
  },
}))

import { FalAIProvider } from "@/lib/ai-providers/fal-ai"
import { ProviderError } from "@/lib/ai-providers/types"

describe("FalAIProvider error mapping", () => {
  const originalFalKey = process.env.FAL_KEY

  const input = {
    prompt: "spongebob",
    aspectRatio: "1:1",
    mode: "text-to-image" as const,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.FAL_KEY = "test-fal-key"
  })

  afterEach(() => {
    if (originalFalKey === undefined) {
      delete process.env.FAL_KEY
      return
    }

    process.env.FAL_KEY = originalFalKey
  })

  test("maps 422 validation detail to retriable PROVIDER_VALIDATION_ERROR", async () => {
    mockSubscribe.mockRejectedValueOnce({
      status: 422,
      message: "Unprocessable Entity",
      body: {
        detail: [
          {
            loc: ["body", "image_size"],
            msg: "Invalid image size",
            type: "value_error",
          },
        ],
      },
      requestId: "req-422",
    })

    const provider = new FalAIProvider()

    let error: unknown
    try {
      await provider.generateImage(input)
    } catch (caughtError) {
      error = caughtError
    }

    expect(error).toBeInstanceOf(ProviderError)
    const providerError = error as ProviderError
    expect(providerError.statusCode).toBe(422)
    expect(providerError.errorType).toBe("PROVIDER_VALIDATION_ERROR")
    expect(providerError.isRetriable).toBe(true)
    expect(providerError.message).toContain("body.image_size")
    expect(providerError.message).toContain("Invalid image size")
    expect(providerError.message).not.toContain("[object Object]")
  })

  test("maps 400 to BAD_REQUEST and non-retriable", async () => {
    mockSubscribe.mockRejectedValueOnce({
      status: 400,
      message: "Bad Request",
      body: {
        detail: "Prompt blocked",
      },
    })

    const provider = new FalAIProvider()

    await expect(provider.generateImage(input)).rejects.toMatchObject({
      statusCode: 400,
      errorType: "BAD_REQUEST",
      isRetriable: false,
      message: "Prompt blocked",
    })
  })

  test("maps 401/429/500 to retriable provider errors", async () => {
    const provider = new FalAIProvider()

    mockSubscribe.mockRejectedValueOnce({
      status: 401,
      message: "Unauthorized",
    })
    await expect(provider.generateImage(input)).rejects.toMatchObject({
      statusCode: 401,
      errorType: "INVALID_API_KEY",
      isRetriable: true,
    })

    mockSubscribe.mockRejectedValueOnce({
      status: 429,
      message: "Too Many Requests",
    })
    await expect(provider.generateImage(input)).rejects.toMatchObject({
      statusCode: 429,
      errorType: "QUOTA_EXCEEDED",
      isRetriable: true,
    })

    mockSubscribe.mockRejectedValueOnce({
      status: 500,
      message: "Internal Server Error",
    })
    await expect(provider.generateImage(input)).rejects.toMatchObject({
      statusCode: 500,
      errorType: "SERVER_ERROR",
      isRetriable: true,
    })
  })
})
