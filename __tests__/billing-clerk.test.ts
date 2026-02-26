import { readBillingFromPublicMetadata, updateUserBillingMetadata } from "@/lib/billing/clerk"
import { clerkClient } from "@clerk/nextjs/server"

const getUserMock = jest.fn()
const updateUserMetadataMock = jest.fn()

jest.mock("@clerk/nextjs/server", () => ({
  clerkClient: jest.fn(),
}))

describe("billing clerk metadata helpers", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    const clerkClientMock = clerkClient as jest.Mock
    clerkClientMock.mockResolvedValue({
      users: {
        getUser: getUserMock,
        updateUserMetadata: updateUserMetadataMock,
      },
    })
  })

  test("ignores invalid subscriptionStatus from public metadata", () => {
    const billing = readBillingFromPublicMetadata({
      billing: {
        tier: "pro",
        subscriptionStatus: "evil_status",
      },
    })

    expect(billing?.tier).toBe("pro")
    expect(billing?.subscriptionStatus).toBeUndefined()
  })

  test("moves polar ids to private metadata and removes them from public billing", async () => {
    getUserMock.mockResolvedValue({
      publicMetadata: {
        tier: "free",
        somePublicKey: "keep-me",
        billing: {
          tier: "pro",
          subscriptionStatus: "active",
          polarCustomerId: "old_cus",
          polarSubscriptionId: "old_sub",
          polarPriceId: "old_price",
          keepPublicBillingKey: "keep-this",
        },
      },
      privateMetadata: {
        somePrivateKey: "keep-private",
        billing: {
          existingPrivateBillingKey: "keep-private-billing",
        },
      },
    })
    updateUserMetadataMock.mockResolvedValue(undefined)

    await updateUserBillingMetadata("user_123", {
      tier: "pro",
      subscriptionStatus: "active",
      currentPeriodEnd: "2026-03-01T00:00:00.000Z",
      polarCustomerId: "cus_123",
      polarSubscriptionId: "sub_123",
      polarPriceId: "price_123",
    })

    expect(updateUserMetadataMock).toHaveBeenCalledTimes(1)
    const [userId, payload] = updateUserMetadataMock.mock.calls[0]

    expect(userId).toBe("user_123")
    expect(payload.publicMetadata.tier).toBe("pro")
    expect(payload.publicMetadata.somePublicKey).toBe("keep-me")
    expect(payload.publicMetadata.billing.tier).toBe("pro")
    expect(payload.publicMetadata.billing.subscriptionStatus).toBe("active")
    expect(payload.publicMetadata.billing.currentPeriodEnd).toBe("2026-03-01T00:00:00.000Z")
    expect(payload.publicMetadata.billing.updatedAt).toEqual(expect.any(String))
    expect(payload.publicMetadata.billing.polarCustomerId).toBeUndefined()
    expect(payload.publicMetadata.billing.polarSubscriptionId).toBeUndefined()
    expect(payload.publicMetadata.billing.polarPriceId).toBeUndefined()

    expect(payload.privateMetadata.somePrivateKey).toBe("keep-private")
    expect(payload.privateMetadata.billing.existingPrivateBillingKey).toBe("keep-private-billing")
    expect(payload.privateMetadata.billing.polarCustomerId).toBe("cus_123")
    expect(payload.privateMetadata.billing.polarSubscriptionId).toBe("sub_123")
    expect(payload.privateMetadata.billing.polarPriceId).toBe("price_123")
  })
})
