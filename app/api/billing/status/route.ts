import { NextResponse } from "next/server"
import { auth, clerkClient } from "@clerk/nextjs/server"
import { readBillingFromPublicMetadata, readTierFromPublicMetadata } from "@/lib/billing/clerk"
import { type BillingStatus } from "@/lib/billing/types"

export async function GET(): Promise<NextResponse> {
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
    const publicMetadata = user.publicMetadata

    const tier = readTierFromPublicMetadata(publicMetadata)
    const billing = readBillingFromPublicMetadata(publicMetadata)

    return NextResponse.json({
      tier,
      subscriptionStatus: (billing?.subscriptionStatus ?? "none") as BillingStatus,
      currentPeriodEnd: billing?.currentPeriodEnd,
    })
  } catch (error) {
    console.error("[billing/status] failed:", error)
    return NextResponse.json(
      { errorType: "UNKNOWN_ERROR", message: "Failed to load billing status." },
      { status: 500 }
    )
  }
}
