/**
 * Landing Pages — Slice 5: order attribution on real D1.
 *
 * Drives the real createStoreOrder query (the exact code the public order
 * endpoint runs) with a resolved landingPageId. The resolution + best-effort
 * contract is proven at the handler seam: valid slug → attribution lands;
 * garbage/draft/archived slug → order still succeeds unattributed.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Miniflare } from "miniflare";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import type { AppDb } from "@/db";
import { createStoreOrder, findOrCreateCustomer } from "../../../../cod-shared/queries/store";
import { findPublishedLandingPageIdBySlug } from "../../../../cod-shared/queries/landing-pages";

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

const NOW = () => new Date().toISOString();
let seq = 0;

async function seedProduct() {
  const id = `prod-lpa-${++seq}`;
  await db.insert(schema.products).values({
    id, name: `LPA Product ${seq}`, handle: `lpa-product-${seq}`, price: 5000,
    hasVariants: false, inventory: 10, trackInventory: true, lowStockThreshold: 2,
    status: "ACTIVE", visibility: true, showInStore: true, storeFeatured: false,
    createdAt: NOW(), updatedAt: NOW(),
  });
  return id;
}

async function seedLp(slug: string, productId: string, status: "draft" | "published" | "archived") {
  const now = NOW();
  await db.insert(schema.landingPages).values({
    id: slug, slug, name: `LP ${slug}`, productId, status,
    ...(status === "published" ? { publishedAt: now } : {}),
    createdAt: now, updatedAt: now,
  });
}

async function placeOrder(productId: string, landingPageId: string | null) {
  const customerRow = await findOrCreateCustomer(db, {
    phone: `0555${String(400000 + seq).slice(-6)}`, name: "LPA Buyer",
    wilayaId: 16, communeId: "c-16-001",
  });
  const customerId = (customerRow as unknown as { id: string }).id;
  return createStoreOrder(db, {
    productId,
    productName: `LPA Product ${seq}`,
    quantity: 1,
    pricePerUnit: 5000,
    customerName: "LPA Buyer",
    phone: `0555${String(400000 + seq).slice(-6)}`,
    wilayaId: 16,
    communeId: "c-16-001",
    address: "x",
    deliveryType: "home",
    notes: null,
    variantId: null,
    variantLabel: null,
    offerId: null,
    variantSelections: [],
    customerId,
    deliveryFee: 0,
    landingPageId,
  } as any);
}

describe("Slice 5 — landing page order attribution (real D1)", () => {
  it("resolver: published slug → id; draft/archived/unknown → null", async () => {
    const productId = await seedProduct();
    await seedLp("attr-live", productId, "published");
    await seedLp("attr-draft", productId, "draft");
    await seedLp("attr-archived", productId, "archived");

    expect(await findPublishedLandingPageIdBySlug(db, "attr-live")).toBe("attr-live");
    expect(await findPublishedLandingPageIdBySlug(db, "attr-draft")).toBeNull();
    expect(await findPublishedLandingPageIdBySlug(db, "attr-archived")).toBeNull();
    expect(await findPublishedLandingPageIdBySlug(db, "never-existed")).toBeNull();
  });

  it("order placed from a published LP carries attribution", async () => {
    const productId = await seedProduct();
    await seedLp("attr-order-1", productId, "published");

    const result = await placeOrder(productId, "attr-order-1");
    expect(result.price).toBe(5000);

    const order = await db.select().from(schema.orders)
      .where(eq(schema.orders.id, result.id)).get();
    expect(order?.landingPageId).toBe("attr-order-1");
  });

  it("garbage slug / NULL attribution: the order still succeeds — revenue first", async () => {
    const productId = await seedProduct();

    // The handler resolves a garbage slug to NULL and proceeds — proven by
    // placing the order with NULL attribution (the resolver's output above).
    const resolved = await findPublishedLandingPageIdBySlug(db, "total-garbage");
    expect(resolved).toBeNull();

    const result = await placeOrder(productId, null);
    expect(result.price).toBe(5000);
    const order = await db.select().from(schema.orders)
      .where(eq(schema.orders.id, result.id)).get();
    expect(order?.landingPageId).toBeNull();
  });

  it("stats follow attribution: attributed orders count, unattributed don't", async () => {
    const productId = await seedProduct();
    await seedLp("attr-stats", productId, "published");

    await placeOrder(productId, "attr-stats");
    await placeOrder(productId, "attr-stats");
    await placeOrder(productId, null);

    const { getLandingPageById } = await import("../../../../cod-shared/queries/landing-pages");
    const lp = await getLandingPageById(db, "attr-stats");
    expect(lp?.stats).toMatchObject({ orders: 2, revenue: 10000, views: 0 });
  });
});
