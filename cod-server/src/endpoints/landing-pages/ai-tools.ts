import { tool } from "ai";
import { z } from "zod";
import * as queries from "./queries";
import { createLandingPageSchema, updateLandingPageSchema } from "./validation";
import { getDb } from "@/db";
import {
  buildLandingPagePublicUrl,
  resolveStorefrontBaseUrl,
} from "../../../../cod-shared/queries/landing-pages";

/**
 * Layer-2 validation schemas, hoisted to module level and exported so the MCP
 * layer (src/mcp/schemas.ts) can derive tools/list inputSchema from the exact
 * same definitions — the advertised schema and the executed validation cannot
 * drift apart.
 */
export const listLandingPagesSchema = z.object({
  productId: z.string().optional().describe("Filter by product UUID"),
  status: z.enum(["draft", "published", "archived"]).optional().describe("Filter by lifecycle status"),
});
export const getLandingPageDetailsSchema = z.object({
  landingPageId: z.string().uuid().describe("The UUID of the landing page to retrieve"),
});
export const getLandingPageStatsSchema = z.object({
  landingPageId: z.string().uuid().describe("The UUID of the landing page to get stats for"),
});
export const createLandingPageToolSchema = createLandingPageSchema;
export const updateLandingPageToolSchema = z.object({
  landingPageId: z.string().uuid().describe("The UUID of the landing page to update"),
  updates: updateLandingPageSchema,
});
export const publishLandingPageSchema = z.object({
  landingPageId: z.string().uuid().describe("The UUID of the landing page to publish"),
});
export const deleteLandingPageSchema = z.object({
  landingPageId: z.string().uuid().describe("The UUID of the landing page to delete"),
});

export const LANDING_PAGE_TOOL_SCHEMAS: Record<string, z.ZodRawShape> = {
  listLandingPages: listLandingPagesSchema.shape,
  getLandingPageDetails: getLandingPageDetailsSchema.shape,
  getLandingPageStats: getLandingPageStatsSchema.shape,
  createLandingPage: createLandingPageToolSchema.shape,
  updateLandingPage: updateLandingPageToolSchema.shape,
  publishLandingPage: publishLandingPageSchema.shape,
  deleteLandingPage: deleteLandingPageSchema.shape,
};

/**
 * AI Tools for Landing Pages
 *
 * Landing pages are one-product marketing pages: an ordered image stack with
 * the COD order form at the bottom. Merchants create several per product, run
 * ads to each, and compare which converts. The charged price is always the
 * product's catalog price — the price story lives in the images.
 *
 * Two-Layer Validation Pattern:
 * - Layer 1 (LLM-level): Permissive input schema accepts any object to prevent SDK crashes
 * - Layer 2 (App-level): Strict validation inside execute() with graceful error handling
 */
export const getLandingPageTools = (db: ReturnType<typeof getDb>) => ({

  listLandingPages: tool({
    description:
      "List landing pages (newest first) with per-page stats: views, attributed orders, revenue. " +
      "Optionally filter by product or lifecycle status (draft | published | archived). " +
      "Each row includes the public slug — the link the merchant pastes into ad sets is /lp/<slug>.",
    inputSchema: z.object({}).passthrough(), // Layer 1: Permissive input
    execute: async (args) => {
      try {
        const validationSchema = listLandingPagesSchema;
        const parsed = validationSchema.safeParse(args ?? {});
        if (!parsed.success) {
          const errorDetails = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
          return { success: false, error: `Invalid filter arguments: ${errorDetails}. Expected: productId (UUID, optional), status (draft|published|archived, optional)` };
        }

        const pages = await queries.listLandingPages(db, {
          ...(parsed.data.productId ? { productId: parsed.data.productId } : {}),
          ...(parsed.data.status ? { status: parsed.data.status } : {}),
        });
        const baseUrl = await resolveStorefrontBaseUrl(db);
        return {
          success: true,
          count: pages.length,
          landingPages: pages.map((p) => ({
            id: p.id,
            slug: p.slug,
            name: p.name,
            status: p.status,
            productId: p.productId,
            productName: p.productName,
            imageCount: p.imageCount,
            views: p.views,
            orders: p.orders,
            revenue: p.revenue,
            publicPath: `/lp/${p.slug}`,
            publicUrl: buildLandingPagePublicUrl(baseUrl, p.slug),
          })),
        };
      } catch (error) {
        return { success: false, error: `Failed to list landing pages: ${(error as Error).message}` };
      }
    },
  }),

  getLandingPageDetails: tool({
    description:
      "Get full landing page details by ID: settings, the ordered image stack, the linked product, and stats. " +
      "Use this to inspect a page's creatives and spacing before editing.",
    inputSchema: z.object({}).passthrough(), // Layer 1: Permissive input
    execute: async (args) => {
      try {
        const parsed = getLandingPageDetailsSchema.safeParse(args ?? {});
        if (!parsed.success) {
          return { success: false, error: "Invalid arguments. Expected: landingPageId (UUID)" };
        }

        const lp = await queries.getLandingPageById(db, parsed.data.landingPageId);
        if (!lp) {
          return { success: false, error: `Landing page ${parsed.data.landingPageId} not found` };
        }
        return { success: true, landingPage: lp };
      } catch (error) {
        return { success: false, error: `Failed to get landing page: ${(error as Error).message}` };
      }
    },
  }),

  getLandingPageStats: tool({
    description:
      "Get a landing page's performance stats: views, attributed orders, and revenue. " +
      "Conversion rate = orders / views (compute it yourself; zero views means the rate is undefined).",
    inputSchema: z.object({}).passthrough(), // Layer 1: Permissive input
    execute: async (args) => {
      try {
        const parsed = getLandingPageStatsSchema.safeParse(args ?? {});
        if (!parsed.success) {
          return { success: false, error: "Invalid arguments. Expected: landingPageId (UUID)" };
        }

        const stats = await queries.getLandingPageStats(db, parsed.data.landingPageId);
        if (!stats) {
          return { success: false, error: `Landing page ${parsed.data.landingPageId} not found` };
        }
        return { success: true, stats };
      } catch (error) {
        return { success: false, error: `Failed to get stats: ${(error as Error).message}` };
      }
    },
  }),

  createLandingPage: tool({
    description:
      "Create a draft landing page for a product. The slug defaults to lp-<8 chars> and is editable later. " +
      "After creation, add images via the dashboard Studio (POST /api/landing-pages/{id}/images) or updateLandingPage. " +
      "The page charges the product's catalog price — there is no price override; the price story lives in the images.",
    inputSchema: z.object({}).passthrough(), // Layer 1: Permissive input
    execute: async (args) => {
      try {
        const parsed = createLandingPageToolSchema.safeParse(args ?? {});
        if (!parsed.success) {
          const errorDetails = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
          return { success: false, error: `Invalid arguments: ${errorDetails}. Expected: name (2-200 chars), productId (UUID), optional slug ([a-z0-9-]{3,60})` };
        }

        const { id, slug } = await queries.createLandingPage(db, parsed.data);
        const lp = await queries.getLandingPageById(db, id);
        const baseUrl = await resolveStorefrontBaseUrl(db);
        return {
          success: true,
          landingPage: lp,
          publicPath: `/lp/${slug}`,
          publicUrl: buildLandingPagePublicUrl(baseUrl, slug),
          note: "Draft created. Add images, then publishLandingPage to make the link live.",
        };
      } catch (error) {
        return { success: false, error: `Failed to create landing page: ${(error as Error).message}` };
      }
    },
  }),

  updateLandingPage: tool({
    description:
      "Partially update a landing page: name, slug, image gap (imageGap, pixels 0-200), or SEO meta. " +
      "A taken slug is rejected. Image stack changes go through the image endpoints, not this tool.",
    inputSchema: z.object({}).passthrough(), // Layer 1: Permissive input
    execute: async (args) => {
      try {
        const parsed = updateLandingPageToolSchema.safeParse(args ?? {});
        if (!parsed.success) {
          const errorDetails = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
          return { success: false, error: `Invalid arguments: ${errorDetails}. Expected: landingPageId (UUID) and updates { name?, slug?, imageGap?, metaTitle?, metaDescription? }` };
        }

        await queries.updateLandingPage(db, parsed.data.landingPageId, parsed.data.updates);
        const lp = await queries.getLandingPageById(db, parsed.data.landingPageId);
        return { success: true, landingPage: lp };
      } catch (error) {
        return { success: false, error: `Failed to update landing page: ${(error as Error).message}` };
      }
    },
  }),

  publishLandingPage: tool({
    description:
      "Publish a landing page — its link /lp/<slug> goes live and starts counting views. " +
      "Unpublishing returns it to draft via the dashboard (the link stops resolving but history stays).",
    inputSchema: z.object({}).passthrough(), // Layer 1: Permissive input
    execute: async (args) => {
      try {
        const parsed = publishLandingPageSchema.safeParse(args ?? {});
        if (!parsed.success) {
          return { success: false, error: "Invalid arguments. Expected: landingPageId (UUID)" };
        }

        await queries.publishLandingPage(db, parsed.data.landingPageId);
        const lp = await queries.getLandingPageById(db, parsed.data.landingPageId);
        const baseUrl = await resolveStorefrontBaseUrl(db);
        return {
          success: true,
          landingPage: lp,
          publicPath: `/lp/${lp?.slug ?? ""}`,
          publicUrl: lp ? buildLandingPagePublicUrl(baseUrl, lp.slug) : null,
        };
      } catch (error) {
        return { success: false, error: `Failed to publish: ${(error as Error).message}` };
      }
    },
  }),

  deleteLandingPage: tool({
    description:
      "Permanently delete a landing page with NO attributed orders. " +
      "Refused (LANDING_PAGE_HAS_ORDERS) when any order references the page — archive via the dashboard instead so attribution history stays intact. " +
      "This action is immediate and irreversible.",
    inputSchema: z.object({}).passthrough(), // Layer 1: Permissive input
    execute: async (args) => {
      try {
        const parsed = deleteLandingPageSchema.safeParse(args ?? {});
        if (!parsed.success) {
          return { success: false, error: "Invalid arguments. Expected: landingPageId (UUID)" };
        }

        const stats = await queries.getLandingPageStats(db, parsed.data.landingPageId);
        if (!stats) {
          return { success: false, error: `Landing page ${parsed.data.landingPageId} not found` };
        }
        if (stats.orders > 0) {
          return {
            success: false,
            error: `Landing page has ${stats.orders} attributed order(s) — delete is refused. Archive it from the dashboard instead.`,
          };
        }

        await queries.deleteLandingPageWithGuard(db, parsed.data.landingPageId);
        return { success: true, message: "Landing page deleted" };
      } catch (error) {
        return { success: false, error: `Failed to delete landing page: ${(error as Error).message}` };
      }
    },
  }),
});
