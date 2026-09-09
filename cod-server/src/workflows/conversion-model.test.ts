import { describe, it, expect } from "vitest";
import {
  resolveConversionForStage,
  getCapiWorkflowId,
  type ConversionMode,
  type ConversionStage,
} from "./conversion-model";

describe("Conversion Model — resolveConversionForStage", () => {
  describe("Mode: Purchase (Instant Checkout)", () => {
    const mode: ConversionMode = "Purchase";

    it("fires Purchase at checkout", () => {
      const res = resolveConversionForStage(mode, "checkout");
      expect(res).toEqual({
        shouldFire: true,
        eventName: "Purchase",
        stage: "checkout",
      });
    });

    it("skips at confirmed stage", () => {
      const res = resolveConversionForStage(mode, "confirmed");
      expect(res.shouldFire).toBe(false);
      expect(res.reason).toContain("Purchase");
    });

    it("skips at delivered stage", () => {
      const res = resolveConversionForStage(mode, "delivered");
      expect(res.shouldFire).toBe(false);
      expect(res.reason).toContain("Purchase");
    });
  });

  describe("Mode: Purchase_Confirmed (Phone Confirmation)", () => {
    const mode: ConversionMode = "Purchase_Confirmed";

    it("skips at checkout stage", () => {
      const res = resolveConversionForStage(mode, "checkout");
      expect(res.shouldFire).toBe(false);
      expect(res.reason).toContain("Purchase_Confirmed");
    });

    it("fires Purchase at confirmed stage", () => {
      const res = resolveConversionForStage(mode, "confirmed");
      expect(res).toEqual({
        shouldFire: true,
        eventName: "Purchase",
        stage: "confirmed",
      });
    });

    it("skips at delivered stage", () => {
      const res = resolveConversionForStage(mode, "delivered");
      expect(res.shouldFire).toBe(false);
      expect(res.reason).toContain("Purchase_Confirmed");
    });
  });

  describe("Mode: Purchase_Delivered (Carrier Delivery)", () => {
    const mode: ConversionMode = "Purchase_Delivered";

    it("skips at checkout stage", () => {
      const res = resolveConversionForStage(mode, "checkout");
      expect(res.shouldFire).toBe(false);
      expect(res.reason).toContain("Purchase_Delivered");
    });

    it("skips at confirmed stage", () => {
      const res = resolveConversionForStage(mode, "confirmed");
      expect(res.shouldFire).toBe(false);
      expect(res.reason).toContain("Purchase_Delivered");
    });

    it("fires Purchase at delivered stage", () => {
      const res = resolveConversionForStage(mode, "delivered");
      expect(res).toEqual({
        shouldFire: true,
        eventName: "Purchase",
        stage: "delivered",
      });
    });
  });

  describe("Mode: Lead (Checkout Lead)", () => {
    const mode: ConversionMode = "Lead";

    it("fires Lead at checkout", () => {
      const res = resolveConversionForStage(mode, "checkout");
      expect(res).toEqual({
        shouldFire: true,
        eventName: "Lead",
        stage: "checkout",
      });
    });

    it("skips at confirmed stage", () => {
      const res = resolveConversionForStage(mode, "confirmed");
      expect(res.shouldFire).toBe(false);
      expect(res.reason).toContain("Lead");
    });

    it("skips at delivered stage", () => {
      const res = resolveConversionForStage(mode, "delivered");
      expect(res.shouldFire).toBe(false);
      expect(res.reason).toContain("Lead");
    });
  });

  describe("Null / Undefined mode defaults to Purchase", () => {
    it("defaults to Purchase at checkout", () => {
      expect(resolveConversionForStage(null, "checkout")).toEqual({
        shouldFire: true,
        eventName: "Purchase",
        stage: "checkout",
      });
      expect(resolveConversionForStage(undefined, "checkout")).toEqual({
        shouldFire: true,
        eventName: "Purchase",
        stage: "checkout",
      });
    });
  });
});

describe("Conversion Model — getCapiWorkflowId", () => {
  it("generates deterministic workflow IDs per business event", () => {
    expect(getCapiWorkflowId("ord-123", "checkout", "Purchase")).toBe(
      "capi-ord-123-checkout-Purchase"
    );
    expect(getCapiWorkflowId("ord-123", "checkout", "Lead")).toBe(
      "capi-ord-123-checkout-Lead"
    );
    expect(getCapiWorkflowId("ord-123", "confirmed", "Purchase")).toBe(
      "capi-ord-123-confirmed-Purchase"
    );
    expect(getCapiWorkflowId("ord-123", "delivered", "Purchase")).toBe(
      "capi-ord-123-delivered-Purchase"
    );
  });
});
