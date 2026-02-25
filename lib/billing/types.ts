export type UserTier = "free" | "pro"

export type BillingStatus = "active" | "canceled" | "past_due" | "incomplete" | "none"

export type ClerkBillingMetadata = {
  tier: UserTier
  polarCustomerId?: string
  polarSubscriptionId?: string
  polarPriceId?: string
  subscriptionStatus?: BillingStatus
  currentPeriodEnd?: string
  updatedAt?: string
}

export type ClerkPublicBillingMetadata = {
  tier: UserTier
  subscriptionStatus?: BillingStatus
  currentPeriodEnd?: string
  updatedAt?: string
}

export type BillingSnapshot = {
  tier: UserTier
  subscriptionStatus: BillingStatus
  currentPeriodEnd?: string
  polarCustomerId?: string
  polarSubscriptionId?: string
  polarPriceId?: string
}
