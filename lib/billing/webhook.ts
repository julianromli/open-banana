const SUPPORTED_BILLING_EVENT_TYPES = new Set([
  "subscription.created",
  "subscription.updated",
  "subscription.canceled",
  "subscription.active",
  "subscription.past_due",
  "subscription.revoked",
  "subscription.uncanceled",
  "customer.state_changed",
  "benefit_grant.created",
  "benefit_grant.revoked",
  "benefit_grant.updated",
  "benefit_grant.cycled",
])

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return undefined
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined
}

export function isSupportedBillingEvent(payload: unknown): boolean {
  const root = asRecord(payload)
  const eventType = asString(root?.type)
  return !!eventType && SUPPORTED_BILLING_EVENT_TYPES.has(eventType)
}

export function extractExternalCustomerIdFromWebhookEvent(payload: unknown): string | undefined {
  const root = asRecord(payload)
  const eventType = asString(root?.type)
  const data = asRecord(root?.data)

  if (!eventType || !data) {
    return undefined
  }

  if (eventType === "customer.state_changed") {
    return asString(data.externalId)
  }

  const customer = asRecord(data.customer)
  return asString(customer?.externalId)
}
