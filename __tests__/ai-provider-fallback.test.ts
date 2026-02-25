describe("generateImageWithFallback", () => {
  const input = {
    prompt: "spongebob",
    aspectRatio: "1:1",
    mode: "text-to-image" as const,
  }

  beforeEach(() => {
    jest.resetModules()
    process.env.AI_PROVIDER = "FAL-AI"
  })

  afterEach(() => {
    delete process.env.AI_PROVIDER
    delete process.env.FAL_KEY
    delete process.env.BYTEPLUS_API_KEY
  })

  test("falls back to BytePlus when FAL returns retriable 422", async () => {
    const { ProviderError } = await import("@/lib/ai-providers/types")

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

    const { generateImageWithFallback } = await import("@/lib/ai-providers")
    const result = await generateImageWithFallback(input)

    expect(result.url).toBe("data:image/png;base64,abc")
    expect(falGenerateImage).toHaveBeenCalledTimes(1)
    expect(byteGenerateImage).toHaveBeenCalledTimes(1)
  })

  test("does not fallback when FAL returns non-retriable 400", async () => {
    const { ProviderError } = await import("@/lib/ai-providers/types")

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

