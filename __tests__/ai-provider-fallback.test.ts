import { ProviderError } from "@/lib/ai-providers/types"

describe("generateImageWithFallback", () => {
  const input = {
    prompt: "spongebob",
    aspectRatio: "1:1",
    mode: "text-to-image" as const,
  }

  // Snapshot env vars before tests and clear them so no real provider loads
  let originalIMAGINER_KEY: string | undefined
  let originalBYTEPLUS_KEY: string | undefined
  let originalFAL_KEY: string | undefined

  beforeAll(() => {
    originalIMAGINER_KEY = process.env.IMAGINER_KEY
    originalBYTEPLUS_KEY = process.env.BYTEPLUS_API_KEY
    originalFAL_KEY = process.env.FAL_KEY
  })

  afterAll(() => {
    process.env.IMAGINER_KEY = originalIMAGINER_KEY
    process.env.BYTEPLUS_API_KEY = originalBYTEPLUS_KEY
    process.env.FAL_KEY = originalFAL_KEY
  })

  beforeEach(() => {
    jest.resetModules()
    // Remove all real provider env keys so the test uses only mocks
    delete process.env.IMAGINER_KEY
    delete process.env.BYTEPLUS_API_KEY
    delete process.env.FAL_KEY
    // Tie primary provider to the one under test so sort order is predictable
    process.env.AI_PROVIDER = "FAL-AI"
  })

  afterEach(() => {
    delete process.env.AI_PROVIDER
    jest.dontMock("@/lib/ai-providers/fal-ai")
    jest.dontMock("@/lib/ai-providers/byteplus")
    jest.dontMock("@/lib/ai-providers/nano-banana")
  })

  test("falls back to BytePlus when FAL returns retriable 422", async () => {
    const falGenerateImage = jest
      .fn()
      .mockRejectedValue(new ProviderError("Validation mismatch", 422, "PROVIDER_VALIDATION_ERROR", true))
    const byteGenerateImage = jest.fn().mockResolvedValue({
      url: "data:image/png;base64,abc",
      prompt: input.prompt,
    })

    jest.doMock("@/lib/ai-providers/fal-ai", () => ({
      falAIProvider: {
        name: "FAL-AI",
        isConfigured: () => true,
        generateImage: falGenerateImage,
      },
    }))

    jest.doMock("@/lib/ai-providers/byteplus", () => ({
      bytePlusProvider: {
        name: "BYTEPLUS",
        isConfigured: () => true,
        generateImage: byteGenerateImage,
      },
    }))

    jest.doMock("@/lib/ai-providers/nano-banana", () => ({
      nanoBananaProvider: {
        name: "NANO_BANANA",
        isConfigured: () => false,
        generateImage: jest.fn(),
      },
    }))

    const { generateImageWithFallback } = await import("@/lib/ai-providers")
    const result = await generateImageWithFallback(input)

    expect(result.url).toBe("data:image/png;base64,abc")
    expect(falGenerateImage).toHaveBeenCalledTimes(1)
    expect(byteGenerateImage).toHaveBeenCalledTimes(1)
  })

  test.skip("does not fallback when FAL returns non-retriable 400", async () => {
    const falError = new ProviderError("Prompt blocked", 400, "BAD_REQUEST", false)
    const falGenerateImage = jest.fn().mockRejectedValue(falError)
    const byteGenerateImage = jest.fn()

    jest.doMock("@/lib/ai-providers/fal-ai", () => ({
      falAIProvider: {
        name: "FAL-AI",
        isConfigured: () => true,
        generateImage: falGenerateImage,
      },
    }))

    jest.doMock("@/lib/ai-providers/byteplus", () => ({
      bytePlusProvider: {
        name: "BYTEPLUS",
        isConfigured: () => true,
        generateImage: byteGenerateImage,
      },
    }))

    jest.doMock("@/lib/ai-providers/nano-banana", () => ({
      nanoBananaProvider: {
        name: "NANO_BANANA",
        isConfigured: () => false,
        generateImage: jest.fn(),
      },
    }))

    const { generateImageWithFallback } = await import("@/lib/ai-providers")

    await expect(generateImageWithFallback(input)).rejects.toMatchObject({
      statusCode: 400,
      errorType: "BAD_REQUEST",
      isRetriable: false,
      message: "Prompt blocked",
    })

    expect(falGenerateImage).toHaveBeenCalledTimes(1)
    expect(byteGenerateImage).not.toHaveBeenCalled()
  })
})
