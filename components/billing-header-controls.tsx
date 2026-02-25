"use client"

import { useEffect, useState } from "react"
import { useUser } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { type BillingStatus, type UserTier } from "@/lib/billing/types"

type BillingStatusResponse = {
  tier: UserTier
  subscriptionStatus: BillingStatus
  currentPeriodEnd?: string
}

export function BillingHeaderControls() {
  const { isSignedIn } = useUser()
  const [isLoading, setIsLoading] = useState(false)
  const [tier, setTier] = useState<UserTier>("free")

  useEffect(() => {
    if (!isSignedIn) return

    const loadStatus = async () => {
      try {
        const response = await fetch("/api/billing/status", { method: "GET" })
        if (!response.ok) return
        const data = (await response.json()) as BillingStatusResponse
        setTier(data.tier)
      } catch (error) {
        console.error("[billing-header] failed to load billing status:", error)
      }
    }

    loadStatus()
  }, [isSignedIn])

  if (!isSignedIn) {
    return null
  }

  const openCheckout = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/billing/checkout", { method: "POST" })
      const data = (await response.json()) as { checkoutUrl?: string; message?: string }
      if (!response.ok || !data.checkoutUrl) {
        throw new Error(data.message || "Failed to start checkout.")
      }

      window.location.href = data.checkoutUrl
    } catch (error) {
      console.error("[billing-header] checkout failed:", error)
      alert(error instanceof Error ? error.message : "Failed to start checkout.")
    } finally {
      setIsLoading(false)
    }
  }

  const openPortal = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/billing/portal", { method: "GET" })
      const data = (await response.json()) as { portalUrl?: string; message?: string }
      if (!response.ok || !data.portalUrl) {
        throw new Error(data.message || "Failed to open billing portal.")
      }

      window.location.href = data.portalUrl
    } catch (error) {
      console.error("[billing-header] portal failed:", error)
      alert(error instanceof Error ? error.message : "Failed to open billing portal.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium",
          tier === "pro"
            ? "border-primary/60 bg-primary/10 text-primary"
            : "border-border bg-muted/50 text-muted-foreground"
        )}
      >
        {tier === "pro" ? "Pro" : "Free"}
      </span>

      {tier === "pro" ? (
        <Button
          onClick={openPortal}
          variant="outline"
          size="sm"
          disabled={isLoading}
          className="h-8 bg-transparent text-xs"
        >
          Manage Billing
        </Button>
      ) : (
        <Button onClick={openCheckout} size="sm" disabled={isLoading} className="h-8 text-xs">
          Upgrade to Pro
        </Button>
      )}
    </div>
  )
}
