import { NextResponse } from "next/server"
import { auth, clerkClient } from "@clerk/nextjs/server"
import { extractPrimaryEmail } from "@/lib/billing/clerk"
import { getPolarClient, getRequiredEnv, getRequiredProProductId } from "@/lib/billing/polar"

export async function POST(): Promise<NextResponse> {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { errorType: "AUTH_REQUIRED", message: "Please sign in to continue." },
        { status: 401 }
      )
    }

    const client = await clerkClient()
    const user = await client.users.getUser(userId)
    const email = extractPrimaryEmail(user)

    if (!email) {
      return NextResponse.json(
        { errorType: "INVALID_REQUEST", message: "No primary email found for this account." },
        { status: 400 }
      )
    }

    const polar = getPolarClient()
    const proProductId = getRequiredProProductId()
    const successUrl = getRequiredEnv("POLAR_SUCCESS_URL")
    const returnUrl = getRequiredEnv("POLAR_RETURN_URL")

    const checkout = await polar.checkouts.create({
      products: [proProductId],
      successUrl,
      returnUrl,
      customerEmail: email,
      externalCustomerId: userId,
      metadata: {
        clerkUserId: userId,
        tier: "pro",
      },
    })

    return NextResponse.json({ checkoutUrl: checkout.url })
  } catch (error) {
    console.error("[billing/checkout] failed:", error)
    return NextResponse.json(
      { errorType: "UNKNOWN_ERROR", message: "Failed to create checkout session." },
      { status: 500 }
    )
  }
}
