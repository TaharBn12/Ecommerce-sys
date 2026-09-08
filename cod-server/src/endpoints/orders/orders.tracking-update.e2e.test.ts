/**
 * updateOrderTracking — deliveryType persistence (real D1, E2E).
 *
 * Slice Y2.1: the dispatch delivery-type override persists through
 * updateOrderTracking's optional 5th argument. Mock-based handler tests
 * prove the wiring; this proves the actual D1 write — the shared query is
 * on every dispatch's hot path and a broken UPDATE (wrong column, bad
 * spread, silent no-op) would only surface on the real stack.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Miniflare } from "miniflare";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import type { AppDb } from "@/db";
import { updateOrderTracking } from "../../../../cod-shared/queries/orders";

let db: AppDb;
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
  db = drizzle(d1 as unknown as D1Database, { schema }) as unknown as AppDb;
  registry.push(mf);

  const now = new Date().toISOString();
  for (const [oid, dtype] of [
    ["ord-tu-1", "stop_desk"],
    ["ord-tu-2", "home"],
  ] as const) {
    const seq = oid.endsWith("1") ? "1" : "2";
    await db.insert(schema.customers).values({
      id: `cust-${oid}`, name: "TU Customer", phone: `055500010${seq}`,
      wilaya: "الجزائر", totalOrders: 1, totalSpent: 1000, createdAt: now,
    });
    await db.insert(schema.orders).values({
      id: oid, orderNumber: `ORD-${oid}`, customerId: `cust-${oid}`,
      customerName: "TU Customer", phone: `055500010${seq}`, price: 1000,
      status: "ready", deliveryMethod: "company", deliveryType: dtype,
      deliveryFee: 0, driverFee: 0, codAmount: 1000, createdAt: now, updatedAt: now,
    });
  }
}, 120_000);

afterAll(async () => {
  for (const mf of registry) await mf.dispose();
});

async function getOrder(id: string) {
  return (await db.select().from(schema.orders).where(eq(schema.orders.id, id)).get())!;
}

describe("updateOrderTracking — deliveryType persistence (real D1)", () => {
  it("persists an override (stop_desk → home) together with the tracking number", async () => {
    await updateOrderTracking(db, "ord-tu-1", "yal-TU001", undefined, "home");
    const order = await getOrder("ord-tu-1");
    expect(order.trackingNumber).toBe("yal-TU001");
    expect(order.trackingUrl).toBeNull();
    expect(order.deliveryType).toBe("home");
  });

  it("persists home → stop_desk when a desk override is chosen", async () => {
    await updateOrderTracking(db, "ord-tu-2", "yal-TU002", undefined, "stop_desk");
    const order = await getOrder("ord-tu-2");
    expect(order.trackingNumber).toBe("yal-TU002");
    expect(order.deliveryType).toBe("stop_desk");
  });

  it("WITHOUT the param the deliveryType is untouched (legacy call shape)", async () => {
    await updateOrderTracking(db, "ord-tu-2", "yal-TU003");
    const order = await getOrder("ord-tu-2");
    expect(order.trackingNumber).toBe("yal-TU003");
    expect(order.deliveryType).toBe("stop_desk"); // kept from previous write
  });
});
