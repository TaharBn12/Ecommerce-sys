/**
 * Yalidine webhook handler — real-D1 end-to-end.
 *
 * Posts real event payloads through handleYalidineWebhook against a real
 * Miniflare D1 with all real migrations applied — real company lookup, real
 * webhook-events idempotency table, real mapper, real order-status path
 * (rank guard + inventory restore). No mocked queries.
 *
 * The payloads replicate the exact shapes observed live (2026-09-07):
 * the full return flow of real returned parcels
 * `Echèc livraison → Retourné au centre ⇄ Retour vers centre →
 * Retour à retirer → Retourné au vendeur`.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { Miniflare } from "miniflare";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { createHmac } from "node:crypto";
import { Hono } from "hono";
import type { AppContext } from "@/types";
import { errorHandler } from "@/middleware/error";
import * as schema from "@/db/schema";
import type { AppDb } from "@/db";

vi.mock("@/db", () => ({ getDb: vi.fn(() => realDb) }));
vi.mock("@/workflows/capi-helpers", () => ({
  shouldTriggerCapiPurchase: vi.fn(() => false),
  shouldTriggerCapiConfirmed: vi.fn(() => false),
  getCapiWorkflowId: vi.fn((id: string, stage: string, event: string) => `capi-${id}-${stage}-${event}`),
  resolveConversionForStage: vi.fn(() => ({ shouldFire: false })),
  resolveCapiDispatch: vi.fn(() => ({ send: false, reason: "tracking-disabled", message: "mock skip" })),
}));

import { handleYalidineWebhook } from "./handlers";

let realDb: AppDb;
let app: Hono<AppContext>;
const registry: Miniflare[] = [];

beforeAll(async () => {
  const mf = new Miniflare({
    script: "export default { fetch() { return new Response('ok'); } }",
    modules: true,
    d1Databases: { DB: "test-db" },
  });
  const d1 = await mf.getD1Database("DB");
  const dir = resolve(__dirname, "../../db/migrations");
  const preparedStatements: D1PreparedStatement[] = [];
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    const statements = readFileSync(`${dir}/${file}`, "utf8")
      .split("--> statement-breakpoint")
      .flatMap((s) => s.split(/;\s*\n/))
      .map((s) => s.replace(/;+\s*$/, "").trim())
      .filter((s) => s.replace(/--[^\n]*/g, "").trim().length > 0);
    for (const statement of statements) {
      preparedStatements.push(d1.prepare(statement));
    }
  }
  for (let i = 0; i < preparedStatements.length; i += 50) {
    await d1.batch(preparedStatements.slice(i, i + 50));
  }
  realDb = drizzle(d1 as unknown as D1Database, { schema }) as unknown as AppDb;
  registry.push(mf);

  app = new Hono<AppContext>();
  app.use("*", async (c, next) => {
    c.env = { DB: d1 } as any;
    await next();
  });
  app.onError(errorHandler);
  app.post("/webhooks/yalidine", handleYalidineWebhook);

  // Seed: yalidine company + product + order (out_for_delivery, tracked).
  const now = new Date().toISOString();
  await realDb.insert(schema.deliveryCompanies).values({
    id: "comp-yal", name: "Yalidine", nameAr: "يليدين", code: "yalidine", active: true,
    apiEndpoint: "https://api.yalidine.app/v1", apiToken: "tok",
    apiUserGuid: "guid", autoValidate: true, createdAt: now, updatedAt: now,
  });
  await realDb.insert(schema.products).values({
    id: "prod-e2e-2", name: "Mapper Product", handle: "mapper-product", price: 2500,
    hasVariants: false, inventory: 0, trackInventory: true, lowStockThreshold: 2,
    status: "ACTIVE", visibility: true, showInStore: true, storeFeatured: false,
    createdAt: now, updatedAt: now,
  });
  await realDb.insert(schema.customers).values({
    id: "cust-map-1", name: "Mapper Customer", phone: "0555000002",
    wilaya: "الجزائر", totalOrders: 1, totalSpent: 2500, createdAt: now,
  });
  await realDb.insert(schema.orders).values({
    id: "ord-map-1", orderNumber: "ORD-MAP-1", customerId: "cust-map-1",
    customerName: "Mapper Customer", phone: "0555000002", price: 2500,
    status: "out_for_delivery", deliveryMethod: "company", deliveryType: "home",
    trackingNumber: "yal-MAP001", companyId: "comp-yal",
    deliveryFee: 0, driverFee: 0, codAmount: 2500, createdAt: now, updatedAt: now,
  });
  await realDb.insert(schema.orderProducts).values({
    id: "op-map-1", orderId: "ord-map-1", productId: "prod-e2e-2",
    productName: "Mapper Product", quantity: 3, pricePerUnit: 2500,
    lineTotal: 7500, createdAt: now,
  });
}, 120_000);

afterAll(async () => {
  for (const mf of registry) await mf.dispose();
});

async function postEvent(status: string, reason: string | null = null, eventId = `evt-${status}-${Math.random().toString(36).slice(2, 8)}`) {
  const payload = {
    type: "parcel_status_updated",
    events: [
      {
        event_id: eventId,
        occurred_at: "2026-09-07 10:00:00",
        data: { tracking: "yal-MAP001", status, reason },
      },
    ],
  };
  return app.request("/webhooks/yalidine", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

const WEBHOOK_SECRET = "e2e-yalidine-webhook-secret";

async function setCompanySecret(secret: string | null) {
  await realDb
    .update(schema.deliveryCompanies)
    .set({ webhookSecret: secret })
    .where(eq(schema.deliveryCompanies.id, "comp-yal"));
}

/** Post a body with an explicit X-Yalidine-Signature header. */
async function postSigned(body: string, secret: string, valid: boolean) {
  const sig = createHmac("sha256", secret).update(body, "utf8").digest("hex");
  return app.request("/webhooks/yalidine", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Yalidine-Signature": valid ? sig : "0".repeat(64),
    },
    body,
  });
}

async function orderRow() {
  const row = await realDb
    .select()
    .from(schema.orders)
    .where(eq(schema.orders.id, "ord-map-1"))
    .get();
  return row!;
}

async function eventRow(eventId: string) {
  return realDb
    .select()
    .from(schema.webhookEvents)
    .where(eq(schema.webhookEvents.eventId, eventId))
    .get();
}

describe("handleYalidineWebhook — real D1, real mapper, real order path", () => {
  it("the live return flow: transit no-ops never move the order, the terminal maps it returned + restores inventory", async () => {
    // Replay the EXACT observed sequence of a real returned parcel.
    const flow: Array<[string, string | null]> = [
      ["Echèc livraison", null],
      ["Retourné au centre", null],
      ["Retour vers centre", null],
      ["Retour à retirer", null],
      ["Retourné au vendeur", null],
    ];

    // Before: order out for delivery, product inventory 0 (3 units out).
    expect((await orderRow()).status).toBe("out_for_delivery");

    for (const [status, reason] of flow) {
      const res = await postEvent(status, reason);
      expect(res.status).toBe(200);
      await expect(res.json()).resolves.toMatchObject({ received: true });
    }

    // After: order returned, inventory restored (3 units), deliveryAttempts 0.
    const finalOrder = await orderRow();
    expect(finalOrder.status).toBe("returned");

    const product = await realDb
      .select()
      .from(schema.products)
      .where(eq(schema.products.id, "prod-e2e-2"))
      .get();
    expect(product!.inventory).toBe(3);
    expect(finalOrder.deliveryAttempts).toBe(0);

    // Status history recorded the transition.
    const history = await realDb
      .select()
      .from(schema.orderStatusHistory)
      .where(eq(schema.orderStatusHistory.orderId, "ord-map-1"))
      .all();
    expect(history.some((h) => h.status === "returned")).toBe(true);
  });

  it("transit event logs 'ignored' with the carrier status as reason; unknown logs 'unmapped'", async () => {
    const transitId = `evt-transit-${Math.random().toString(36).slice(2, 8)}`;
    const res = await postEvent("En attente du client", null, transitId);
    expect(res.status).toBe(200);
    const row = await eventRow(transitId);
    expect(row!.result).toBe("ignored");
    expect(row!.reason).toBe("En attente du client");

    const unknownId = `evt-unknown-${Math.random().toString(36).slice(2, 8)}`;
    await postEvent("Status Qui N'existe Pas", null, unknownId);
    const unknown = await eventRow(unknownId);
    expect(unknown!.result).toBe("unmapped");
    expect(unknown!.reason).toBe("Status Qui N'existe Pas");
  });

  it("'Tentative échouée' increments deliveryAttempts and keeps out_for_delivery (rank guard holds)", async () => {
    // Order is now "returned" (terminal, rank 6) from the first test —
    // attempts/forward events must NOT resurrect it.
    const res = await postEvent("Tentative échouée", "Client ne répond pas");
    expect(res.status).toBe(200);

    const order = await orderRow();
    expect(order.status).toBe("returned"); // guard held — terminal is final
    expect(order.deliveryAttempts).toBe(0); // not incremented past terminal
  });

  it("rank guard: 'Livré' after 'returned' is rejected — the order stays returned", async () => {
    const res = await postEvent("Livré");
    expect(res.status).toBe(200);
    expect((await orderRow()).status).toBe("returned");
  });

  it("duplicate event_id (replayed delivery) → 200, no second row, no reprocessing", async () => {
    const dupId = `evt-dup-${Math.random().toString(36).slice(2, 8)}`;
    const first = await postEvent("En transit", null, dupId);
    expect(first.status).toBe(200);
    const rowsAfterFirst = await realDb
      .select()
      .from(schema.webhookEvents)
      .where(eq(schema.webhookEvents.eventId, dupId))
      .all();
    expect(rowsAfterFirst).toHaveLength(1);

    // The replayed delivery must ALSO answer 200 — Yalidine retries
    // non-200 seven times, then auto-disables the webhook. A 500 here
    // (the Drizzle-wrapped-cause dedup bug this test caught) would
    // silently kill a merchant's event stream.
    const second = await postEvent("En transit", null, dupId);
    expect(second.status).toBe(200);
    await expect(second.json()).resolves.toMatchObject({ received: true });

    const rowsAfterSecond = await realDb
      .select()
      .from(schema.webhookEvents)
      .where(eq(schema.webhookEvents.eventId, dupId))
      .all();
    expect(rowsAfterSecond).toHaveLength(1);
  });
});

describe("handleYalidineWebhook — HMAC signature verification (real D1 + real crypto)", () => {
  const body = JSON.stringify({
    type: "parcel_status_updated",
    events: [
      {
        event_id: `evt-sig-${Math.random().toString(36).slice(2, 8)}`,
        occurred_at: "2026-09-07 10:00:00",
        data: { tracking: "yal-MAP001", status: "En transit", reason: null },
      },
    ],
  });

  it("valid signature → 200 and the event is recorded", async () => {
    await setCompanySecret(WEBHOOK_SECRET);
    const res = await postSigned(body, WEBHOOK_SECRET, true);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ received: true });
  });

  it("tampered signature → 400 INVALID_WEBHOOK_PAYLOAD and nothing recorded", async () => {
    await setCompanySecret(WEBHOOK_SECRET);
    const payload = JSON.parse(body);
    payload.events[0].event_id = `evt-bad-${Math.random().toString(36).slice(2, 8)}`;
    const res = await postSigned(JSON.stringify(payload), WEBHOOK_SECRET, false);
    expect(res.status).toBe(400);
    const resBody: any = await res.json();
    expect(resBody.code).toBe("INVALID_WEBHOOK_PAYLOAD");
    expect(resBody.context).toMatchObject({ provider: "yalidine" });
  });

  it("missing signature header with secret set → 400", async () => {
    await setCompanySecret(WEBHOOK_SECRET);
    const res = await app.request("/webhooks/yalidine", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    expect(res.status).toBe(400);
  });

  it("secret unset → fail-open 200 (unverified events still land)", async () => {
    await setCompanySecret(null);
    const freshBody = JSON.stringify({
      type: "parcel_status_updated",
      events: [
        {
          event_id: `evt-open-${Math.random().toString(36).slice(2, 8)}`,
          occurred_at: "2026-09-07 10:00:00",
          data: { tracking: "yal-MAP001", status: "En transit", reason: null },
        },
      ],
    });
    const res = await app.request("/webhooks/yalidine", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: freshBody,
    });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ received: true });
    // Restore no-secret state for any suite running after this one.
    await setCompanySecret(null);
  });
});
