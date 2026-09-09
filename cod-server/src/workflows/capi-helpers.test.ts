import { describe, it, expect } from "vitest";
import {
  shouldTriggerCapiPurchase,
  shouldTriggerCapiConfirmed,
  resolveCapiDispatch,
  type CapiDispatchConfig,
} from "./capi-helpers";

function config(overrides: Partial<CapiDispatchConfig> = {}): CapiDispatchConfig {
  return {
    enabled: true,
    accessToken: "EAAG-token",
    conversionEvent: "Purchase",
    testMode: false,
    testEventCode: null,
    ...overrides,
  };
}

describe("shouldTriggerCapiConfirmed", () => {
  it("triggers on confirmed", () => {
    expect(shouldTriggerCapiConfirmed("confirmed")).toBe(true);
  });

  it("does not trigger on other statuses", () => {
    expect(shouldTriggerCapiConfirmed("pending")).toBe(false);
    expect(shouldTriggerCapiConfirmed("delivered")).toBe(false);
    expect(shouldTriggerCapiConfirmed("out_for_delivery")).toBe(false);
    expect(shouldTriggerCapiConfirmed("cancelled")).toBe(false);
  });
});

describe("shouldTriggerCapiPurchase", () => {
  it("triggers on delivered", () => {
    expect(shouldTriggerCapiPurchase("delivered", 16)).toBe(true);
  });

  it("triggers early (out_for_delivery) only for long-haul southern wilayas", () => {
    expect(shouldTriggerCapiPurchase("out_for_delivery", 1)).toBe(true);
    expect(shouldTriggerCapiPurchase("out_for_delivery", 37)).toBe(true);
    expect(shouldTriggerCapiPurchase("out_for_delivery", 16)).toBe(false);
    expect(shouldTriggerCapiPurchase("out_for_delivery", null)).toBe(false);
  });

  it("never triggers on other statuses", () => {
    expect(shouldTriggerCapiPurchase("dispatched", 1)).toBe(false);
    expect(shouldTriggerCapiPurchase("returned", 16)).toBe(false);
    expect(shouldTriggerCapiPurchase("confirmed", 1)).toBe(false);
  });
});

describe("resolveCapiDispatch", () => {
  it("sends when tracking is enabled, token present, and event matches the merchant's choice", () => {
    expect(resolveCapiDispatch(config(), "Purchase")).toEqual({ send: true, testEventCode: null });
  });

  it("skips when tracking is disabled or no row exists", () => {
    expect(resolveCapiDispatch(config({ enabled: false }), "Purchase")).toMatchObject({
      send: false,
      reason: "tracking-disabled",
    });
    expect(resolveCapiDispatch(undefined, "Purchase")).toMatchObject({ send: false, reason: "tracking-disabled" });
  });

  it("skips with an actionable reason when the token is missing", () => {
    expect(resolveCapiDispatch(config({ accessToken: "" }), "Purchase")).toEqual({
      send: false,
      reason: "no-access-token",
      message: "No CAPI access token — configure it in Settings → Tracking",
    });
  });

  it("skips when the merchant chose a different conversion event", () => {
    expect(resolveCapiDispatch(config({ conversionEvent: "Lead" }), "Purchase")).toEqual({
      send: false,
      reason: "conversion-event-mismatch",
      message: "Conversion event is set to Lead — Purchase not sent",
    });
    expect(resolveCapiDispatch(config({ conversionEvent: "Purchase" }), "Lead")).toMatchObject({
      send: false,
      reason: "conversion-event-mismatch",
    });
  });

  it("attaches test_event_code only when test mode is on", () => {
    expect(resolveCapiDispatch(config({ testMode: true, testEventCode: "TEST123" }), "Purchase")).toEqual({
      send: true,
      testEventCode: "TEST123",
    });
    expect(resolveCapiDispatch(config({ testMode: false, testEventCode: "TEST123" }), "Purchase")).toEqual({
      send: true,
      testEventCode: null,
    });
    expect(resolveCapiDispatch(config({ testMode: true, testEventCode: null }), "Purchase")).toEqual({
      send: true,
      testEventCode: null,
    });
  });

  describe("stage-aware dispatch", () => {
    it("handles Purchase_Confirmed mode at confirmed stage", () => {
      const cfg = config({ conversionEvent: "Purchase_Confirmed" });
      expect(resolveCapiDispatch(cfg, "Purchase", "confirmed")).toEqual({
        send: true,
        testEventCode: null,
      });
      expect(resolveCapiDispatch(cfg, "Purchase", "checkout")).toMatchObject({
        send: false,
        reason: "conversion-event-mismatch",
      });
    });

    it("handles Purchase_Delivered mode at delivered stage", () => {
      const cfg = config({ conversionEvent: "Purchase_Delivered" });
      expect(resolveCapiDispatch(cfg, "Purchase", "delivered")).toEqual({
        send: true,
        testEventCode: null,
      });
      expect(resolveCapiDispatch(cfg, "Purchase", "checkout")).toMatchObject({
        send: false,
        reason: "conversion-event-mismatch",
      });
    });

    it("handles Lead mode at checkout stage", () => {
      const cfg = config({ conversionEvent: "Lead" });
      expect(resolveCapiDispatch(cfg, "Lead", "checkout")).toEqual({
        send: true,
        testEventCode: null,
      });
      expect(resolveCapiDispatch(cfg, "Purchase", "checkout")).toMatchObject({
        send: false,
        reason: "conversion-event-mismatch",
      });
    });
  });
});
