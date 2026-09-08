export interface LandingPageImage {
  id: string;
  landingPageId: string;
  r2Key: string;
  src: string;
  altText: string | null;
  source: "upload" | "ai";
  position: number;
  width: number | null;
  height: number | null;
  createdAt: string;
}

export type LandingPageStatus = "draft" | "published" | "archived";

export interface LandingPageStats {
  views: number;
  orders: number;
  revenue: number;
}

export interface LandingPageProductRef {
  id: string;
  name: string;
  handle: string;
  price: number;
}

export interface LandingPage {
  id: string;
  slug: string;
  name: string;
  productId: string;
  status: LandingPageStatus;
  imageGap: number;
  metaTitle: string | null;
  metaDescription: string | null;
  views: number;
  /** Server-resolved shareable URL (store domain or deployment fallback). */
  publicUrl: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  images: LandingPageImage[];
  product: LandingPageProductRef | null;
  stats: LandingPageStats;
}

export interface LandingPageListItem {
  id: string;
  slug: string;
  name: string;
  status: "draft" | "published" | "archived";
  productId: string;
  productName: string | null;
  productHandle: string | null;
  imageCount: number;
  views: number;
  orders: number;
  revenue: number;
  publicUrl: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLandingPageInput {
  name: string;
  slug?: string;
  productId: string;
}

export interface UpdateLandingPageInput {
  name?: string;
  slug?: string;
  imageGap?: number;
  metaTitle?: string | null;
  metaDescription?: string | null;
}

export interface SaveLandingPageImageInput {
  key: string;
  src: string;
  altText?: string | null;
  /** Intrinsic pixel size, measured in the browser before upload — the
   *  storefront renders width/height from these so the page doesn't shift
   *  while images load. Omitted when measurement fails (fail-open). */
  width?: number;
  height?: number;
}
