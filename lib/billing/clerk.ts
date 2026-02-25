import { clerkClient } from "@clerk/nextjs/server"
import { type BillingSnapshot, type ClerkBillingMetadata, type UserTier, type BillingStatus } from "@/lib/billing/types"

type ClerkPublicMetadata = Record<string, unknown>

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return undefined
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined
}

export function readTierFromPublicMetadata(metadata: unknown): UserTier {
  const record = asRecord(metadata)
  return record?.tier === "pro" ? "pro" : "free"
}

export function readBillingFromPublicMetadata(metadata: unknown): ClerkBillingMetadata | undefined {
  const record = asRecord(metadata)
  const billing = asRecord(record?.billing)

  if (!billing) {
    return undefined
  }

  const subscriptionStatus = asString(billing.subscriptionStatus) as BillingStatus | undefined

  return {
    tier: billing.tier === "pro" ? "pro" : "free",
    polarCustomerId: asString(billing.polarCustomerId),
    polarSubscriptionId: asString(billing.polarSubscriptionId),
    polarPriceId: asString(billing.polarPriceId),
    subscriptionStatus,
    currentPeriodEnd: asString(billing.currentPeriodEnd),
    updatedAt: asString(billing.updatedAt),
  }
}

type ClerkUserLike = {
  primaryEmailAddressId: string | null
  emailAddresses: Array<{ id: string; emailAddress: string }>
}

export function extractPrimaryEmail(user: ClerkUserLike): string | undefined {
  const primaryEmailId = user.primaryEmailAddressId
  if (!primaryEmailId) {
    return undefined
  }

  return user.emailAddresses.find((email) => email.id === primaryEmailId)?.emailAddress
}

export async function updateUserBillingMetadata(userId: string, snapshot: BillingSnapshot): Promise<void> {
  const client = await clerkClient()
  const currentUser = await client.users.getUser(userId)

  const current = (currentUser.publicMetadata ?? {}) as ClerkPublicMetadata
  const nextBilling: ClerkBillingMetadata = {
    tier: snapshot.tier,
    subscriptionStatus: snapshot.subscriptionStatus,
    currentPeriodEnd: snapshot.currentPeriodEnd,
    polarCustomerId: snapshot.polarCustomerId,
    polarSubscriptionId: snapshot.polarSubscriptionId,
    polarPriceId: snapshot.polarPriceId,
    updatedAt: new Date().toISOString(),
  }

  await client.users.updateUserMetadata(userId, {
    publicMetadata: {
      ...current,
      tier: snapshot.tier,
      billing: nextBilling,
    },
  })
}
