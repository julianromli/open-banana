import { snapshotFromCustomerState, snapshotFromSubscription } from "@/lib/billing/polar"

describe("billing snapshot mapping", () => {
  const originalProProductId = process.env.POLAR_PRO_MONTHLY_PRODUCT_ID
  const originalLegacyProProductId = process.env.POLAR_PRO_MONTHLY_PRICE_ID

  beforeEach(() => {
    jest.restoreAllMocks()
    process.env.POLAR_PRO_MONTHLY_PRODUCT_ID = "prod_pro"
    delete process.env.POLAR_PRO_MONTHLY_PRICE_ID
  })

  afterAll(() => {
    if (originalProProductId) {
      process.env.POLAR_PRO_MONTHLY_PRODUCT_ID = originalProProductId
    } else {
      delete process.env.POLAR_PRO_MONTHLY_PRODUCT_ID
    }

    if (originalLegacyProProductId) {
      process.env.POLAR_PRO_MONTHLY_PRICE_ID = originalLegacyProProductId
    } else {
      delete process.env.POLAR_PRO_MONTHLY_PRICE_ID
    }
  })

  test("maps active subscription to pro snapshot", () => {
    const currentPeriodEnd = new Date("2026-03-01T00:00:00.000Z")

    const snapshot = snapshotFromSubscription({
      id: "sub_1",
      status: "active",
      currentPeriodEnd,
      customerId: "cus_1",
      productId: "prod_pro",
      prices: [{ id: "price_1" }],
    } as any)

    expect(snapshot.tier).toBe("pro")
    expect(snapshot.subscriptionStatus).toBe("active")
    expect(snapshot.currentPeriodEnd).toBe(currentPeriodEnd.toISOString())
    expect(snapshot.polarSubscriptionId).toBe("sub_1")
    expect(snapshot.polarCustomerId).toBe("cus_1")
    expect(snapshot.polarPriceId).toBe("price_1")
  })

  test("maps canceled subscription to free snapshot", () => {
    const snapshot = snapshotFromSubscription({
      id: "sub_1",
      status: "canceled",
      currentPeriodEnd: null,
      customerId: "cus_1",
      productId: "prod_pro",
      prices: [],
    } as any)

    expect(snapshot.tier).toBe("free")
    expect(snapshot.subscriptionStatus).toBe("canceled")
  })

  test("picks active subscription from customer state", () => {
    const snapshot = snapshotFromCustomerState({
      id: "cus_1",
      activeSubscriptions: [
        {
          id: "sub_old",
          status: "trialing",
          productId: "prod_pro",
          currentPeriodEnd: new Date("2026-03-01T00:00:00.000Z"),
        },
        {
          id: "sub_new",
          status: "active",
          productId: "prod_pro",
          currentPeriodEnd: new Date("2026-03-15T00:00:00.000Z"),
        },
      ],
    } as any)

    expect(snapshot.tier).toBe("pro")
    expect(snapshot.subscriptionStatus).toBe("active")
    expect(snapshot.polarSubscriptionId).toBe("sub_new")
  })

  test("maps empty customer state to free/none", () => {
    const snapshot = snapshotFromCustomerState({
      id: "cus_1",
      activeSubscriptions: [],
    } as any)

    expect(snapshot.tier).toBe("free")
    expect(snapshot.subscriptionStatus).toBe("none")
  })

  test("ignores active subscription on non-pro product", () => {
    const snapshot = snapshotFromCustomerState({
      id: "cus_1",
      activeSubscriptions: [
        {
          id: "sub_non_pro",
          status: "active",
          productId: "prod_other",
          currentPeriodEnd: new Date("2026-03-15T00:00:00.000Z"),
        },
      ],
    } as any)

    expect(snapshot.tier).toBe("free")
    expect(snapshot.subscriptionStatus).toBe("none")
    expect(snapshot.polarSubscriptionId).toBeUndefined()
  })

  test("defaults active subscription to free when pro product env is missing", () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined)
    delete process.env.POLAR_PRO_MONTHLY_PRODUCT_ID
    delete process.env.POLAR_PRO_MONTHLY_PRICE_ID

    const snapshot = snapshotFromSubscription({
      id: "sub_1",
      status: "active",
      currentPeriodEnd: new Date("2026-03-01T00:00:00.000Z"),
      customerId: "cus_1",
      productId: "prod_pro",
      prices: [{ id: "price_1" }],
    } as any)

    expect(snapshot.tier).toBe("free")
    expect(snapshot.subscriptionStatus).toBe("active")
    expect(warnSpy).toHaveBeenCalledTimes(1)
  })

  test("warns only once when pro product env is missing", async () => {
    jest.resetModules()
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined)
    delete process.env.POLAR_PRO_MONTHLY_PRODUCT_ID
    delete process.env.POLAR_PRO_MONTHLY_PRICE_ID

    const { snapshotFromSubscription: snapshotFromSubscriptionReloaded } = await import("@/lib/billing/polar")

    snapshotFromSubscriptionReloaded({
      id: "sub_1",
      status: "active",
      currentPeriodEnd: new Date("2026-03-01T00:00:00.000Z"),
      customerId: "cus_1",
      productId: "prod_pro",
      prices: [{ id: "price_1" }],
    } as any)
    snapshotFromSubscriptionReloaded({
      id: "sub_2",
      status: "trialing",
      currentPeriodEnd: new Date("2026-03-02T00:00:00.000Z"),
      customerId: "cus_2",
      productId: "prod_pro",
      prices: [{ id: "price_2" }],
    } as any)

    expect(warnSpy).toHaveBeenCalledTimes(1)
  })
})
