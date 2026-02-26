"use client"

import { useEffect, useState } from "react"
import { useUser } from "@clerk/nextjs"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { type BillingStatus, type UserTier } from "@/lib/billing/types"

type BillingStatusResponse = {
  tier: UserTier
  subscriptionStatus: BillingStatus
  currentPeriodEnd?: string
}

type ProProductResponse = {
  title: string
  benefits: string[]
  priceLabel: string
  intervalLabel: string
}

export function BillingHeaderControls() {
  const { isSignedIn } = useUser()
  const [isLoading, setIsLoading] = useState(false)
  const [tier, setTier] = useState<UserTier>("free")
  const [isUpgradeDialogOpen, setIsUpgradeDialogOpen] = useState(false)
  const [isProductLoading, setIsProductLoading] = useState(false)
  const [product, setProduct] = useState<ProProductResponse | null>(null)
  const [productError, setProductError] = useState<string | null>(null)

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

  useEffect(() => {
    if (!isSignedIn || !isUpgradeDialogOpen || product || isProductLoading) return

    const loadProduct = async () => {
      setIsProductLoading(true)
      setProductError(null)

      try {
        const response = await fetch("/api/billing/preview", { method: "GET" })
        const data = (await response.json()) as ProProductResponse & { message?: string }
        if (!response.ok) {
          throw new Error(data.message || "Failed to load product details.")
        }

        setProduct({
          title: data.title,
          benefits: data.benefits,
          priceLabel: data.priceLabel,
          intervalLabel: data.intervalLabel,
        })
      } catch (error) {
        console.error("[billing-header] failed to load product:", error)
        setProductError(error instanceof Error ? error.message : "Failed to load product details.")
      } finally {
        setIsProductLoading(false)
      }
    }

    void loadProduct()
  }, [isSignedIn, isUpgradeDialogOpen, product, isProductLoading])

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

      {!isSignedIn ? (
        <Button asChild size="sm" className="h-8 text-xs">
          <Link href="/sign-in">Sign in for Pro</Link>
        </Button>
      ) : tier === "pro" ? (
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
        <Button
          onClick={() => {
            setProduct(null)
            setProductError(null)
            setIsUpgradeDialogOpen(true)
          }}
          size="sm"
          disabled={isLoading}
          className="h-8 text-xs"
        >
          Upgrade to Pro
        </Button>
      )}

      <Dialog open={isUpgradeDialogOpen} onOpenChange={setIsUpgradeDialogOpen}>
        <DialogContent className="max-w-md border-border/70 bg-background/95 p-0 backdrop-blur-sm">
          <div className="space-y-6 p-6">
            <DialogHeader className="space-y-2 text-left">
              <DialogTitle className="text-xl tracking-tight">
                {product?.title ?? "Upgrade to Pro"}
              </DialogTitle>
              <DialogDescription>
                Unlock higher daily generation limits and priority access.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 rounded-xl border border-border/70 bg-muted/30 p-4">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Benefits
              </p>

              {isProductLoading ? (
                <p className="text-sm text-muted-foreground">Loading benefits...</p>
              ) : productError ? (
                <p className="text-sm text-destructive">{productError}</p>
              ) : (
                <ul className="space-y-2 text-sm text-foreground">
                  {(product?.benefits.length ? product.benefits : ["100 generations per day"]).map(
                    (benefit) => (
                      <li key={benefit} className="leading-relaxed">
                        {benefit}
                      </li>
                    )
                  )}
                </ul>
              )}
            </div>

            <div className="flex items-end justify-between gap-3 border-t border-border/70 pt-4">
              <div>
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Price</p>
                <p className="text-2xl font-semibold tracking-tight">
                  {isProductLoading ? "Loading..." : product?.priceLabel ?? "-"}
                  {product?.intervalLabel ? (
                    <span className="ml-1 text-sm font-normal text-muted-foreground">
                      {product.intervalLabel}
                    </span>
                  ) : null}
                </p>
              </div>

              <Button
                onClick={openCheckout}
                disabled={isLoading || isProductLoading}
                className="min-w-28"
              >
                {isLoading ? "Redirecting..." : "UPGRADE"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
