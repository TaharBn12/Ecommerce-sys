/**
 * Re-exported from cod-shared/queries/variants so the dashboard can consume
 * the same read functions directly from D1.
 *
 * createVariant/updateVariant wrappers stay here because they raise
 * BusinessLogicError: the SKU uniqueness pre-check turns a raw DB constraint
 * crash (HTTP 500) into a friendly 409 DUPLICATE_SKU carrying the SKU.
 */
import { eq, and, ne } from "drizzle-orm";
import { productVariants } from "@/db/schema";
import type { AppDb } from "@/db";
import { ConflictError } from "@/lib/errors/classes";
import { ERROR_CODES } from "../../../../cod-shared/errors/codes";
import * as shared from "../../../../cod-shared/queries/variants";

export * from "../../../../cod-shared/queries/variants";

type CreateVariantData = Parameters<typeof shared.createVariant>[2];
type UpdateVariantData = Parameters<typeof shared.updateVariant>[2];

function isSkuUniqueViolation(err: unknown): boolean {
  return (
    err instanceof Error &&
    /UNIQUE constraint failed: product_variants\.sku/i.test(err.message)
  );
}

function duplicateSkuError(sku: string) {
  return new ConflictError(
    `SKU "${sku}" is already used by another variant`,
    ERROR_CODES.DUPLICATE_SKU,
    { sku },
  );
}

async function assertSkuAvailable(
  db: AppDb,
  sku: string,
  excludeVariantId: string | null,
) {
  const clash = await db
    .select({ id: productVariants.id, productId: productVariants.productId })
    .from(productVariants)
    .where(
      excludeVariantId
        ? and(eq(productVariants.sku, sku), ne(productVariants.id, excludeVariantId))
        : eq(productVariants.sku, sku),
    )
    .get();
  if (clash) throw duplicateSkuError(sku);
}

export async function createVariant(
  db: AppDb,
  productId: string,
  data: CreateVariantData,
) {
  if (data.sku) await assertSkuAvailable(db, data.sku, null);
  try {
    return await shared.createVariant(db, productId, data);
  } catch (err) {
    // Race: a concurrent writer took the SKU between check and insert.
    if (isSkuUniqueViolation(err)) throw duplicateSkuError(data.sku);
    throw err;
  }
}

export async function updateVariant(
  db: AppDb,
  variantId: string,
  data: UpdateVariantData,
) {
  if (data.sku) await assertSkuAvailable(db, data.sku, variantId);
  try {
    return await shared.updateVariant(db, variantId, data);
  } catch (err) {
    if (data.sku && isSkuUniqueViolation(err)) throw duplicateSkuError(data.sku);
    throw err;
  }
}
