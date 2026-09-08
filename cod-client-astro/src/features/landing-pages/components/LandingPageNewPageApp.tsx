import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Search } from "lucide-react";
import { canScope, RequireAuth, useIdentity } from "@/features/auth/components/RequireAuth";
import { DashboardChrome } from "@/components/layout/chrome";
import { Alert, PageHeader, Skeleton } from "@/components/ui";
import { useLocale, useT } from "@/i18n/react";
import { SCOPES } from "../../../../../cod-shared/rbac/scopes";
import { listProducts } from "@/features/products/api";
import { formatMoneyValue } from "@/features/products/model";
import type { Product } from "@/features/products/types";
import { createLandingPage } from "@/features/landing-pages/api";
import { landingPageErrorMessage } from "@/features/landing-pages/model";
import { notify } from "@/lib/notify";

function Gated() {
  const t = useT("landing-pages");
  const common = useT("common");
  const locale = useLocale();
  const auth = useT("auth");
  const identity = useIdentity();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [query, setQuery] = useState("");
  const [creatingId, setCreatingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const canManage = canScope(identity, SCOPES.LANDING_PAGES_MANAGE);

  async function load() {
    setLoadError(null);
    try {
      setProducts((await listProducts({ limit: 100 })).data);
    } catch (cause) {
      setLoadError(cause);
    }
  }

  useEffect(() => {
    if (canScope(identity, SCOPES.LANDING_PAGES_READ)) void load();
  }, [identity?.role, identity?.scopes.join(",")]);

  if (!canManage)
    return (
      <Alert role="alert" tone="critical">
        {auth("no_access")}
      </Alert>
    );

  if (loadError)
    return (
      <Alert role="alert" tone="critical">
        <ArrowLeft size={18} className="shrink-0" />
        <div className="flex-1">
          <p className="font-semibold">{t("error_generic")}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-3 text-xs font-semibold underline underline-offset-4"
          >
            {common("retry")}
          </button>
        </div>
      </Alert>
    );

  async function onPick(product: Product) {
    if (creatingId) return;
    setCreatingId(product.id);
    setActionError(null);
    try {
      const created = await createLandingPage({
        name: product.name,
        productId: product.id,
      });
      window.location.assign(
        `/landing-pages/${encodeURIComponent(created.data.id)}/studio`,
      );
    } catch (cause) {
      const message = landingPageErrorMessage(cause, t);
      setActionError(message);
      notify.error(message);
      setCreatingId(null);
    }
  }

  const q = query.trim().toLocaleLowerCase();
  const visible = (products ?? []).filter(
    (product) =>
      !q ||
      `${product.name} ${product.sku ?? ""}`.toLocaleLowerCase().indexOf(q) !== -1,
  );

  return (
    <div className="space-y-4">
      {actionError && (
        <Alert role="alert" tone="critical">
          <span className="flex-1">{actionError}</span>
        </Alert>
      )}
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder={t("new.search_placeholder")}
          className="h-10 w-full rounded-xl border border-border bg-background ps-9 pe-3 text-sm"
        />
      </div>
      {products === null ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{t("new.empty")}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {visible.map((product) => (
            <button
              key={product.id}
              type="button"
              disabled={creatingId !== null}
              onClick={() => void onPick(product)}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-start transition hover:border-brand/40 disabled:opacity-60"
            >
              {product.images?.[0]?.src ? (
                <img
                  src={product.images[0].src}
                  alt={product.name}
                  className="size-14 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <span className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground">
                  —
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{product.name}</span>
                <span className="mt-0.5 block text-sm tabular-nums text-muted-foreground">
                  {formatMoneyValue(product.price, locale)}
                </span>
              </span>
              {creatingId === product.id ? (
                <Loader2 size={18} className="me-2 animate-spin text-brand" />
              ) : (
                <span className="me-2 text-xs font-bold text-brand">{t("new.pick")}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function LandingPageNewPageApp() {
  const t = useT("landing-pages");
  return (
    <RequireAuth>
      <DashboardChrome currentPath="/landing-pages">
        <PageHeader
          title={t("new.title")}
          subtitle={t("new.subtitle")}
          backHref="/landing-pages"
          backLabel={t("page_title")}
        />
        <Gated />
      </DashboardChrome>
    </RequireAuth>
  );
}
