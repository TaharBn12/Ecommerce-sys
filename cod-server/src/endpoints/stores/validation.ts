import { z } from "zod";

const hexColor = z.string().regex(/^#[0-9a-fA-F]{3,8}$/, "Invalid hex color");

export const updateStoreSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  logoUrl: z.string().url().nullable().optional(),
  /**
   * The storefront's custom domain (e.g. "demo.codflow.store"). Merchants
   * connect their own domain and set it here; landing page links and share
   * URLs are built from it. No scheme — https is always assumed. null clears
   * it (links fall back to the deployment's storefront URL or relative paths).
   */
  domain: z
    .string()
    .regex(/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/i, "Domain must be a hostname like store.example.com")
    .max(200)
    .nullable()
    .optional(),
  primaryColor: hexColor.optional(),
  accentColor: hexColor.optional(),
  bgColor: hexColor.optional(),
  fontFamily: z.string().min(1).max(200).optional(),
  fontUrl: z.string().url().nullable().optional(),
  lang: z.enum(["ar", "en"]).optional(),
  currencySymbol: z.string().min(1).max(10).optional(),
  contentJson: z.string().nullable().optional(),
  metaTitle: z.string().max(200).nullable().optional(),
  metaDescription: z.string().max(500).nullable().optional(),
  ogImage: z.string().url().nullable().optional(),
  announcementBar: z.string().max(500).nullable().optional(),
  reviewsEnabled: z.boolean().optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

export type UpdateStoreInput = z.infer<typeof updateStoreSchema>;
