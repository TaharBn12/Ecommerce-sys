import { describe, it, expect } from "vitest";
import {
  CodCapiParamsSchema,
  shouldTriggerCapiPurchase,
  shouldTriggerCapiConfirmed,
  getCapiWorkflowId,
} from "./capi";

describe("CodCapiWorkflow — Runtime Payload Validation (Zod)", () => {
  it("validates a standard purchase payload with default stage", () => {
    const payload = {
      orderId: "ord_123",
      eventName: "Purchase",
      triggeredAt: 1716000000,
      triggerStatus: "delivered",
    };

    const parsed = CodCapiParamsSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.stage).toBe("delivered");
      expect(parsed.data.eventName).toBe("Purchase");
    }
  });

  it("validates an explicit confirmed stage payload", () => {
    const payload = {
      orderId: "ord_456",
      eventName: "Purchase",
      stage: "confirmed",
      triggeredAt: 1716000000,
      triggerStatus: "confirmed",
      eventSourceUrl: "https://example.com/thank-you",
    };

    const parsed = CodCapiParamsSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.stage).toBe("confirmed");
      expect(parsed.data.eventSourceUrl).toBe("https://example.com/thank-you");
    }
  });

  it("validates a checkout lead payload", () => {
    const payload = {
      orderId: "ord_789",
      eventName: "Lead",
      stage: "checkout",
      triggeredAt: 1716000000,
      triggerStatus: "order_created",
    };

    const parsed = CodCapiParamsSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
  });

  it("rejects empty orderId", () => {
    const payload = {
      orderId: "",
      eventName: "Purchase",
      triggeredAt: 1716000000,
      triggerStatus: "delivered",
    };

    const parsed = CodCapiParamsSchema.safeParse(payload);
    expect(parsed.success).toBe(false);
  });

  it("rejects unmapped event names", () => {
    const payload = {
      orderId: "ord_123",
      eventName: "InitiateCheckout",
      triggeredAt: 1716000000,
      triggerStatus: "checkout",
    };

    const parsed = CodCapiParamsSchema.safeParse(payload);
    expect(parsed.success).toBe(false);
  });

  it("rejects negative or invalid timestamps", () => {
    const payload = {
      orderId: "ord_123",
      eventName: "Purchase",
      triggeredAt: -1,
      triggerStatus: "delivered",
    };

    const parsed = CodCapiParamsSchema.safeParse(payload);
    expect(parsed.success).toBe(false);
  });

  it("rejects malformed eventSourceUrl", () => {
    const payload = {
      orderId: "ord_123",
      eventName: "Purchase",
      triggeredAt: 1716000000,
      triggerStatus: "delivered",
      eventSourceUrl: "not-a-valid-url",
    };

    const parsed = CodCapiParamsSchema.safeParse(payload);
    expect(parsed.success).toBe(false);
  });
});

describe("CodCapiWorkflow — Module Re-exports", () => {
  it("re-exports shouldTriggerCapiPurchase", () => {
    expect(typeof shouldTriggerCapiPurchase).toBe("function");
    expect(shouldTriggerCapiPurchase("delivered", 16)).toBe(true);
  });

  it("re-exports shouldTriggerCapiConfirmed", () => {
    expect(typeof shouldTriggerCapiConfirmed).toBe("function");
    expect(shouldTriggerCapiConfirmed("confirmed")).toBe(true);
  });

  it("re-exports getCapiWorkflowId", () => {
    expect(typeof getCapiWorkflowId).toBe("function");
    expect(getCapiWorkflowId("ord_1", "delivered", "Purchase")).toBe("capi-ord_1-delivered-Purchase");
  });
});
