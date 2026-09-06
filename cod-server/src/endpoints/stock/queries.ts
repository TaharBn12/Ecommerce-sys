/**
 * Stock Database Queries
 *
 * Pure reads + threshold updates live in cod-shared.
 * adjustStock stays here because it raises NotFoundError / BusinessLogicError.
 */

import { eq, and, sql } from "drizzle-orm";
import { products, productVariants, stockMovements } from "@/db/schema";
import type { AppDb } from "@/db";
import type { AdjustStockInput } from "./validation";
import { NotFoundError, BusinessLogicError } from "@/lib/errors/classes";
import { ERROR_CODES } from "../../../../cod-shared/errors/codes";
import { getProductInventory } from "../../../../cod-shared/queries/stock";

export {
  getStockHistory,
  getStockOverview,
  getStockAlerts,
  updateProductThreshold,
  updateVariantThreshold,
} from "../../../../cod-shared/queries/stock";

export type {
  StockMovementRow,
  StockAlertItem,
  StockOverview,
} from "../../../../cod-shared/queries/stock";

// ─── Adjust Stock ─────────────────────────────────────────────────────────────

import type { StockMovementRow } from "../../../../cod-shared/queries/stock";

type BatchStatement = Parameters<AppDb["batch"]>[0][number];

/** Movement types whose semantics fix the delta's sign. */
const TYPE_SIGN: Record<string, number> = {
  PURCHASE: 1,
  ADJUSTMENT_ADD: 1,
  ADJUSTMENT_REMOVE: -1,
  OFFLINE_SALE: -1,
};

export async function adjustStock(
  db: AppDb,
  params: {
    productId: string;
    variantId: string | null;
    createdBy: string;
    createdByName: string;
    reference?: string | null;
  } & AdjustStockInput,
): Promise<{ movement: StockMovementRow; currentInventory: number }> {
  const { productId, variantId, type, delta, reason, createdBy, createdByName, reference } = params;

  // Ledger honesty: the movement type must agree with the delta direction —
  // an ADJUSTMENT_ADD with a negative delta labels the ledger row a lie.
  const expectedSign = TYPE_SIGN[type];
  if (expectedSign !== undefined && Math.sign(delta) !== expectedSign) {
    throw new BusinessLogicError(
      `Movement type ${type} requires a ${expectedSign > 0 ? "positive" : "negative"} delta (got ${delta})`,
      ERROR_CODES.VALIDATION_FAILED,
      { type, delta },
    );
  }

  const { inventory: qtyBefore, exists } = await getProductInventory(db, productId, variantId ?? null);

  if (!exists) {
    if (variantId) {
      throw new NotFoundError("Variant", variantId);
    } else {
      throw new NotFoundError("Product", productId);
    }
  }

  // Friendly pre-check — keeps the 422 contract with available/required detail.
  // The authoritative guard lives inside the atomic batch below, so a race
  // that slips past this check still cannot corrupt stock.
  const qtyAfter = qtyBefore + delta;
  if (qtyAfter < 0) {
    const productRow = await db
      .select({ name: products.name })
      .from(products)
      .where(eq(products.id, productId))
      .get();

    throw new BusinessLogicError(
      `Insufficient stock for ${productRow?.name ?? "product"}. Available: ${qtyBefore}, Required: ${Math.abs(delta)}`,
      ERROR_CODES.INSUFFICIENT_STOCK,
      {
        stockId: variantId ?? productId,
        productName: productRow?.name ?? null,
        available: qtyBefore,
        required: Math.abs(delta),
      },
    );
  }

  const now = new Date().toISOString();
  const movementId = crypto.randomUUID();

  // Guarded atomic batch — movement first (its subselects read pre-update
  // state), then the inventory UPDATE with `inventory + delta >= 0` in the
  // WHERE. Two concurrent adjustments can no longer clobber each other, and
  // the ledger row can never diverge from the applied change.
  const guard =
    variantId !== null
      ? sql`FROM ${productVariants} WHERE ${productVariants.id} = ${variantId} AND ${productVariants.inventory} + ${delta} >= 0`
      : sql`FROM ${products} WHERE ${products.id} = ${productId} AND ${products.inventory} + ${delta} >= 0`;
  const inventoryColumn =
    variantId !== null ? productVariants.inventory : products.inventory;

  const guardedUpdate =
    variantId !== null
      ? db
          .update(productVariants)
          .set({ inventory: sql`${productVariants.inventory} + ${delta}`, updatedAt: now })
          .where(
            and(
              eq(productVariants.id, variantId),
              sql`${productVariants.inventory} + ${delta} >= 0`,
            ),
          )
      : db
          .update(products)
          .set({ inventory: sql`${products.inventory} + ${delta}`, updatedAt: now })
          .where(
            and(
              eq(products.id, productId),
              sql`${products.inventory} + ${delta} >= 0`,
            ),
          );

  await db.batch([
    db.insert(stockMovements).values({
      id: movementId,
      productId,
      variantId: variantId ?? null,
      type,
      delta,
      qtyBefore: sql`(SELECT ${inventoryColumn} ${guard})`,
      qtyAfter: sql`(SELECT ${inventoryColumn} + ${delta} ${guard})`,
      reason: reason ?? null,
      reference: reference ?? null,
      createdBy,
      createdByName,
      createdAt: now,
    }),
    guardedUpdate,
  ] as [BatchStatement, ...BatchStatement[]]);

  const { inventory: currentInventory } = await getProductInventory(db, productId, variantId ?? null);

  const movement: StockMovementRow = {
    id: movementId,
    productId,
    variantId: variantId ?? null,
    type,
    delta,
    qtyBefore: qtyBefore,
    qtyAfter: currentInventory,
    reason: reason ?? null,
    reference: reference ?? null,
    createdBy,
    createdByName,
    createdAt: now,
  };

  return { movement, currentInventory };
}
