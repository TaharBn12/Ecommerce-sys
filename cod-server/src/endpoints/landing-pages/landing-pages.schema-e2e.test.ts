/**
 * Landing Pages — Slice 1: schema round-trip on real D1.
 *
 * Proves migration 0019 matches the drizzle schema 1:1 and that the FK
 * contracts hold: image cascade on LP delete, orders blocking LP delete,
 * orders.landingPageId nullable (best-effort attribution shape).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Miniflare } from "miniflare";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import type { AppDb } from "@/db";
import { landingPages, landingPageImages } from "@/db/schema";

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

async function seedProduct(id: string) {
  await db.insert(schema.products).values({
    id, name: `LP Product ${id}`, handle: `lp-product-${id}`, price: 5000,
    hasVariants: false, inventory: 10, trackInventory: true, lowStockThreshold: 2,
    status: "ACTIVE", visibility: true, showInStore: true, storeFeatured: false,
    createdAt: NOW(), updatedAt: NOW(),
  });
}

describe("Slice 1 — landing pages schema on real D1", () => {
  it("creates a landing page with defaults and round-trips through drizzle", async () => {
    await seedProduct("prod-lp-s1");
    await db.insert(landingPages).values({
      id: "lp-1", slug: "lp-abcdefgh", name: "Test LP", productId: "prod-lp-s1",
      createdAt: NOW(), updatedAt: NOW(),
    });

    const row = await db.select().from(landingPages).where(eq(landingPages.id, "lp-1")).get();
    expect(row).toMatchObject({
      id: "lp-1",
      slug: "lp-abcdefgh",
      name: "Test LP",
      productId: "prod-lp-s1",
      status: "draft",
      imageGap: 0,
      sidePadding: 0,
      contentMaxWidth: 0,
      views: 0,
      publishedAt: null,
      metaTitle: null,
      metaDescription: null,
    });
  });

  it("slug uniqueness is enforced at the DB level", async () => {
    await expect(
      db.insert(landingPages).values({
        id: "lp-dup", slug: "lp-abcdefgh", name: "Dup", productId: "prod-lp-s1",
        createdAt: NOW(), updatedAt: NOW(),
      }),
    ).rejects.toThrow();
  });

  it("image rows keep their position order and cascade on LP delete", async () => {
    await seedProduct("prod-lp-s2");
    await db.insert(landingPages).values({
      id: "lp-2", slug: "lp-s2slug", name: "Cascade LP", productId: "prod-lp-s2",
      createdAt: NOW(), updatedAt: NOW(),
    });
    for (const [imgId, pos] of [["lpimg-1", 1], ["lpimg-2", 2], ["lpimg-3", 3]] as const) {
      await db.insert(landingPageImages).values({
        id: imgId, landingPageId: "lp-2", r2Key: `landing/${imgId}.jpg`,
        src: `https://media.example/landing/${imgId}.jpg`, position: pos, createdAt: NOW(),
      });
    }

    const images = await db.select().from(landingPageImages)
      .where(eq(landingPageImages.landingPageId, "lp-2"));
    expect(images.map((i) => i.position).sort()).toEqual([1, 2, 3]);
    expect(images[0]).toMatchObject({ source: "upload", altText: null });

    await db.delete(landingPages).where(eq(landingPages.id, "lp-2"));
    expect(
      await db.select().from(landingPageImages).where(eq(landingPageImages.landingPageId, "lp-2")),
    ).toHaveLength(0);
  });

  it("orders.landingPageId is nullable and FK-enforced (attribution shape)", async () => {
    await seedProduct("prod-lp-s3");
    await db.insert(landingPages).values({
      id: "lp-3", slug: "lp-s3slug", name: "Attribution LP", productId: "prod-lp-s3",
      createdAt: NOW(), updatedAt: NOW(),
    });
    await db.insert(schema.customers).values({
      id: "cust-lp-s3", name: "LP Customer", phone: "0555000001",
      wilaya: "الجزائر", totalOrders: 0, totalSpent: 0, createdAt: NOW(),
    });
    await db.insert(schema.orders).values({
      id: "ord-lp-s3", orderNumber: "ORD-LP-S3", customerId: "cust-lp-s3",
      customerName: "LP Customer", phone: "0555000001", price: 5000,
      status: "new", deliveryMethod: "unassigned", deliveryType: "home",
      deliveryFee: 0, driverFee: 0, codAmount: 5000,
      landingPageId: "lp-3",
      createdAt: NOW(), updatedAt: NOW(),
    });

    const order = await db.select().from(schema.orders)
      .where(eq(schema.orders.id, "ord-lp-s3")).get();
    expect(order?.landingPageId).toBe("lp-3");

    // Attributed history blocks LP delete (the app layer refuses; the FK
    // guarantees referential integrity even if something bypasses it).
    await expect(
      db.delete(landingPages).where(eq(landingPages.id, "lp-3")),
    ).rejects.toThrow();
  });

  it("unattributed order (NULL landingPageId) is the default best-effort shape", async () => {
    await db.insert(schema.customers).values({
      id: "cust-lp-s4", name: "LP Customer 2", phone: "0555000002",
      wilaya: "الجزائر", totalOrders: 0, totalSpent: 0, createdAt: NOW(),
    });
    await db.insert(schema.orders).values({
      id: "ord-lp-s4", orderNumber: "ORD-LP-S4", customerId: "cust-lp-s4",
      customerName: "LP Customer 2", phone: "0555000002", price: 3000,
      status: "new", deliveryMethod: "unassigned", deliveryType: "home",
      deliveryFee: 0, driverFee: 0, codAmount: 3000,
      createdAt: NOW(), updatedAt: NOW(),
    });

    const order = await db.select().from(schema.orders)
      .where(eq(schema.orders.id, "ord-lp-s4")).get();
    expect(order?.landingPageId).toBeNull();
  });
});
