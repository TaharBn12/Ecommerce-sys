import type { LandingPageListItem, LandingPageStatus } from "./types";

/**
 * The public landing page URL — the thing the merchant pastes into an ad set.
 *
 * Server-resolved (never the dashboard origin — that would send shoppers to
 * a sign-in wall): the API builds it from the store's own domain (Store
 * Settings) or the deployment's storefront fallback. The relative `/lp/<slug>`
 * here is the last resort when neither is configured.
 */
export function landingPagePublicUrl(page: { publicUrl?: string; slug: string }): string {
  return page.publicUrl ?? `/lp/${page.slug}`;
}

export type LandingPageRoute =
  | { kind: "list" }
  | { kind: "new" }
  | { kind: "studio"; id: string }
  | { kind: "compare" }
  | { kind: "unknown" };

export const LANDING_PAGE_STATUSES: LandingPageStatus[] = ["draft", "published", "archived"];

export function parseLandingPageStatus(value: string | undefined): LandingPageStatus | undefined {
  return LANDING_PAGE_STATUSES.includes(value as LandingPageStatus)
    ? (value as LandingPageStatus)
    : undefined;
}

export function parseLandingPageRoute(pathname: string): LandingPageRoute {
  const path = pathname.replace(/\/$/, "");
  if (path === "/landing-pages") return { kind: "list" };
  if (path === "/landing-pages/new") return { kind: "new" };
  if (path === "/landing-pages/compare") return { kind: "compare" };
  const studioMatch = /^\/landing-pages\/([^/]+)\/studio$/.exec(path);
  if (studioMatch) return { kind: "studio", id: studioMatch[1] };
  return { kind: "unknown" };
}

export interface LandingPageFilters {
  query: string;
  productId: string;
  status: LandingPageStatus | "all";
}

export function filterLandingPages(pages: LandingPageListItem[], filters: LandingPageFilters) {
  const q = filters.query.trim().toLocaleLowerCase();
  return pages.filter((page) => {
    if (filters.productId && page.productId !== filters.productId) return false;
    if (filters.status !== "all" && page.status !== filters.status) return false;
    if (q && `${page.name} ${page.slug} ${page.productName ?? ""}`.toLocaleLowerCase().indexOf(q) === -1) return false;
    return true;
  });
}

export function landingPageCvr(page: Pick<LandingPageListItem, "views" | "orders">): number | null {
  if (page.views === 0) return null; // undefined rate on zero views, not zero
  return (page.orders / page.views) * 100;
}

export function landingPageErrorMessage(cause: unknown, t: (key: string) => string) {
  const api =
    cause && typeof cause === "object" ? (cause as { code?: string; context?: Record<string, unknown> }) : null;
  const code = api?.code ?? "";
  const context = api?.context;

  if (code === "LANDING_PAGE_HAS_ORDERS")
    return t("error_delete_has_orders");
  if (code === "DUPLICATE_ENTITY") {
    const slug = typeof context?.slug === "string" ? context.slug : null;
    return slug ? t("error_duplicate_slug_named").replace("{slug}", slug) : t("error_duplicate_slug");
  }
  if (code === "PRODUCT_NOT_FOUND") return t("error_product_not_found");
  if (code === "VALIDATION_FAILED") return t("error_validation");
  if (typeof context?.requestId === "string") return t("error_unexpected_id").replace("{id}", context.requestId);
  return t("error_generic");
}
