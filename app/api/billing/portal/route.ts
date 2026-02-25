import { NextResponse } from "next/server"
import { auth, clerkClient } from "@clerk/nextjs/server"
import { ResourceNotFound } from "@polar-sh/sdk/models/errors/resourcenotfound"
import { extractPrimaryEmail } from "@/lib/billing/clerk"
import { getPolarClient, getRequiredEnv } from "@/lib/billing/polar"

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

    try {
      await polar.customers.getExternal({ externalId: userId })
    } catch (error) {
      if (!(error instanceof ResourceNotFound)) {
        throw error
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

      await polar.customers.create({
        externalId: userId,
        email,
        name: user.fullName ?? undefined,
      })
    }

    const returnUrl = getRequiredEnv("POLAR_RETURN_URL")

    const session = await polar.customerSessions.create({
      externalCustomerId: userId,
      returnUrl,
    })

    return NextResponse.json({ portalUrl: session.customerPortalUrl })
  } catch (error) {
    console.error("[billing/portal] failed:", error)
    return NextResponse.json(
      { errorType: "UNKNOWN_ERROR", message: "Failed to create billing portal session." },
      { status: 500 }
    )
  }
}
