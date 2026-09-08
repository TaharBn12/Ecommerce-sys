/**
 * GET /api/delivery-companies/:id/webhook/events — real-D1 E2E.
 *
 * Exercises the full route: RBAC middleware, zod query validation, the
 * joined read (events + orderNumber), result filtering, pagination, and
 * scope/company guards — against real D1 with real migrations and a real
 * auth'd context. No mocked queries.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { Miniflare } from "miniflare";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import type { AppContext } from "@/types";
import { errorHandler } from "@/middleware/error";
import * as schema from "@/db/schema";
import type { AppDb } from "@/db";

vi.mock("@/db", () => ({ getDb: vi.fn(() => realDb) }));
vi.mock("@/lib/activity", () => ({
  logActivity: vi.fn(async () => {}),
  ACTIONS: { COMPANY_CREATED: "company.created", COMPANY_UPDATED: "company.updated" },
}));

import deliveryRouter from "@/endpoints/delivery-companies/routes";

let realDb: AppDb;
let app: Hono<AppContext>;
const registry: Miniflare[] = [];

const READ_SCOPES = ["delivery:read"];
const MANAGE_SCOPES = ["delivery:read", "delivery:manage"];
const NO_SCOPES: string[] = [];

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
  // Order matters: env + identity middleware BEFORE app.route, or Hono
  // never invokes them for the router's matched handlers.
  app.use("*", async (c, next) => {
    c.env = { DB: d1 } as any;
    c.set("user", {
      id: "user-1", email: "test@example.com", name: "Test User",
      role: "user", status: "active", apiKey: "cod_key_test",
      scopes: currentScopes,
    } as any);
    await next();
  });
  app.onError(errorHandler);
  app.route("/api/delivery-companies", deliveryRouter);

  const now = new Date().toISOString();
  await realDb.insert(schema.deliveryCompanies).values({
    id: "comp-events", name: "Yalidine", nameAr: "يليدين", code: "yalidine",
    active: true, apiEndpoint: "https://api.yalidine.app/v1", apiToken: "tok",
    apiUserGuid: "guid", autoValidate: true, createdAt: now, updatedAt: now,
  });
  await realDb.insert(schema.customers).values({
    id: "cust-events", name: "Events Customer", phone: "0555000333",
    wilaya: "الجزائر", totalOrders: 1, totalSpent: 1000, createdAt: now,
  });
  await realDb.insert(schema.orders).values({
    id: "ord-events-1", orderNumber: "ORD-EVT-1", customerId: "cust-events",
    customerName: "Events Customer", phone: "0555000333", price: 1000,
    status: "delivered", deliveryMethod: "company", deliveryType: "home",
    trackingNumber: "yal-EVT1", companyId: "comp-events",
    deliveryFee: 0, driverFee: 0, codAmount: 1000, createdAt: now, updatedAt: now,
  });

  // Seed a spread of event outcomes — the operational lens the UI relies on.
  const events = [
    { eventId: "evt-ok-1", result: "ok", newStatus: "delivered", reason: null, orderId: "ord-events-1", tracking: "yal-EVT1", eventType: "parcel_status_updated", offsetSec: 60 },
    { eventId: "evt-ignored-1", result: "ignored", newStatus: null, reason: "En attente du client", orderId: "ord-events-1", tracking: "yal-EVT1", eventType: "parcel_status_updated", offsetSec: 50 },
    { eventId: "evt-attempts-1", result: "ignored", newStatus: null, reason: "Client ne répond pas", orderId: "ord-events-1", tracking: "yal-EVT1", eventType: "parcel_status_updated", offsetSec: 40 },
    { eventId: "evt-unmapped-1", result: "unmapped", newStatus: null, reason: "Nouveau Statut Inconnu", orderId: null, tracking: "yal-EVT2", eventType: "parcel_status_updated", offsetSec: 30 },
    { eventId: "evt-error-1", result: "error", newStatus: null, reason: null, errorMsg: "boom", orderId: null, tracking: "yal-EVT3", eventType: "parcel_payment_updated", offsetSec: 20 },
    { eventId: "evt-pending-1", result: "pending", newStatus: null, reason: null, orderId: null, tracking: "yal-EVT4", eventType: "parcel_created", offsetSec: 10 },
  ];
  for (const e of events) {
    await realDb.insert(schema.webhookEvents).values({
      id: crypto.randomUUID(),
      provider: "yalidine",
      eventId: e.eventId,
      companyId: "comp-events",
      orderId: e.orderId,
      tracking: e.tracking,
      eventType: e.eventType,
      rawPayload: "{}",
      result: e.result,
      newStatus: e.newStatus,
      reason: e.reason,
      errorMsg: e.errorMsg ?? null,
      processedAt: e.result === "pending" ? null : new Date(Date.now() - e.offsetSec * 1000).toISOString(),
      createdAt: new Date(Date.now() - e.offsetSec * 1000).toISOString(),
    });
  }
}, 120_000);

let currentScopes: string[] = MANAGE_SCOPES;

afterAll(async () => {
  for (const mf of registry) await mf.dispose();
});

function authAs(scopes: string[]) {
  currentScopes = scopes;
}

describe("GET /api/delivery-companies/:id/webhook/events — real D1", () => {
  it("lists newest-first with joined orderNumber and excludes rawPayload", async () => {
    authAs(READ_SCOPES);
    const res = await app.request("/api/delivery-companies/comp-events/webhook/events");
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.total).toBe(6);
    expect(body.data.events).toHaveLength(6);
    // Newest first — the pending event (10s ago) leads.
    expect(body.data.events[0].eventId).toBe("evt-pending-1");
    expect(body.data.events[5].eventId).toBe("evt-ok-1");
    // orderNumber joined where orderId resolves.
    const okEvent = body.data.events.find((e: any) => e.eventId === "evt-ok-1");
    expect(okEvent.orderNumber).toBe("ORD-EVT-1");
    expect(okEvent.newStatus).toBe("delivered");
    const unmapped = body.data.events.find((e: any) => e.eventId === "evt-unmapped-1");
    expect(unmapped.orderNumber).toBeNull();
    expect(unmapped.reason).toBe("Nouveau Statut Inconnu");
    // rawPayload never leaks into the list.
    expect("rawPayload" in body.data.events[0]).toBe(false);
  });

  it("filters by result — the operational lens", async () => {
    authAs(READ_SCOPES);
    const res = await app.request("/api/delivery-companies/comp-events/webhook/events?result=unmapped");
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.data.total).toBe(1);
    expect(body.data.events[0].eventId).toBe("evt-unmapped-1");

    const ignored = await app.request("/api/delivery-companies/comp-events/webhook/events?result=ignored");
    const ignoredBody: any = await ignored.json();
    expect(ignoredBody.data.total).toBe(2);
  });

  it("paginates with limit + offset and reports the full total", async () => {
    authAs(READ_SCOPES);
    const page1 = await app.request("/api/delivery-companies/comp-events/webhook/events?limit=2&offset=0");
    const p1: any = await page1.json();
    expect(p1.data.events).toHaveLength(2);
    expect(p1.data.total).toBe(6);

    const page2 = await app.request("/api/delivery-companies/comp-events/webhook/events?limit=2&offset=2");
    const p2: any = await page2.json();
    expect(p2.data.events).toHaveLength(2);
    // Pages don't overlap.
    expect(p2.data.events[0].id).not.toBe(p1.data.events[0].id);
    expect(p2.data.events[0].id).not.toBe(p1.data.events[1].id);
  });

  it("404 for an unknown company", async () => {
    authAs(READ_SCOPES);
    const res = await app.request("/api/delivery-companies/nope/webhook/events");
    expect(res.status).toBe(404);
  });

  it("rejects a user without delivery:read (RBAC guard on real middleware)", async () => {
    authAs(NO_SCOPES);
    const res = await app.request("/api/delivery-companies/comp-events/webhook/events");
    expect(res.status).toBe(403);
    authAs(MANAGE_SCOPES);
  });

  it("scoping: another company's events never appear", async () => {
    authAs(READ_SCOPES);
    const now = new Date().toISOString();
    await realDb.insert(schema.deliveryCompanies).values({
      id: "comp-other", name: "ZR", nameAr: "زد", code: "zr_express",
      active: true, createdAt: now, updatedAt: now,
    });
    await realDb.insert(schema.webhookEvents).values({
      id: crypto.randomUUID(), provider: "zr_express", eventId: "evt-zr-1",
      companyId: "comp-other", tracking: "ZR-1", eventType: "parcel.state.updated",
      rawPayload: "{}", result: "ok", createdAt: now,
    });
    const res = await app.request("/api/delivery-companies/comp-events/webhook/events");
    const body: any = await res.json();
    expect(body.data.total).toBe(6); // the ZR row is invisible here
  });
});
