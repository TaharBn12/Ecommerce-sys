/**
 * Re-exported from cod-shared/queries/landing-pages so the dashboard can
 * consume the same read functions directly from D1.
 *
 * createLandingPage/updateLandingPage wrappers stay here because they raise
 * BusinessLogicError / ConflictError: product existence, slug uniqueness,
 * and the delete-with-orders guard turn raw DB crashes into friendly errors.
 */
import { eq } from "drizzle-orm";
import { products } from "@/db/schema";
import type { AppDb } from "@/db";
import { BusinessLogicError, ConflictError, NotFoundError, ValidationError } from "@/lib/errors/classes";
import { ERROR_CODES } from "../../../../cod-shared/errors/codes";
import * as shared from "../../../../cod-shared/queries/landing-pages";

export * from "../../../../cod-shared/queries/landing-pages";

type CreateLandingPageData = Parameters<typeof shared.createLandingPage>[1];
type UpdateLandingPageData = Parameters<typeof shared.updateLandingPage>[2];

function isLpUniqueViolation(err: unknown): boolean {
  return (
    err instanceof Error &&
    /UNIQUE constraint failed: landing_pages\.slug/i.test(err.message)
  );
}

export async function createLandingPage(db: AppDb, data: CreateLandingPageData) {
  // The product must exist — a landing page without its product is unusable.
  const product = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.id, data.productId))
    .get();
  if (!product) {
    throw new NotFoundError("Product", data.productId);
  }

  // Slug uniqueness is a friendly 409, not a raw constraint crash.
  if (data.slug && (await shared.slugExists(db, data.slug))) {
    throw new ConflictError(
      `Slug "${data.slug}" is already used by another landing page`,
      ERROR_CODES.DUPLICATE_ENTITY,
      { slug: data.slug },
    );
  }

  try {
    return await shared.createLandingPage(db, data);
  } catch (err) {
    // Race: a concurrent writer took the slug between check and insert.
    if (isLpUniqueViolation(err)) {
      throw new ConflictError(
        `Slug "${data.slug}" is already used by another landing page`,
        ERROR_CODES.DUPLICATE_ENTITY,
        { slug: data.slug },
      );
    }
    throw err;
  }
}

export async function updateLandingPage(
  db: AppDb,
  id: string,
  data: UpdateLandingPageData,
) {
  const existing = await shared.getLandingPageById(db, id);
  if (!existing) throw new NotFoundError("Landing Page", id);

  if (data.slug && data.slug !== existing.slug) {
    if (await shared.slugExists(db, data.slug)) {
      throw new ConflictError(
        `Slug "${data.slug}" is already used by another landing page`,
        ERROR_CODES.DUPLICATE_ENTITY,
        { slug: data.slug },
      );
    }
  }

  try {
    await shared.updateLandingPage(db, id, data);
  } catch (err) {
    if (data.slug && isLpUniqueViolation(err)) {
      throw new ConflictError(
        `Slug "${data.slug}" is already used by another landing page`,
        ERROR_CODES.DUPLICATE_ENTITY,
        { slug: data.slug },
      );
    }
    throw err;
  }
}

export async function deleteLandingPageWithGuard(db: AppDb, id: string) {
  const existing = await shared.getLandingPageById(db, id);
  if (!existing) throw new NotFoundError("Landing Page", id);

  const orderCount = await shared.countLandingPageOrders(db, id);
  if (orderCount > 0) {
    throw new BusinessLogicError(
      "Cannot delete a landing page with attributed orders — archive it instead so history stays intact",
      ERROR_CODES.LANDING_PAGE_HAS_ORDERS,
      { landingPageId: id, orderCount },
    );
  }

  await shared.deleteLandingPage(db, id);
}

export async function reorderLandingPageImagesChecked(
  db: AppDb,
  landingPageId: string,
  imageIds: string[],
) {
  const existing = await shared.getLandingPageImages(db, landingPageId);
  const existingIds = new Set(existing.map((img) => img.id));

  if (new Set(imageIds).size !== imageIds.length) {
    throw new ValidationError(
      "imageIds must not contain duplicates",
      ERROR_CODES.VALIDATION_FAILED,
      { received: imageIds.length },
    );
  }
  for (const imageId of imageIds) {
    if (!existingIds.has(imageId)) {
      throw new ValidationError(
        `Image ${imageId} does not belong to landing page ${landingPageId}`,
        ERROR_CODES.VALIDATION_FAILED,
        { imageId, landingPageId },
      );
    }
  }
  if (imageIds.length !== existing.length) {
    throw new ValidationError(
      "imageIds must include all images for this landing page",
      ERROR_CODES.VALIDATION_FAILED,
      { expected: existing.length, received: imageIds.length },
    );
  }

  return shared.reorderLandingPageImages(db, landingPageId, imageIds);
}
