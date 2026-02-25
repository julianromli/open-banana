import { clerkClient } from "@clerk/nextjs/server"
import {
  type BillingSnapshot,
  type ClerkPublicBillingMetadata,
  type UserTier,
  type BillingStatus,
} from "@/lib/billing/types"

type ClerkPublicMetadata = Record<string, unknown>
type ClerkPrivateMetadata = Record<string, unknown>
type ClerkBillingRecord = Record<string, unknown>

const BILLING_STATUS_SET = new Set<string>(["active", "canceled", "past_due", "incomplete", "none"])

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return undefined
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined
}

function isBillingStatus(value: unknown): value is BillingStatus {
  return typeof value === "string" && BILLING_STATUS_SET.has(value)
}

export function readTierFromPublicMetadata(metadata: unknown): UserTier {
  const record = asRecord(metadata)
  return record?.tier === "pro" ? "pro" : "free"
}

export function readBillingFromPublicMetadata(metadata: unknown): ClerkPublicBillingMetadata | undefined {
  const record = asRecord(metadata)
  const billing = asRecord(record?.billing)

  if (!billing) {
    return undefined
  }

  const subscriptionStatus = isBillingStatus(billing.subscriptionStatus) ? billing.subscriptionStatus : undefined

  return {
    tier: billing.tier === "pro" ? "pro" : "free",
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
  const currentPrivate = (currentUser.privateMetadata ?? {}) as ClerkPrivateMetadata
  const currentBilling = asRecord(currentPrivate.billing) ?? ({} as ClerkBillingRecord)

  const nextPublicBilling: ClerkPublicBillingMetadata = {
    tier: snapshot.tier,
    subscriptionStatus: snapshot.subscriptionStatus,
    currentPeriodEnd: snapshot.currentPeriodEnd,
    updatedAt: new Date().toISOString(),
  }
  const nextPrivateBilling = {
    ...currentBilling,
    polarCustomerId: snapshot.polarCustomerId,
    polarSubscriptionId: snapshot.polarSubscriptionId,
    polarPriceId: snapshot.polarPriceId,
  }

  await client.users.updateUserMetadata(userId, {
    publicMetadata: {
      ...current,
      tier: snapshot.tier,
      billing: nextPublicBilling,
    },
    privateMetadata: {
      ...currentPrivate,
      billing: nextPrivateBilling,
    },
  })
}
