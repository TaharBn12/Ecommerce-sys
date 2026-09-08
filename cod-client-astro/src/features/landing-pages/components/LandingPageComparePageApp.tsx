import { useEffect, useState } from "react";
import { AlertCircle, Scale, Trophy } from "lucide-react";
import { canScope, RequireAuth, useIdentity } from "@/features/auth/components/RequireAuth";
import { DashboardChrome } from "@/components/layout/chrome";
import { Alert, Card, LinkButton, PageHeader, Select, Skeleton } from "@/components/ui";
import { useLocale, useT } from "@/i18n/react";
import { SCOPES } from "../../../../../cod-shared/rbac/scopes";
import { compareLandingPages } from "@/features/landing-pages/api";
import { listProducts } from "@/features/products/api";
import { formatMoneyValue } from "@/features/products/model";
import { landingPageCvr, landingPageErrorMessage } from "@/features/landing-pages/model";
import type { Product } from "@/features/products/types";
import type { LandingPageListItem } from "@/features/landing-pages/types";
import { Badge } from "@/components/ui";

function Gated() {
  const t = useT("landing-pages");
  const common = useT("common");
  const auth = useT("auth");
  const locale = useLocale();
  const identity = useIdentity();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [productId, setProductId] = useState("");
  const [pages, setPages] = useState<LandingPageListItem[] | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);

  const canRead = canScope(identity, SCOPES.LANDING_PAGES_READ);

  useEffect(() => {
    if (!canRead) return;
    void (async () => {
      try {
        setProducts((await listProducts({ limit: 100 })).data);
      } catch (cause) {
        setLoadError(cause);
      }
    })();
  }, [canRead]);

  useEffect(() => {
    if (!productId) {
      setPages(null);
      return;
    }
    void (async () => {
      setPages(null);
      setLoadError(null);
      try {
        setPages(await compareLandingPages(productId));
      } catch (cause) {
        setLoadError(cause);
      }
    })();
  }, [productId]);

  if (!canRead)
    return (
      <Alert role="alert" tone="critical">
        {auth("no_access")}
      </Alert>
    );

  const winner =
    pages && pages.length > 1
      ? pages.reduce((best, page) => (page.orders > best.orders ? page : best), pages[0])
      : null;

  return (
    <div className="space-y-4">
      {loadError ? (
        <Alert role="alert" tone="critical">
          <AlertCircle size={18} className="shrink-0" />
          <span className="flex-1">{landingPageErrorMessage(loadError, t)}</span>
        </Alert>
      ) : null}

      <Card className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
        <Select
          aria-label={t("list.product")}
          value={productId}
          onChange={(event) => setProductId(event.currentTarget.value)}
          wrapperClassName="sm:w-72"
        >
          <option value="">{t("filter_all_products")}</option>
          {(products ?? []).map((product) => (
            <option key={product.id} value={product.id}>
              {product.name}
            </option>
          ))}
        </Select>
      </Card>

      {productId === "" ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-16 text-muted-foreground">
          <Scale size={28} />
          <p className="text-sm font-semibold">{t("compare_title")}</p>
        </div>
      ) : pages === null ? (
        <div role="status" aria-busy="true" className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="h-14 border-b border-border bg-muted/35" />
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-16 border-b border-border px-4 last:border-0">
              <Skeleton className="mt-6 h-3 w-40" />
            </div>
          ))}
        </div>
      ) : pages.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-16 text-muted-foreground">
          <p className="text-sm font-semibold">{t("list.empty")}</p>
          <LinkButton href="/landing-pages/new">{t("create_landing_page")}</LinkButton>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="h-14 border-b border-border bg-muted/35 text-xs font-bold text-muted-foreground">
                <th className="px-4 text-start">{t("list.name")}</th>
                <th className="px-4 text-center">{t("list.status")}</th>
                <th className="px-4 text-center">{t("list.views")}</th>
                <th className="px-4 text-center">{t("list.orders")}</th>
                <th className="px-4 text-center">{t("list.cvr")}</th>
                <th className="px-4 text-end">{t("list.revenue")}</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((page) => {
                const cvr = landingPageCvr(page);
                const isWinner = winner?.id === page.id && page.orders > 0;
                return (
                  <tr key={page.id} className="h-16 border-b border-border last:border-0">
                    <td className="px-4">
                      <LinkButton
                        href={`/landing-pages/${encodeURIComponent(page.id)}/studio`}
                        variant="ghost"
                        className="h-auto p-0 text-start font-semibold"
                      >
                        {page.name}
                      </LinkButton>
                      <span className="mt-0.5 block font-mono text-[0.7rem] text-muted-foreground">
                        /lp/{page.slug}
                      </span>
                    </td>
                    <td className="px-4 text-center">
                      <Badge tone={page.status === "published" ? "success" : "warning"}>
                        {page.status === "published" ? t("status_published") : t("status_draft")}
                      </Badge>
                    </td>
                    <td className="px-4 text-center tabular-nums">{page.views.toLocaleString()}</td>
                    <td className="px-4 text-center tabular-nums">
                      {page.orders.toLocaleString()}
                      {isWinner && <Trophy size={14} className="ms-1 inline text-amber-500" />}
                    </td>
                    <td className="px-4 text-center tabular-nums">
                      {cvr === null ? "—" : `${cvr.toFixed(1)}%`}
                    </td>
                    <td className="px-4 text-end tabular-nums">
                      {formatMoneyValue(page.revenue, locale)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function LandingPageComparePageApp() {
  const t = useT("landing-pages");
  return (
    <RequireAuth>
      <DashboardChrome currentPath="/landing-pages">
        <PageHeader
          title={t("compare_title")}
          subtitle={t("page_subtitle")}
          backHref="/landing-pages"
          backLabel={t("page_title")}
        />
        <Gated />
      </DashboardChrome>
    </RequireAuth>
  );
}
