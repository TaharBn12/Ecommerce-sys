import { eq } from "drizzle-orm";
import { products, productVariants, orderProducts, stockMovements } from "../db/schema";
import type { AppDb } from "../db/client";

type BatchStatement = Parameters<AppDb["batch"]>[0][number];

export interface CreateVariantData {
  variations: Record<string, string>;
  price: number;
  compareAtPrice?: number | null;
  sku: string;
  barcode?: string | null;
  inventory: number;
  lowStockThreshold?: number;
  weightKg?: number | null;
  imageId?: string | null;
  isDefault: boolean;
  active: boolean;
  position: number;
}

export interface UpdateVariantData {
  variations?: Record<string, string>;
  price?: number;
  compareAtPrice?: number | null;
  sku?: string;
  barcode?: string | null;
  inventory?: number;
  lowStockThreshold?: number;
  weightKg?: number | null;
  imageId?: string | null;
  isDefault?: boolean;
  active?: boolean;
  position?: number;
}

function parseVariant(v: typeof productVariants.$inferSelect) {
  return { ...v, variations: JSON.parse(v.variations) as Record<string, string> };
}

/**
 * Ledger discipline: every tracked-SKU inventory change writes a movement row.
 * Catalog edits (create/update/delete) previously mutated inventory with no
 * ledger entry, so the movement log stopped reconciling to real stock.
 * The activity log records WHO edited; the stock ledger records the math.
 */
function buildInventoryMovement(
  db: AppDb,
  input: {
    productId: string;
    variantId: string | null;
    delta: number;
    qtyBefore: number;
    qtyAfter: number;
    reason: string;
  },
): BatchStatement {
  return db
    .insert(stockMovements)
    .values({
      id: crypto.randomUUID(),
      productId: input.productId,
      variantId: input.variantId,
      type: input.delta > 0 ? "ADJUSTMENT_ADD" : "ADJUSTMENT_REMOVE",
      delta: input.delta,
      qtyBefore: input.qtyBefore,
      qtyAfter: input.qtyAfter,
      reason: input.reason,
      reference: null,
      createdBy: "system",
      createdByName: "النظام",
      createdAt: new Date().toISOString(),
    });
}

export async function getVariantsByProduct(db: AppDb, productId: string) {
  const variants = await db
    .select()
    .from(productVariants)
    .where(eq(productVariants.productId, productId))
    .orderBy(productVariants.position)
    .all();
  return variants.map(parseVariant);
}

export async function getVariantById(db: AppDb, variantId: string) {
  const v = await db.select().from(productVariants).where(eq(productVariants.id, variantId)).get();
  return v ? parseVariant(v) : null;
}

export async function createVariant(db: AppDb, productId: string, data: CreateVariantData) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const statements: BatchStatement[] = [
    db.insert(productVariants).values({
      id,
      productId,
      variations: JSON.stringify(data.variations),
      currency: "DZD",
      price: data.price,
      compareAtPrice: data.compareAtPrice ?? null,
      sku: data.sku ?? null,
      barcode: data.barcode ?? null,
      inventory: data.inventory,
      lowStockThreshold: data.lowStockThreshold ?? 5,
      weightKg: data.weightKg ?? null,
      imageId: data.imageId ?? null,
      isDefault: data.isDefault,
      active: data.active,
      position: data.position,
      createdAt: now,
      updatedAt: now,
    }),
  ];

  // Opening stock enters the ledger for tracked products — the audit trail
  // must reconcile to inventory from the variant's first day.
  if (data.inventory > 0) {
    const productRow = await db
      .select({ trackInventory: products.trackInventory })
      .from(products)
      .where(eq(products.id, productId))
      .get();
    if (productRow?.trackInventory) {
      statements.push(
        buildInventoryMovement(db, {
          productId,
          variantId: id,
          delta: data.inventory,
          qtyBefore: 0,
          qtyAfter: data.inventory,
          reason: "Opening stock — variant created",
        }),
      );
    }
  }

  await db.batch(statements as [BatchStatement, ...BatchStatement[]]);

  return getVariantById(db, id);
}

export async function updateVariant(db: AppDb, variantId: string, data: UpdateVariantData) {
  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };

  if (data.variations !== undefined) updates.variations = JSON.stringify(data.variations);
  if (data.price !== undefined) updates.price = data.price;
  if (data.compareAtPrice !== undefined) updates.compareAtPrice = data.compareAtPrice ?? null;
  if (data.sku !== undefined) updates.sku = data.sku ?? null;
  if (data.barcode !== undefined) updates.barcode = data.barcode ?? null;
  if (data.inventory !== undefined) updates.inventory = data.inventory;
  if (data.lowStockThreshold !== undefined) updates.lowStockThreshold = data.lowStockThreshold;
  if (data.weightKg !== undefined) updates.weightKg = data.weightKg ?? null;
  if (data.imageId !== undefined) updates.imageId = data.imageId ?? null;
  if (data.isDefault !== undefined) updates.isDefault = data.isDefault;
  if (data.active !== undefined) updates.active = data.active;
  if (data.position !== undefined) updates.position = data.position;

  const statements: BatchStatement[] = [
    db.update(productVariants).set(updates).where(eq(productVariants.id, variantId)),
  ];

  // Direct inventory edits are manual adjustments — log them like one.
  if (data.inventory !== undefined) {
    const variantRow = await db
      .select({ productId: productVariants.productId, inventory: productVariants.inventory })
      .from(productVariants)
      .where(eq(productVariants.id, variantId))
      .get();
    if (variantRow) {
      const productRow = await db
        .select({ trackInventory: products.trackInventory })
        .from(products)
        .where(eq(products.id, variantRow.productId))
        .get();
      if (productRow?.trackInventory) {
        const qtyBefore = variantRow.inventory;
        const delta = data.inventory - qtyBefore;
        if (delta !== 0) {
          statements.push(
            buildInventoryMovement(db, {
              productId: variantRow.productId,
              variantId,
              delta,
              qtyBefore,
              qtyAfter: data.inventory,
              reason: "Variant inventory edited",
            }),
          );
        }
      }
    }
  }

  await db.batch(statements as [BatchStatement, ...BatchStatement[]]);
  return getVariantById(db, variantId);
}

export async function deleteVariant(db: AppDb, variantId: string) {
  // Preserve order history — null out the reference rather than blocking deletion.
  const variantRow = await db
    .select({ productId: productVariants.productId, inventory: productVariants.inventory })
    .from(productVariants)
    .where(eq(productVariants.id, variantId))
    .get();

  // No ledger surrogate for the deletion: stock_movements.variant_id is
  // ON DELETE cascade, so the variant's scoped movements (including its
  // opening stock) leave with the row. Σ(movements) stays reconciled to the
  // tracked pool; a productId-level -N row would double-count against the
  // vanished +N. The atomic batch still guarantees the null-out and the
  // delete commit together.
  const statements: BatchStatement[] = [
    db.update(orderProducts).set({ variantId: null }).where(eq(orderProducts.variantId, variantId)),
    db.delete(productVariants).where(eq(productVariants.id, variantId)),
  ];

  await db.batch(statements as [BatchStatement, ...BatchStatement[]]);
  return { success: true };
}
