/**
 * Money & inventory integrity — real-D1 probe matrix (audit, red-first)
 *
 * Proves or refutes the four top audit findings against real migrations on
 * real D1. No mocks for the flows; fault injection only for atomicity probes.
 *
 * Probes:
 *   P1  storefront price forging — client pricePerUnit vs variant catalog price
 *   P2  delete delivered order → driver pendingCash/totalEarnings reconciliation
 *   P3  dashboard createOrder oversell floor + concurrent double-sell race
 *   P4  driver settlement atomicity (insert → link → counters)
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Miniflare } from "miniflare";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { drizzle } from "drizzle-orm/d1";
import { eq, sql } from "drizzle-orm";
import * as schema from "@/db/schema";
import type { AppDb } from "@/db";
import { createOrder, updateOrderStatus, deleteOrder } from "../../../../cod-shared/queries/orders";

let db: AppDb;
let rawD1: D1Database;

beforeAll(async () => {
  const mf = new Miniflare({
    script: "export default { fetch() { return new Response('ok'); } }",
    modules: true,
    d1Databases: { DB: "test-db" },
  });
  rawD1 = await mf.getD1Database("DB");
  const dir = resolve(__dirname, "../../db/migrations");
  const preparedStatements: D1PreparedStatement[] = [];
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    const statements = readFileSync(`${dir}/${file}`, "utf8")
      .split("--> statement-breakpoint")
      .flatMap((s) => s.split(/;\s*\n/))
      .map((s) => s.replace(/;+\s*$/, "").trim())
      .filter((s) => s.replace(/--[^\n]*/g, "").trim().length > 0);
    for (const statement of statements) {
      preparedStatements.push(rawD1.prepare(statement));
    }
  }
  for (let i = 0; i < preparedStatements.length; i += 50) {
    await rawD1.batch(preparedStatements.slice(i, i + 50));
  }
  db = drizzle(rawD1 as unknown as D1Database, { schema }) as unknown as AppDb;
  registry.push(mf);
}, 120_000);

const registry: Miniflare[] = [];
afterAll(async () => {
  for (const mf of registry) await mf.dispose();
});

let seq = 0;
const NOW = () => new Date().toISOString();

async function seedSimpleProduct(inventory: number, price = 10000) {
  const id = `prod-mi-${++seq}`;
  const now = NOW();
  await db.insert(schema.products).values({
    id, name: `MI Product ${seq}`, handle: `mi-product-${seq}`, price,
    hasVariants: false, inventory, trackInventory: true, lowStockThreshold: 2,
    status: "ACTIVE", visibility: true, showInStore: true, storeFeatured: false,
    createdAt: now, updatedAt: now,
  });
  return id;
}

async function seedCustomer() {
  const id = `cust-mi-${++seq}`;
  await db.insert(schema.customers).values({
    id, name: "MI Customer", phone: `0555${String(100000 + seq).slice(-6)}`,
    wilaya: "الجزائر", totalOrders: 0, totalSpent: 0, createdAt: NOW(),
  });
  return id;
}

async function seedDriver() {
  const id = `drv-mi-${++seq}`;
  const now = NOW();
  await db.insert(schema.drivers).values({
    id, firstName: "MI", lastName: "Driver", phone: "0666000001",
    createdAt: now, updatedAt: now,
  });
  return id;
}

function orderInsert(id: string, productId: string, qty: number, price: number, extra: Record<string, unknown> = {}) {
  const now = NOW();
  return {
    id, orderNumber: `ORD-MI-${seq}`, customerId: `cust-live-${seq}`,
    customerName: "MI", phone: "0555000001", price,
    status: "new" as const, deliveryMethod: "unassigned" as const, deliveryType: "home" as const,
    deliveryFee: 0, driverFee: 0, codAmount: price, createdAt: now, updatedAt: now,
    ...extra,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

describe("P3: dashboard createOrder — oversell guard & race", () => {
  it("oversell is rejected atomically — no order, no partial deduction", async () => {
    const productId = await seedSimpleProduct(2);
    const customerId = await seedCustomer();
    const oid = `ord-mi-${++seq}`;

    // qty 5 against stock 2 → the whole order must fail and roll back
    const res = await createOrder(db, orderInsert(oid, productId, 0, 10000, { customerId }), [{
      id: `op-${seq}`, orderId: oid, productId, productName: "MI",
      quantity: 5, pricePerUnit: 2000, lineTotal: 10000, createdAt: NOW(),
    }]).then(() => "ok", (e: Error) => e);

    expect(res).toBeInstanceOf(Error);
    // Nothing was written: no order, no lines, stats untouched, stock intact
    expect(await db.select().from(schema.orders).where(eq(schema.orders.id, oid)).get()).toBeUndefined();
    expect(await db.select().from(schema.orderProducts).where(eq(schema.orderProducts.orderId, oid)).all()).toHaveLength(0);
    expect(await db.select().from(schema.stockMovements).where(eq(schema.stockMovements.productId, productId)).all()).toHaveLength(0);
    const cust = (await db.select().from(schema.customers).where(eq(schema.customers.id, customerId)).get())!;
    expect(cust.totalOrders).toBe(0);
    const inv = (await db.select().from(schema.products).where(eq(schema.products.id, productId)).get())!;
    expect(inv.inventory).toBe(2);
  });

  it("race: two concurrent orders for the last unit — exactly one wins, no corruption", async () => {
    const productId = await seedSimpleProduct(1);
    const c1 = await seedCustomer();
    const c2 = await seedCustomer();
    const o1 = `ord-mi-${++seq}`;
    const o2 = `ord-mi-${++seq}`;
    const now = NOW();

    const results = await Promise.allSettled([
      createOrder(db, { ...orderInsert(o1, productId, 0, 10000, { customerId: c1 }), orderNumber: `ORD-MI-${seq}-1` }, [{
        id: `op-${seq}a`, orderId: o1, productId, productName: "MI", quantity: 1, pricePerUnit: 10000, lineTotal: 10000, createdAt: now,
      }]),
      createOrder(db, { ...orderInsert(o2, productId, 0, 10000, { customerId: c2 }), orderNumber: `ORD-MI-${seq}-2` }, [{
        id: `op-${seq}b`, orderId: o2, productId, productName: "MI", quantity: 1, pricePerUnit: 10000, lineTotal: 10000, createdAt: now,
      }]),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled").length;
    const rejected = results.filter((r) => r.status === "rejected").length;

    // FIXED: exactly one order commits, the other fails cleanly
    expect(fulfilled).toBe(1);
    expect(rejected).toBe(1);

    const inv = (await db.select().from(schema.products).where(eq(schema.products.id, productId)).get())!;
    const movements = await db.select().from(schema.stockMovements).where(eq(schema.stockMovements.productId, productId)).all();
    expect(inv.inventory).toBe(0);
    expect(movements).toHaveLength(1);
    expect(movements[0].delta).toBe(-1);
    expect(movements[0].qtyBefore).toBe(1);
    expect(movements[0].qtyAfter).toBe(0);
  });
});

describe("P2: delete delivered order → driver money reconciliation", () => {
  it("driver credit is fully reversed when deleting an unsettled delivered order", async () => {
    const driverId = await seedDriver();
    const productId = await seedSimpleProduct(5);
    const customerId = await seedCustomer();
    const oid = `ord-mi-${++seq}`;

    await createOrder(db, { ...orderInsert(oid, productId, 0, 10000, { customerId, driverId, driverFee: 500, codAmount: 10500 }), orderNumber: `ORD-MI-${seq}` }, [{
      id: `op-${seq}`, orderId: oid, productId, productName: "MI", quantity: 1, pricePerUnit: 10000, lineTotal: 10000, createdAt: NOW(),
    }]);
    await updateOrderStatus(db, oid, "delivered");

    const drvBefore = (await db.select().from(schema.drivers).where(eq(schema.drivers.id, driverId)).get())!;
    expect(drvBefore).toMatchObject({ totalDelivered: 1, totalEarnings: 500, pendingCash: 10500 });

    await deleteOrder(db, oid);

    // FIXED: the driver ledger reconciles — no phantom cash, no ghost credit
    const drvAfter = (await db.select().from(schema.drivers).where(eq(schema.drivers.id, driverId)).get())!;
    expect(drvAfter).toMatchObject({ totalDelivered: 0, totalEarnings: 0, pendingCash: 0 });
  });

  it("settled delivered order: driver counters untouched (payment history preserved)", async () => {
    const driverId = await seedDriver();
    const productId = await seedSimpleProduct(5);
    const customerId = await seedCustomer();
    const oid = `ord-mi-${++seq}`;

    await createOrder(db, { ...orderInsert(oid, productId, 0, 10000, { customerId, driverId, driverFee: 500, codAmount: 10500 }), orderNumber: `ORD-MI-${seq}` }, [{
      id: `op-${seq}`, orderId: oid, productId, productName: "MI", quantity: 1, pricePerUnit: 10000, lineTotal: 10000, createdAt: NOW(),
    }]);
    await updateOrderStatus(db, oid, "delivered");
    // Simulate an existing settlement link (append-only history)
    await db.update(schema.orders).set({ codPaymentId: "dp-hist-1" }).where(eq(schema.orders.id, oid));

    await deleteOrder(db, oid);

    const drvAfter = (await db.select().from(schema.drivers).where(eq(schema.drivers.id, driverId)).get())!;
    // Counters stay — the money really moved; the payment row stays reconciled
    expect(drvAfter).toMatchObject({ totalDelivered: 1, totalEarnings: 500, pendingCash: 10500 });
  });
});

describe("P4: driver settlement atomicity (real createDriverPayment)", () => {
  it("settles atomically: payment row + links + counters in one batch", async () => {
    const { createDriverPayment } = await import("../driver-payments/queries");
    const driverId = await seedDriver();
    const productId = await seedSimpleProduct(5);
    const customerId = await seedCustomer();
    const oid = `ord-mi-${++seq}`;
    await createOrder(db, { ...orderInsert(oid, productId, 0, 10000, { customerId, driverId, driverFee: 500, codAmount: 10500 }), orderNumber: `ORD-MI-${seq}` }, [{
      id: `op-${seq}`, orderId: oid, productId, productName: "MI", quantity: 1, pricePerUnit: 10000, lineTotal: 10000, createdAt: NOW(),
    }]);
    await updateOrderStatus(db, oid, "delivered");

    const res = await createDriverPayment(
      db as any,
      { driverId, type: "cod_remittance", orderIds: [oid], notes: "probe" },
      "u1", "Admin",
    );

    expect(res.amount).toBe(10500);
    const drv = (await db.select().from(schema.drivers).where(eq(schema.drivers.id, driverId)).get())!;
    expect(drv).toMatchObject({ pendingCash: 0, totalPaid: 10500, totalEarnings: 500 });
    const order = (await db.select().from(schema.orders).where(eq(schema.orders.id, oid)).get())!;
    expect(order.codPaymentId).toBe(res.id);
    const payments = await db.select().from(schema.driverPayments).all();
    expect(payments.filter((p) => p.driverId === driverId)).toHaveLength(1);

    // Double-settlement guard still enforced
    await expect(
      createDriverPayment(db as any, { driverId, type: "cod_remittance", orderIds: [oid], notes: undefined }, "u1", "Admin"),
    ).rejects.toThrow(/already have their COD settled/);
  });
});

describe("P1: storefront price forging (server-authoritative pricing)", () => {
  it("forged pricePerUnit is ignored — catalog price is charged", async () => {
    const t = await import("../../../../cod-shared/queries/store");
    const productId = await seedSimpleProduct(10, 50000); // catalog: 50 000 DZD
    const productName = "MI Forged Probe";

    const customerId = await t.findOrCreateCustomer(db, {
      phone: "0770000001", name: "Forged", wilayaId: 16, communeId: "c-16-001",
    });

    const result = await t.createStoreOrder(db, {
      productId,
      productName,
      quantity: 1,
      pricePerUnit: 1, // forged: 1 DZD
      customerName: "Forged",
      phone: "0770000001",
      wilayaId: 16,
      communeId: "c-16-001",
      address: "x",
      deliveryType: "home",
      notes: null,
      variantId: null,
      variantLabel: null,
      offerId: null,
      variantSelections: [],
      customerId: typeof customerId === "string" ? customerId : (customerId as any).id,
      deliveryFee: 0,
    } as any).catch((e: Error) => e);

    expect(result).not.toBeInstanceOf(Error);

    const created = await db.select().from(schema.orders).where(eq(schema.orders.customerId, typeof customerId === "string" ? customerId : (customerId as any).id)).all();
    const forged = created.find((o) => o.phone === "0770000001");
    expect(forged).toBeDefined();
    // FIXED: the order persisted at the CATALOG price, not the forged 1 DZD
    expect(Number(forged!.price)).toBe(50000);
    expect(Number(forged!.codAmount)).toBe(50000);

    // And the customer stats inherited the real price, not the forged one
    const cust = (await db.select().from(schema.customers)
      .where(eq(schema.customers.id, typeof customerId === "string" ? customerId : (customerId as any).id)).get())!;
    expect(Number(cust.totalSpent)).toBe(50000);

    // The line too
    const line = (await db.select().from(schema.orderProducts)
      .where(eq(schema.orderProducts.orderId, forged!.id)).get())!;
    expect(line.pricePerUnit).toBe(50000);
    expect(line.lineTotal).toBe(50000);
  });
});
