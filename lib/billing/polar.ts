import { Polar } from "@polar-sh/sdk"
import { ResourceNotFound } from "@polar-sh/sdk/models/errors/resourcenotfound"
import { type SubscriptionStatus } from "@polar-sh/sdk/models/components/subscriptionstatus"
import { type CustomerState } from "@polar-sh/sdk/models/components/customerstate"
import { type CustomerStateSubscription } from "@polar-sh/sdk/models/components/customerstatesubscription"
import { type Subscription } from "@polar-sh/sdk/models/components/subscription"
import { type BillingSnapshot, type BillingStatus, type UserTier } from "@/lib/billing/types"

type PolarServer = "sandbox" | "production"

export function getPolarServer(): PolarServer {
  return process.env.POLAR_SERVER === "production" ? "production" : "sandbox"
}

export function getRequiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} is not configured`)
  }
  return value
}

export function getConfiguredProProductId(): string | undefined {
  const productId = process.env.POLAR_PRO_MONTHLY_PRODUCT_ID
  if (productId && productId.length > 0) {
    return productId
  }

  // Backward compatibility with previous env name.
  const legacy = process.env.POLAR_PRO_MONTHLY_PRICE_ID
  return legacy && legacy.length > 0 ? legacy : undefined
}

export function getRequiredProProductId(): string {
  const productId = getConfiguredProProductId()
  if (!productId) {
    throw new Error("POLAR_PRO_MONTHLY_PRODUCT_ID is not configured")
  }
  return productId
}

export function getPolarClient(): Polar {
  return new Polar({
    accessToken: getRequiredEnv("POLAR_ACCESS_TOKEN"),
    server: getPolarServer(),
  })
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined
}

type PriceLike = { id?: unknown; productId?: unknown }

function pickPriceId(prices: unknown): string | undefined {
  if (!Array.isArray(prices)) {
    return undefined
  }

  for (const price of prices) {
    const p = price as PriceLike
    const id = asString(p?.id)
    if (id) {
      return id
    }
  }

  return undefined
}

function isActiveSubscriptionStatus(status: SubscriptionStatus | string): boolean {
  return status === "active" || status === "trialing"
}

function isConfiguredProSubscription(productId: string): boolean {
  const configuredProProductId = getConfiguredProProductId()
  if (!configuredProProductId) {
    // Fail-open for backward compatibility if env is not configured yet.
    return true
  }
  return productId === configuredProProductId
}

export function mapSubscriptionStatus(status: SubscriptionStatus | string): BillingStatus {
  if (status === "active" || status === "trialing") {
    return "active"
  }
  if (status === "past_due") {
    return "past_due"
  }
  if (status === "incomplete" || status === "incomplete_expired") {
    return "incomplete"
  }
  return "canceled"
}

export function snapshotFromSubscription(subscription: Subscription): BillingSnapshot {
  const status = mapSubscriptionStatus(subscription.status)
  const isPro = isConfiguredProSubscription(subscription.productId)
  const tier: UserTier = isActiveSubscriptionStatus(subscription.status) && isPro ? "pro" : "free"

  return {
    tier,
    subscriptionStatus: status,
    currentPeriodEnd: subscription.currentPeriodEnd?.toISOString(),
    polarCustomerId: subscription.customerId,
    polarSubscriptionId: subscription.id,
    polarPriceId: pickPriceId(subscription.prices),
  }
}

function pickBestActiveSubscription(
  subscriptions: CustomerStateSubscription[]
): CustomerStateSubscription | undefined {
  const active = subscriptions.filter(
    (sub) => (sub.status === "active" || sub.status === "trialing") && isConfiguredProSubscription(sub.productId)
  )
  if (active.length === 0) {
    return undefined
  }

  return active.sort((a, b) => {
    const aEnd = a.currentPeriodEnd?.getTime() ?? 0
    const bEnd = b.currentPeriodEnd?.getTime() ?? 0
    return bEnd - aEnd
  })[0]
}

export function snapshotFromCustomerState(state: CustomerState): BillingSnapshot {
  const activeSubscription = pickBestActiveSubscription(state.activeSubscriptions)

  if (!activeSubscription) {
    return {
      tier: "free",
      subscriptionStatus: "none",
      polarCustomerId: state.id,
    }
  }

  return {
    tier: "pro",
    subscriptionStatus: "active",
    currentPeriodEnd: activeSubscription.currentPeriodEnd?.toISOString(),
    polarCustomerId: state.id,
    polarSubscriptionId: activeSubscription.id,
  }
}

export async function getBillingSnapshotByExternalId(externalId: string): Promise<BillingSnapshot> {
  const polar = getPolarClient()

  try {
    const state = await polar.customers.getStateExternal({ externalId })
    return snapshotFromCustomerState(state)
  } catch (error) {
    if (error instanceof ResourceNotFound) {
      return {
        tier: "free",
        subscriptionStatus: "none",
      }
    }

    throw error
  }
}
