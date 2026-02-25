import {
  extractExternalCustomerIdFromWebhookEvent,
  isSupportedBillingEvent,
} from "@/lib/billing/webhook"

describe("billing webhook helpers", () => {
  test("detects supported events", () => {
    expect(isSupportedBillingEvent({ type: "subscription.created" })).toBe(true)
    expect(isSupportedBillingEvent({ type: "customer.state_changed" })).toBe(true)
    expect(isSupportedBillingEvent({ type: "order.created" })).toBe(false)
  })

  test("extracts external id from subscription event payload", () => {
    const externalId = extractExternalCustomerIdFromWebhookEvent({
      type: "subscription.updated",
      data: {
        customer: {
          externalId: "user_123",
        },
      },
    })

    expect(externalId).toBe("user_123")
  })

  test("extracts external id from customer state changed payload", () => {
    const externalId = extractExternalCustomerIdFromWebhookEvent({
      type: "customer.state_changed",
      data: {
        externalId: "user_456",
      },
    })

    expect(externalId).toBe("user_456")
  })
})
