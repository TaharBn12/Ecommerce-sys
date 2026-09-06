/**
 * Stock & customer-stats lifecycle — real D1 (E2E diagnosis matrix)
 *
 * Runs every restock/stats path against real migrations on real D1 (FKs
 * enforced, exactly like production). No mocks for the flows themselves.
 *
 * Invariants under test (senior-dev checklist):
 *   I1  inventory = initial - sold + restocked-from-terminal (never double)
 *   I2  customer.totalOrders tracks non-deleted orders
 *   I3  customer.totalSpent = spend of non-terminal, non-deleted orders
 *   I4  driver credit (delivered/earnings/pendingCash) applied exactly once
 *   I5  every multi-write flow is atomic — failure leaves NO partial state
 *   I6  stock_movements ledger deltas sum to the real inventory change
 *
 * Fault injection (makeFaultyDb) wraps the REAL d1 and rejects a chosen
 * write — proving atomicity with real SQL rather than mocks.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Miniflare } from "miniflare";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import type { AppDb } from "@/db";
import {
  createOrder,
  updateOrderStatus,
  updateOrderStatusWebhook,
  setOrderProductReturn,
  deleteOrder,
} from "../../../../cod-shared/queries/orders";

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

// ─── Fault injection: real D1 + rejection at a chosen write ───────────────────

function makeFaultyDb(failWhen: (sqlText: string) => boolean): AppDb {
  const poisoned = () => {
    const stub: Record<string, unknown> = {
      __sql: "POISONED",
      bind: () => stub,
      run: () => Promise.reject(new Error("INJECTED FAULT")),
      raw: () => Promise.reject(new Error("INJECTED FAULT")),
      all: () => Promise.reject(new Error("INJECTED FAULT")),
      get: () => Promise.reject(new Error("INJECTED FAULT")),
      first: () => Promise.reject(new Error("INJECTED FAULT")),
    };
    return stub as unknown as D1PreparedStatement;
  };

  const faulty = {
    prepare: (sqlText: string) => {
      const stmt = rawD1.prepare(sqlText);
      if (failWhen(sqlText)) return poisoned();
      (stmt as D1PreparedStatement & { __sql?: string }).__sql = sqlText;
      return stmt;
    },
    batch: (stmts: D1PreparedStatement[]) => {
      for (const stmt of stmts) {
        const sqlText = (stmt as D1PreparedStatement & { __sql?: string }).__sql;
        // Poisoned stmts (prepared while faulting) or a matching statement
        // fault the whole batch — D1 batches are atomic, mirroring reality.
        if (sqlText === "POISONED" || (sqlText && failWhen(sqlText))) {
          return Promise.reject(new Error("INJECTED FAULT"));
        }
      }
      return rawD1.batch(stmts);
    },
    exec: (sqlText: string) => rawD1.exec(sqlText),
    dump: () => rawD1.dump(),
  } as unknown as D1Database;

  return drizzle(faulty, { schema }) as unknown as AppDb;
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

let seq = 0;

const INITIAL_INVENTORY = 10;

async function seedCustomer(baseOrders = 0, baseSpent = 0) {
  const id = `cust-lc-${++seq}`;
  const now = new Date().toISOString();
  await db.insert(schema.customers).values({
    id, name: "LC Customer", phone: `0555${String(100000 + seq).slice(-6)}`,
    wilaya: "الجزائر", totalOrders: baseOrders, totalSpent: baseSpent,
    createdAt: now,
  });
  return id;
}

async function seedProduct(inventory = INITIAL_INVENTORY) {
  const id = `prod-lc-${++seq}`;
  const now = new Date().toISOString();
  await db.insert(schema.products).values({
    id, name: "LC Product", handle: `lc-product-${seq}`, price: 1000,
    hasVariants: false, inventory, trackInventory: true, lowStockThreshold: 2,
    status: "ACTIVE", visibility: true, showInStore: true, storeFeatured: false,
    createdAt: now, updatedAt: now,
  });
  return id;
}

interface SeedOrderOpts {
  qty?: number;
  price?: number;
  driverId?: string;
  driverFee?: number;
  codAmount?: number;
}

async function seedOrder(opts: SeedOrderOpts = {}) {
  const { qty = 2, price = 2000, driverId, driverFee = 350, codAmount = 2600 } = opts;
  const customerId = await seedCustomer();
  const productId = await seedProduct();
  const id = `ord-lc-${++seq}`;
  const now = new Date().toISOString();

  await createOrder(
    db,
    {
      id, orderNumber: `ORD-LC-${seq}`, customerId,
      customerName: "LC Customer", phone: "0555000001", price,
      status: "new", deliveryMethod: driverId ? "driver" : "unassigned",
      deliveryType: "home", deliveryFee: 0, driverFee: driverId ? driverFee : 0,
      codAmount, driverId: driverId ?? null,
      createdAt: now, updatedAt: now,
    },
    [{
      id: `op-lc-${seq}`, orderId: id, productId, productName: "LC Product",
      quantity: qty, pricePerUnit: price / qty, lineTotal: price, createdAt: now,
    }],
    { id: "user_1", name: "Admin" },
  );

  return { orderId: id, customerId, productId, lineId: `op-lc-${seq}` };
}

async function inventoryOf(productId: string) {
  return (await db.select({ inv: schema.products.inventory }).from(schema.products)
    .where(eq(schema.products.id, productId)).get())?.inv;
}

async function customerOf(customerId: string) {
  return (await db.select().from(schema.customers)
    .where(eq(schema.customers.id, customerId)).get())!;
}

async function lineOf(lineId: string) {
  return (await db.select().from(schema.orderProducts)
    .where(eq(schema.orderProducts.id, lineId)).get())!;
}

async function orderStatus(orderId: string) {
  return (await db.select({ s: schema.orders.status }).from(schema.orders)
    .where(eq(schema.orders.id, orderId)).get())?.s;
}

async function movementsFor(productId: string) {
  const rows = await db.select().from(schema.stockMovements)
    .where(eq(schema.stockMovements.productId, productId)).all();
  // createdAt ties (same-ms ISO) can order arbitrarily — sort, then fall back
  // to numeric-string compare on id for determinism.
  return rows.sort((a, b) =>
    a.createdAt === b.createdAt ? a.id.localeCompare(b.id) : a.createdAt.localeCompare(b.createdAt),
  );
}

async function seedDriver() {
  const id = `drv-lc-${++seq}`;
  const now = new Date().toISOString();
  await db.insert(schema.drivers).values({
    id, firstName: "LC", lastName: "Driver", phone: "0666000001",
    createdAt: now, updatedAt: now,
  });
  return id;
}

// ─────────────────────────────────────────────────────────────────────────────
// The matrix
// ─────────────────────────────────────────────────────────────────────────────

describe("stock & customer stats — real D1 lifecycle matrix", () => {
  it("T1: createOrder deducts stock, bumps stats, logs ledger (baseline)", async () => {
    const { orderId, productId, customerId } = await seedOrder();

    expect(await orderStatus(orderId)).toBe("new");
    expect(await inventoryOf(productId)).toBe(INITIAL_INVENTORY - 2); // I1
    expect(await customerOf(customerId)).toMatchObject({ totalOrders: 1, totalSpent: 2000 }); // I2/I3
    const mv = await movementsFor(productId);
    expect(mv).toHaveLength(1);
    expect(mv[0]).toMatchObject({ type: "ORDER_DEDUCTED", delta: -2, qtyBefore: 10, qtyAfter: 8 }); // I6
  });

  it("T2: manual cancel restocks, rolls back totalSpent, marks lines returned", async () => {
    const { orderId, productId, customerId, lineId } = await seedOrder();

    await updateOrderStatus(db, orderId, "cancelled");

    expect(await inventoryOf(productId)).toBe(INITIAL_INVENTORY); // I1
    expect(await customerOf(customerId)).toMatchObject({ totalSpent: 0 }); // I3
    expect(await lineOf(lineId)).toMatchObject({ status: "returned", returnedQuantity: 2 });
    const mv = await movementsFor(productId);
    expect(mv.map((m) => m.delta)).toEqual([-2, 2]); // I6
  });

  it("T3: double manual cancel — wasAlreadyTerminal guard prevents double restock", async () => {
    const { orderId, productId } = await seedOrder();

    await updateOrderStatus(db, orderId, "cancelled");
    await updateOrderStatus(db, orderId, "cancelled");

    expect(await inventoryOf(productId)).toBe(INITIAL_INVENTORY); // I1
    expect((await movementsFor(productId)).map((m) => m.delta)).toEqual([-2, 2]);
  });

  it("T4: webhook cancel after manual cancel — rank guard prevents double restock/stats", async () => {
    const { orderId, productId, customerId } = await seedOrder();

    await updateOrderStatus(db, orderId, "cancelled");
    const res = await updateOrderStatusWebhook(db, orderId, "cancelled", "e2e");

    expect(res).toEqual({ updated: false });
    expect(await inventoryOf(productId)).toBe(INITIAL_INVENTORY);
    expect(await customerOf(customerId)).toMatchObject({ totalSpent: 0 });
    expect((await movementsFor(productId)).map((m) => m.delta)).toEqual([-2, 2]);
  });

  it("T5: partial return then cancel — restock totals exactly the sold quantity", async () => {
    const { orderId, productId, lineId } = await seedOrder({ qty: 4, price: 4000 });

    await setOrderProductReturn(db, orderId, lineId, 1);
    expect(await inventoryOf(productId)).toBe(INITIAL_INVENTORY - 3);

    await updateOrderStatus(db, orderId, "cancelled");
    expect(await inventoryOf(productId)).toBe(INITIAL_INVENTORY); // I1
    expect(await lineOf(lineId)).toMatchObject({ status: "returned", returnedQuantity: 4 });
    expect((await movementsFor(productId)).map((m) => m.delta)).toEqual([-4, 1, 3]); // I6
  });

  it("T6: return correction (2 → 1) on active order — inventory follows the delta", async () => {
    const { orderId, productId, lineId } = await seedOrder({ qty: 4, price: 4000 });

    await setOrderProductReturn(db, orderId, lineId, 2);
    expect(await inventoryOf(productId)).toBe(INITIAL_INVENTORY - 2);

    await setOrderProductReturn(db, orderId, lineId, 1);
    expect(await inventoryOf(productId)).toBe(INITIAL_INVENTORY - 3); // I1
    expect(await lineOf(lineId)).toMatchObject({ status: "partially_returned", returnedQuantity: 1 });
    expect((await movementsFor(productId)).map((m) => m.delta)).toEqual([-4, 2, -1]); // I6
  });

  it("T7: manual delivered with driver — driver credited exactly once", async () => {
    const driverId = await seedDriver();
    const { orderId } = await seedOrder({ driverId, driverFee: 350, codAmount: 2600 });

    await updateOrderStatus(db, orderId, "delivered");

    const drv = (await db.select().from(schema.drivers)
      .where(eq(schema.drivers.id, driverId)).get())!;
    expect(drv).toMatchObject({ totalDelivered: 1, totalEarnings: 350, pendingCash: 2600 }); // I4
  });

  it("T8: webhook delivered after manual delivered — rank guard, credit stays once", async () => {
    const driverId = await seedDriver();
    const { orderId } = await seedOrder({ driverId });

    await updateOrderStatus(db, orderId, "delivered");
    const res = await updateOrderStatusWebhook(db, orderId, "delivered", "e2e");

    expect(res).toEqual({ updated: false });
    const drv = (await db.select().from(schema.drivers)
      .where(eq(schema.drivers.id, driverId)).get())!;
    expect(drv).toMatchObject({ totalDelivered: 1, totalEarnings: 350, pendingCash: 2600 }); // I4
  });

  it("T9: deleteOrder on an active order — stats and stock fully rolled back", async () => {
    const { orderId, productId, customerId } = await seedOrder();

    await deleteOrder(db, orderId);

    expect(await inventoryOf(productId)).toBe(INITIAL_INVENTORY); // I1
    expect(await customerOf(customerId)).toMatchObject({ totalOrders: 0, totalSpent: 0 }); // I2/I3
    expect(await db.select().from(schema.orders).where(eq(schema.orders.id, orderId)).get()).toBeUndefined();
  });

  it("T10: cancel THEN delete — customer stats must return to the pre-order baseline", async () => {
    // Customer with PRIOR spend so the MAX(0, …) floor cannot mask a
    // double-decrement (the floor silently absorbs it at totalSpent=0).
    const customerId = await seedCustomer(1, 5000);
    const productId = await seedProduct();
    const orderId = `ord-lc-${++seq}`;
    const now = new Date().toISOString();
    await createOrder(db, {
      id: orderId, orderNumber: `ORD-LC-${seq}`, customerId,
      customerName: "LC Customer", phone: "0555000001", price: 2000,
      status: "new", deliveryMethod: "unassigned", deliveryType: "home",
      deliveryFee: 0, driverFee: 0, codAmount: 2000, createdAt: now, updatedAt: now,
    }, [{
      id: `op-lc-${seq}`, orderId, productId, productName: "LC Product",
      quantity: 2, pricePerUnit: 1000, lineTotal: 2000, createdAt: now,
    }], { id: "u1", name: "A" });

    await updateOrderStatus(db, orderId, "cancelled"); // totalSpent 7000 → 5000
    await deleteOrder(db, orderId);

    // I2/I3: the order is gone; its cancelled spend was already rolled back
    // at cancel time. Deleting must not subtract it a second time.
    expect(await customerOf(customerId)).toMatchObject({ totalOrders: 1, totalSpent: 5000 });
    expect(await inventoryOf(productId)).toBe(INITIAL_INVENTORY);
  });

  it("T11: oversell (qty > inventory) is rejected atomically — no partial state", async () => {
    const productId = await seedProduct(1); // 1 unit in stock
    const customerId = await seedCustomer();
    const orderId = `ord-lc-${++seq}`;
    const now = new Date().toISOString();

    // qty 2 against 1 unit: the guarded deduction makes the whole batch fail
    await expect(createOrder(db, {
      id: orderId, orderNumber: `ORD-LC-${seq}`, customerId,
      customerName: "LC Customer", phone: "0555000001", price: 2000,
      status: "new", deliveryMethod: "unassigned", deliveryType: "home",
      deliveryFee: 0, driverFee: 0, codAmount: 2000, createdAt: now, updatedAt: now,
    }, [{
      id: `op-lc-${seq}`, orderId, productId, productName: "LC Product",
      quantity: 2, pricePerUnit: 1000, lineTotal: 2000, createdAt: now,
    }], { id: "u1", name: "A" })).rejects.toThrow();

    // Nothing committed: no order, no lines, stats untouched, stock intact
    expect(await db.select().from(schema.orders).where(eq(schema.orders.id, orderId)).get()).toBeUndefined();
    expect(await customerOf(customerId)).toMatchObject({ totalOrders: 0, totalSpent: 0 });
    expect(await inventoryOf(productId)).toBe(1);
    expect(await movementsFor(productId)).toHaveLength(0);
  });

  // ── Atomicity (I5) — real D1 + fault injection ─────────────────────────────

  it("T12: manual cancel fault mid-sequence — must leave NO partial state", async () => {
    const { orderId, productId } = await seedOrder();

    const faulty = makeFaultyDb((sql) =>
      sql.includes('update "products"') && sql.includes("inventory"),
    );

    await expect(
      updateOrderStatus(faulty, orderId, "cancelled"),
    ).rejects.toThrow();

    // I5: if atomic, the status write rolled back too — retry is safe.
    expect(await orderStatus(orderId)).toBe("new");
    expect(await inventoryOf(productId)).toBe(INITIAL_INVENTORY - 2);
  });

  it("T13: createOrder fault mid-sequence — must leave NO ghost order", async () => {
    const customerId = await seedCustomer();
    const productId = await seedProduct();
    const orderId = `ord-lc-${++seq}`;
    const now = new Date().toISOString();

    const faulty = makeFaultyDb((sql) => sql.includes('insert into "order_products"'));

    await expect(
      createOrder(faulty, {
        id: orderId, orderNumber: `ORD-LC-${seq}`, customerId,
        customerName: "LC Customer", phone: "0555000001", price: 2000,
        status: "new", deliveryMethod: "unassigned", deliveryType: "home",
        deliveryFee: 0, driverFee: 0, codAmount: 2000, createdAt: now, updatedAt: now,
      }, [{
        id: `op-lc-${seq}`, orderId, productId, productName: "LC Product",
        quantity: 2, pricePerUnit: 1000, lineTotal: 2000, createdAt: now,
      }], { id: "u1", name: "A" }),
    ).rejects.toThrow();

    // I5: the orders row must not exist without its products/stats.
    expect(await db.select().from(schema.orders).where(eq(schema.orders.id, orderId)).get()).toBeUndefined();
    expect(await customerOf(customerId)).toMatchObject({ totalOrders: 0, totalSpent: 0 });
  });

  it("T14: webhook cancel fault — atomic batch leaves NO partial state (control)", async () => {
    const { orderId, productId, customerId } = await seedOrder();

    const faulty = makeFaultyDb((sql) =>
      (sql.includes('update "products"') || sql.includes('update "orders"')),
    );

    await expect(
      updateOrderStatusWebhook(faulty, orderId, "cancelled", "e2e"),
    ).rejects.toThrow();

    // The webhook path batches everything — nothing committed.
    expect(await orderStatus(orderId)).toBe("new");
    expect(await inventoryOf(productId)).toBe(INITIAL_INVENTORY - 2);
    expect(await customerOf(customerId)).toMatchObject({ totalSpent: 2000 });
  });
});
