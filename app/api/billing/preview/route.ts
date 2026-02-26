import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getPolarClient, getRequiredProProductId } from "@/lib/billing/polar"

type ProductPriceLike = {
  amountType?: unknown
  priceAmount?: unknown
  priceCurrency?: unknown
  isArchived?: unknown
}

type ProductBenefitLike = {
  description?: unknown
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined
}

function toIntervalLabel(interval: unknown, intervalCount: unknown): string {
  const unit = asString(interval)
  const count = asNumber(intervalCount)

  if (!unit) {
    return ""
  }

  if (!count || count <= 1) {
    return `/${unit}`
  }

  return `/${count} ${unit}s`
}

function getPriceData(prices: unknown): { amount: number; currency: string } | undefined {
  if (!Array.isArray(prices)) {
    return undefined
  }

  for (const entry of prices) {
    const price = entry as ProductPriceLike
    if (price.isArchived === true) {
      continue
    }

    if (price.amountType !== "fixed") {
      continue
    }

    const amount = asNumber(price.priceAmount)
    const currency = asString(price.priceCurrency)
    if (amount === undefined || !currency) {
      continue
    }

    return { amount, currency }
  }

  return undefined
}

function getBenefits(benefits: unknown): string[] {
  if (!Array.isArray(benefits)) {
    return []
  }

  return benefits
    .map((entry) => asString((entry as ProductBenefitLike).description)?.trim())
    .filter((entry): entry is string => Boolean(entry))
}

export async function GET(): Promise<NextResponse> {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { errorType: "AUTH_REQUIRED", message: "Please sign in to continue." },
        { status: 401 }
      )
    }

    const polar = getPolarClient()
    const productId = getRequiredProProductId()
    const product = await polar.products.get({ id: productId })
    const priceData = getPriceData(product.prices)

    let priceLabel = "Unavailable"
    if (priceData) {
      priceLabel = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: priceData.currency.toUpperCase(),
        maximumFractionDigits: 2,
      }).format(priceData.amount / 100)
    }

    return NextResponse.json({
      title: product.name,
      benefits: getBenefits(product.benefits),
      priceLabel,
      intervalLabel: toIntervalLabel(product.recurringInterval, product.recurringIntervalCount),
    })
  } catch (error) {
    console.error("[billing/preview] failed:", error)
    return NextResponse.json(
      { errorType: "UNKNOWN_ERROR", message: "Failed to load product details." },
      { status: 500 }
    )
  }
}

