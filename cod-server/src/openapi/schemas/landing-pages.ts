/**
 * Landing Page Schemas
 *
 * The one-product marketing pages: image stack + COD form.
 */

import { z } from "@hono/zod-openapi";

export const LandingPageStatusEnum = z.enum(["draft", "published", "archived"]);

export const LandingPageStatsSchema = z
  .object({
    views: z.number().int().min(0).openapi({ example: 1240 }),
    orders: z.number().int().min(0).openapi({ example: 36 }),
    revenue: z.number().min(0).openapi({
      description: "Sum of attributed order prices in DZD",
      example: 180000,
    }),
  })
  .openapi("LandingPageStats");

export const LandingPageImageSchema = z
  .object({
    id: z.string().openapi({ example: "lpimg_abc123" }),
    landingPageId: z.string().openapi({ example: "lp_abc123" }),
    r2Key: z.string().openapi({
      description: "R2 object key under the landing/ namespace",
      example: "landing/abc123def456.jpg",
    }),
    src: z.string().openapi({
      description: "Public URL of the image",
      example: "https://media.codflow.store/landing/abc123.jpg",
    }),
    altText: z.string().nullable().openapi({
      description: "Alt text for accessibility",
      example: "Samsung A55 — عرض خاص",
    }),
    source: z.enum(["upload", "ai"]).openapi({
      description: "How the image entered the stack (AI generation is a future phase)",
      example: "upload",
    }),
    position: z.number().int().min(1).openapi({
      description: "Stack order (1 = top of the page)",
      example: 1,
    }),
    width: z.number().int().nullable().openapi({
      description: "Intrinsic pixel width — the storefront reserves this space to prevent layout shift; null on legacy rows",
      example: 1080,
    }),
    height: z.number().int().nullable().openapi({
      description: "Intrinsic pixel height — the storefront reserves this space to prevent layout shift; null on legacy rows",
      example: 1350,
    }),
    createdAt: z.string().datetime(),
  })
  .openapi("LandingPageImage");

const productRef = z
  .object({
    id: z.string().openapi({ example: "prod_abc123" }),
    name: z.string().openapi({ example: "Samsung Galaxy A55" }),
    handle: z.string().openapi({ example: "samsung-galaxy-a55" }),
    price: z.number().openapi({
      description: "Catalog price in DZD — the price the LP charges (no override)",
      example: 65000,
    }),
  })
  .nullable();

export const LandingPageSchema = z
  .object({
    id: z.string().openapi({ example: "lp_abc123" }),
    slug: z.string().openapi({
      description: "Public URL identifier — /lp/<slug>",
      example: "lp-9f3a2b1c",
    }),
    name: z.string().openapi({
      description: "Internal label, never rendered publicly",
      example: "Zinc v3 — carousel ad",
    }),
    productId: z.string().openapi({ example: "prod_abc123" }),
    status: LandingPageStatusEnum.openapi({
      description: "draft → published → archived. Only published pages resolve publicly.",
      example: "published",
    }),
    imageGap: z.number().int().min(0).max(200).openapi({
      description: "Pixels between stacked images — the only spacing setting",
      example: 0,
    }),
    metaTitle: z.string().nullable().openapi({ example: "Samsung A55 — عرض خاص" }),
    metaDescription: z.string().nullable().openapi({ example: "اطلب الآن — الدفع عند الاستلام" }),
    views: z.number().int().min(0).openapi({ example: 1240 }),
    publicUrl: z.string().openapi({
      description:
        "The shareable storefront URL (from the store's domain, or the deployment's storefront fallback; relative /lp/<slug> when neither is set)",
      example: "https://demo.codflow.store/lp/lp-9f3a2b1c",
    }),
    publishedAt: z.string().datetime().nullable().openapi({ example: null }),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    images: z.array(LandingPageImageSchema).openapi({
      description: "The image stack, ordered by position (1 = top)",
    }),
    product: productRef.openapi({
      description: "The single product this page sells",
    }),
    stats: LandingPageStatsSchema,
  })
  .openapi("LandingPage");

export const LandingPageListItemSchema = z
  .object({
    id: z.string().openapi({ example: "lp_abc123" }),
    slug: z.string().openapi({ example: "lp-9f3a2b1c" }),
    name: z.string().openapi({ example: "Zinc v3 — carousel ad" }),
    status: LandingPageStatusEnum,
    productId: z.string().openapi({ example: "prod_abc123" }),
    productName: z.string().nullable().openapi({ example: "Samsung Galaxy A55" }),
    productHandle: z.string().nullable().openapi({ example: "samsung-galaxy-a55" }),
    imageCount: z.number().int().min(0).openapi({ example: 7 }),
    views: z.number().int().min(0).openapi({ example: 1240 }),
    orders: z.number().int().min(0).openapi({ example: 36 }),
    revenue: z.number().min(0).openapi({ example: 180000 }),
    publicUrl: z.string().openapi({
      description: "The shareable storefront URL for this page",
      example: "https://demo.codflow.store/lp/lp-9f3a2b1c",
    }),
    publishedAt: z.string().datetime().nullable().openapi({ example: null }),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi("LandingPageListItem");
