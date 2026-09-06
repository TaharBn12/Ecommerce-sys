/**
 * Flagged-issues probe matrix — real D1 (red-first audit round 2)
 *
 *   F1  storefront delivery fee: uncovered/disabled wilaya must refuse, not charge 0
 *   F2  carrier amount sync must update codAmount, not just price
 *   F3  catalog inventory edits (product/variant update, create, delete) must
 *       write stock movements — the ledger has to reconcile to inventory
 *   F4  manual adjustStock must be race-free and atomic (update + ledger together)
 *   F5  driver cash reconciliation: pendingCash vs pending orders, drift visible
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Miniflare } from "miniflare";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { drizzle } from "drizzle-orm/d1";
import { eq, sql } from "drizzle-orm";
import * as schema from "@/db/schema";
import type { AppDb } from "@/db";
import { createOrder, updateOrderStatus, syncOrderAfterCarrierUpdate } from "../../../../cod-shared/queries/orders";
import { updateVariant, createVariant, deleteVariant } from "../../../../cod-shared/queries/variants";
import { updateProduct } from "../../../../cod-shared/queries/products";
import { adjustStock } from "../stock/queries";
import { getDriverById } from "../../../../cod-shared/queries/drivers";

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
  const prepared: D1PreparedStatement[] = [];
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    const statements = readFileSync(`${dir}/${file}`, "utf8")
      .split("--> statement-breakpoint")
      .flatMap((s) => s.split(/;\s*\n/))
      .map((s) => s.replace(/;+\s*$/, "").trim())
      .filter((s) => s.replace(/--[^\n]*/g, "").trim().length > 0);
    for (const statement of statements) prepared.push(rawD1.prepare(statement));
  }
  for (let i = 0; i < prepared.length; i += 50) {
    await rawD1.batch(prepared.slice(i, i + 50));
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

async function seedProduct(inventory = 10, hasVariants = false) {
  const id = `prod-fx-${++seq}`;
  await db.insert(schema.products).values({
    id, name: `FX Product ${seq}`, handle: `fx-product-${seq}`, price: 1000,
    hasVariants, inventory, trackInventory: true, lowStockThreshold: 2,
    status: "ACTIVE", visibility: true, showInStore: true, storeFeatured: false,
    createdAt: NOW(), updatedAt: NOW(),
  });
  return id;
}

async function seedVariant(productId: string, inventory = 5) {
  const id = `var-fx-${++seq}`;
  await db.insert(schema.productVariants).values({
    id, productId, variations: JSON.stringify({ اللون: "أسود" }), currency: "DZD",
    price: 1200, sku: `SKU-FX-${seq}`, inventory, isDefault: true, active: true,
    position: 0, createdAt: NOW(), updatedAt: NOW(),
  });
  return id;
}

async function seedCustomer() {
  const id = `cust-fx-${++seq}`;
  await db.insert(schema.customers).values({
    id, name: "FX Customer", phone: `0555${String(200000 + seq).slice(-6)}`,
    wilaya: "الجزائر", totalOrders: 0, totalSpent: 0, createdAt: NOW(),
  });
  return id;
}

async function seedDriver() {
  const id = `drv-fx-${++seq}`;
  await db.insert(schema.drivers).values({
    id, firstName: "FX", lastName: "Driver", phone: "0666000001",
    createdAt: NOW(), updatedAt: NOW(),
  });
  return id;
}

async function seedShippingProfile(rules: Array<{ wilayaId: number; home: number; homeEnabled?: number }>) {
  // Reuse the single existing default profile (the schema allows only one
  // meaningful default; creating several would make .get() pick arbitrarily).
  let pid = (await db.select({ id: schema.shippingProfiles.id })
    .from(schema.shippingProfiles).where(eq(schema.shippingProfiles.isDefault, true)).get())?.id;
  if (!pid) {
    pid = `sp-fx-${++seq}`;
    await db.insert(schema.shippingProfiles).values({
      id: pid, name: "FX Profile", isDefault: true, createdAt: NOW(), updatedAt: NOW(),
    });
  }
  for (const r of rules) {
    await db.insert(schema.shippingRules).values({
      id: `sr-fx-${++seq}`, profileId: pid, wilayaId: r.wilayaId,
      homePrice: r.home, stopDeskPrice: r.home,
      homeEnabled: (r.homeEnabled ?? 1) === 1, stopDeskEnabled: true,
      createdAt: NOW(),
    });
  }
  return pid;
}

async function movementsFor(sku: { productId: string; variantId?: string | null }) {
  const rows = await db.select().from(schema.stockMovements)
    .where(sku.variantId
      ? sql`${schema.stockMovements.productId} = ${sku.productId} AND ${schema.stockMovements.variantId} = ${sku.variantId}`
      : eq(schema.stockMovements.productId, sku.productId))
    .all();
  return rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
}

async function orderWith(productId: string, qty = 1, extra: Record<string, unknown> = {}) {
  const customerId = await seedCustomer();
  const oid = `ord-fx-${++seq}`;
  await createOrder(db, {
    id: oid, orderNumber: `ORD-FX-${seq}`, customerId,
    customerName: "FX", phone: "0555000001", price: qty * 1000,
    status: "new", deliveryMethod: "unassigned", deliveryType: "home",
    deliveryFee: 0, driverFee: 0, codAmount: qty * 1000, createdAt: NOW(), updatedAt: NOW(),
    ...extra,
  }, [{
    id: `op-fx-${seq}`, orderId: oid, productId, productName: "FX",
    quantity: qty, pricePerUnit: 1000, lineTotal: qty * 1000, createdAt: NOW(),
  }], { id: "u1", name: "A" });
  return oid;
}

// ─────────────────────────────────────────────────────────────────────────────

describe("F1: storefront delivery fee — uncovered/disabled wilayas", () => {
  // Each test uses its own wilaya: profiles seeded by earlier tests persist
  // in this shared real DB and would otherwise pollute later expectations.
  // This first test MUST run before any profile is seeded.
  it("no shipping profile at all → fee 0 (matches dashboard semantics)", async () => {
    const { getDeliveryFee } = await import("../../../../cod-shared/queries/store");
    expect(await getDeliveryFee(db, 16, "home")).toBe(0);
  });

  it("order to a wilaya with no rule is REFUSED (profile exists)", async () => {
    const { getDeliveryFee } = await import("../../../../cod-shared/queries/store");
    await seedShippingProfile([{ wilayaId: 21, home: 600 }]); // only wilaya 21 covered

    const fee = await getDeliveryFee(db, 22, "home");
    // FIXED contract: null = unavailable — the handler must refuse the order
    expect(fee).toBeNull();
  });

  it("covered wilaya resolves its price", async () => {
    const { getDeliveryFee } = await import("../../../../cod-shared/queries/store");
    await seedShippingProfile([{ wilayaId: 23, home: 600 }]);

    expect(await getDeliveryFee(db, 23, "home")).toBe(600);
  });

  it("disabled delivery type is refused even when the rule exists", async () => {
    const { getDeliveryFee } = await import("../../../../cod-shared/queries/store");
    await seedShippingProfile([{ wilayaId: 24, home: 600, homeEnabled: 0 }]);

    expect(await getDeliveryFee(db, 24, "home")).toBeNull();
    expect(await getDeliveryFee(db, 24, "stop_desk")).toBe(600);
  });

  it("rule-less wilaya under an existing profile → unavailable", async () => {
    const { getDeliveryFee } = await import("../../../../cod-shared/queries/store");
    expect(await getDeliveryFee(db, 25, "home")).toBeNull();
  });
});

describe("F2: carrier amount sync keeps codAmount honest", () => {
  it("syncing price recomputes codAmount = price + deliveryFee", async () => {
    const productId = await seedProduct();
    const oid = await orderWith(productId, 1, {
      price: 9000, codAmount: 9600, deliveryFee: 600,
    });

    await syncOrderAfterCarrierUpdate(db, oid, { price: 12000 });

    const order = (await db.select().from(schema.orders).where(eq(schema.orders.id, oid)).get())!;
    expect(order.price).toBe(12000);
    // FIXED: the COD the driver is booked to collect follows the carrier amount
    expect(Number(order.codAmount)).toBe(12600);
  });

  it("name-only sync leaves price and codAmount untouched", async () => {
    const productId = await seedProduct();
    const oid = await orderWith(productId, 1, { price: 9000, codAmount: 9600, deliveryFee: 600 });

    await syncOrderAfterCarrierUpdate(db, oid, { customerName: "New Name" });

    const order = (await db.select().from(schema.orders).where(eq(schema.orders.id, oid)).get())!;
    expect(order.price).toBe(9000);
    expect(Number(order.codAmount)).toBe(9600);
    expect(order.customerName).toBe("New Name");
  });
});

describe("F3: catalog inventory edits write the ledger", () => {
  it("variant inventory edit logs an ADJUSTMENT movement with the delta", async () => {
    const productId = await seedProduct(0, true);
    const variantId = await seedVariant(productId, 10);

    await updateVariant(db, variantId, { inventory: 15 });

    const mv = await movementsFor({ productId, variantId });
    expect(mv).toHaveLength(1);
    expect(mv[0]).toMatchObject({
      type: "ADJUSTMENT_ADD", delta: 5, qtyBefore: 10, qtyAfter: 15,
      productId, variantId,
    });
    const v = (await db.select().from(schema.productVariants).where(eq(schema.productVariants.id, variantId)).get())!;
    expect(v.inventory).toBe(15);
  });

  it("variant inventory decrease logs ADJUSTMENT_REMOVE", async () => {
    const productId = await seedProduct(0, true);
    const variantId = await seedVariant(productId, 10);

    await updateVariant(db, variantId, { inventory: 4 });

    const mv = await movementsFor({ productId, variantId });
    expect(mv[0]).toMatchObject({ type: "ADJUSTMENT_REMOVE", delta: -6, qtyBefore: 10, qtyAfter: 4 });
  });

  it("variant edit without inventory change writes no movement", async () => {
    const productId = await seedProduct(0, true);
    const variantId = await seedVariant(productId, 10);

    await updateVariant(db, variantId, { price: 1500 });

    expect(await movementsFor({ productId, variantId })).toHaveLength(0);
  });

  it("untracked product: no ledger rows even when inventory edited", async () => {
    const productId = `prod-fx-${++seq}`;
    await db.insert(schema.products).values({
      id: productId, name: "Untracked", handle: `untracked-${seq}`, price: 1000,
      hasVariants: false, inventory: 10, trackInventory: false, lowStockThreshold: 2,
      status: "ACTIVE", visibility: true, showInStore: true, storeFeatured: false,
      createdAt: NOW(), updatedAt: NOW(),
    });

    await updateProduct(db, productId, { inventory: 15 });

    expect(await movementsFor({ productId })).toHaveLength(0);
  });

  it("simple product inventory edit logs the movement", async () => {
    const productId = await seedProduct(10);

    await updateProduct(db, productId, { inventory: 7 });

    const mv = await movementsFor({ productId });
    expect(mv).toHaveLength(1);
    expect(mv[0]).toMatchObject({ type: "ADJUSTMENT_REMOVE", delta: -3, qtyBefore: 10, qtyAfter: 7, variantId: null });
  });

  it("variant create logs opening stock; delete exits with the row (cascade contract)", async () => {
    const productId = await seedProduct(0, true);

    const variant = await createVariant(db, productId, {
      variations: { "اللون": "أحمر" }, price: 1200, sku: `SKU-OPEN-${seq}`,
      inventory: 8, isDefault: false, active: true, position: 1,
    });
    let mv = await movementsFor({ productId, variantId: variant!.id });
    expect(mv).toHaveLength(1);
    expect(mv[0]).toMatchObject({ type: "ADJUSTMENT_ADD", delta: 8, qtyBefore: 0, qtyAfter: 8 });

    await deleteVariant(db, variant!.id);

    // stock_movements.variant_id is ON DELETE cascade: the variant's scoped
    // movements leave with the row, keeping Σ(movements) reconciled to the
    // pool (no phantom -8 at productId level against a vanished +8).
    expect(await db.select().from(schema.productVariants).where(eq(schema.productVariants.id, variant!.id)).get()).toBeUndefined();
    expect(await movementsFor({ productId, variantId: variant!.id })).toHaveLength(0);
    // And the exit is still atomic: order lines referencing it are nulled.
    expect(await db.select().from(schema.orderProducts).where(eq(schema.orderProducts.variantId, variant!.id)).all()).toHaveLength(0);
  });
});

describe("F4: manual adjustStock — atomic and race-free", () => {
  it("concurrent adjustments both land (no lost delta)", async () => {
    const productId = await seedProduct(10);

    await Promise.allSettled([
      adjustStock(db, { productId, variantId: null, type: "ADJUSTMENT_ADD", delta: 5, reason: "r1", createdBy: "u1", createdByName: "A" }),
      adjustStock(db, { productId, variantId: null, type: "ADJUSTMENT_ADD", delta: 3, reason: "r2", createdBy: "u2", createdByName: "B" }),
    ]);

    const inv = (await db.select().from(schema.products).where(eq(schema.products.id, productId)).get())!;
    expect(inv.inventory).toBe(18); // both deltas — no lost update
    const mv = await movementsFor({ productId });
    expect(mv).toHaveLength(2);
    expect(mv.reduce((s, m) => s + m.delta, 0)).toBe(8);
  });

  it("insufficient stock keeps the friendly 422 contract", async () => {
    const productId = await seedProduct(2);

    await expect(
      adjustStock(db, { productId, variantId: null, type: "ADJUSTMENT_REMOVE", delta: -5, reason: "r", createdBy: "u1", createdByName: "A" }),
    ).rejects.toThrow(/Insufficient stock/);

    const inv = (await db.select().from(schema.products).where(eq(schema.products.id, productId)).get())!;
    expect(inv.inventory).toBe(2); // untouched
    expect(await movementsFor({ productId })).toHaveLength(0);
  });

  it("movement type must match delta direction", async () => {
    const productId = await seedProduct(10);

    await expect(
      adjustStock(db, { productId, variantId: null, type: "ADJUSTMENT_ADD", delta: -3, reason: "r", createdBy: "u1", createdByName: "A" }),
    ).rejects.toThrow(/direction|type/i);

    expect(await movementsFor({ productId })).toHaveLength(0);
  });
});

describe("F5: driver cash reconciliation", () => {
  it("reports pendingCash, pending order total, and zero drift when consistent", async () => {
    const driverId = await seedDriver();
    const productId = await seedProduct();
    const oid = await orderWith(productId, 1, { driverId, driverFee: 500, codAmount: 10500, price: 10000 });
    await updateOrderStatus(db, oid, "delivered");

    const driver = await getDriverById(db, driverId);
    const rec = (driver as any).cashReconciliation;
    expect(rec).toMatchObject({ pendingCash: 10500, pendingOrdersTotal: 10500, pendingOrdersCount: 1, drift: 0 });
  });

  it("surfaces drift when the ledger is corrupted (legacy damage visible)", async () => {
    const driverId = await seedDriver();
    const productId = await seedProduct();
    const oid = await orderWith(productId, 1, { driverId, driverFee: 500, codAmount: 10500, price: 10000 });
    await updateOrderStatus(db, oid, "delivered");

    // Simulate historical drift (e.g. damage from the pre-fix delete bug)
    await db.update(schema.drivers).set({ pendingCash: 15500 }).where(eq(schema.drivers.id, driverId));

    const driver = await getDriverById(db, driverId);
    const rec = (driver as any).cashReconciliation;
    expect(rec).toMatchObject({ pendingCash: 15500, pendingOrdersTotal: 10500, pendingOrdersCount: 1, drift: 5000 });
  });
});
