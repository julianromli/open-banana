import { NextResponse, type NextRequest } from "next/server"
import { validateEvent, WebhookVerificationError } from "@polar-sh/sdk/webhooks"
import { Redis } from "@upstash/redis"
import { getBillingSnapshotByExternalId } from "@/lib/billing/polar"
import { updateUserBillingMetadata } from "@/lib/billing/clerk"
import { extractExternalCustomerIdFromWebhookEvent, isSupportedBillingEvent } from "@/lib/billing/webhook"
import { resolveRedisConfig } from "@/lib/redis-config"

let redis: Redis | null = null

function getRedis(): Redis | null {
  const config = resolveRedisConfig()
  if (!config) {
    return null
  }
  if (!redis) {
    redis = new Redis({ url: config.url, token: config.token })
  }
  return redis
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let db: Redis | null = null
  let idempotencyKey: string | undefined

  try {
    const body = await request.text()
    const secret = process.env.POLAR_WEBHOOK_SECRET

    if (!secret) {
      return NextResponse.json({ received: false, error: "POLAR_WEBHOOK_SECRET is not configured" }, { status: 500 })
    }

    const headers = {
      "webhook-id": request.headers.get("webhook-id") ?? "",
      "webhook-timestamp": request.headers.get("webhook-timestamp") ?? "",
      "webhook-signature": request.headers.get("webhook-signature") ?? "",
    }

    let payload: unknown
    try {
      payload = validateEvent(body, headers, secret)
    } catch (error) {
      if (error instanceof WebhookVerificationError) {
        return NextResponse.json({ received: false }, { status: 403 })
      }
      throw error
    }

    const webhookId = headers["webhook-id"]
    db = getRedis()
    idempotencyKey = webhookId ? `polar:webhook:event:${webhookId}` : undefined

    if (db && idempotencyKey) {
      const lockResult = await db.set(idempotencyKey, "processing", { nx: true, ex: 5 * 60 })
      if (lockResult === null) {
        return NextResponse.json({ received: true, duplicate: true })
      }
    }

    if (isSupportedBillingEvent(payload)) {
      const externalId = extractExternalCustomerIdFromWebhookEvent(payload)
      if (externalId) {
        const snapshot = await getBillingSnapshotByExternalId(externalId)
        await updateUserBillingMetadata(externalId, snapshot)
      }
    }

    if (db && idempotencyKey) {
      await db.set(idempotencyKey, "done", { ex: 7 * 24 * 60 * 60 })
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    if (db && idempotencyKey) {
      await db.del(idempotencyKey).catch(() => undefined)
    }
    console.error("[webhook/polar] failed:", error)
    return NextResponse.json({ received: false }, { status: 500 })
  }
}
