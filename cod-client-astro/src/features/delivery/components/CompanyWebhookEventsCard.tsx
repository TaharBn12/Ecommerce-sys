import { useEffect, useState } from "react";
import { Inbox, Webhook } from "lucide-react";
import { Badge, Button, Select } from "@/components/ui";
import { useT } from "@/i18n/react";
import { useLocale } from "@/i18n/react";
import { notify } from "@/lib/notify";
import {
  listCompanyWebhookEvents,
  type WebhookEventRow,
} from "@/features/delivery/api";
import type { DeliveryCompany } from "@/features/delivery/types";

/**
 * Inbound webhook event log — the "real info" surface for webhook-capable
 * carriers. Every delivery lands in webhook_events with its outcome; this
 * panel surfaces outcomes, not bytes: result badge, the order it moved (or
 * why it didn't), and the carrier's own reason string. Unmapped rows are
 * the actionable ones — new carrier statuses appear here first.
 */

const RESULT_TONE: Record<WebhookEventRow["result"], "success" | "neutral" | "warning" | "critical" | "info"> = {
  ok: "success",
  ignored: "neutral",
  unmapped: "warning",
  error: "critical",
  pending: "info",
};

const PAGE_SIZE = 25;

function formatTime(iso: string, locale: string): string {
  const d = new Date(iso);
  return d.toLocaleString(locale, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function CompanyWebhookEventsCard({ company }: { company: DeliveryCompany | null }) {
  const t = useT("delivery_companies");
  const locale = useLocale();
  const [events, setEvents] = useState<WebhookEventRow[]>([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<"" | WebhookEventRow["result"]>("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    if (!company) return;
    let alive = true;
    setLoading(true);
    listCompanyWebhookEvents(company.id, { limit: PAGE_SIZE, ...(filter ? { result: filter } : {}) })
      .then((page) => {
        if (!alive) return;
        setEvents(page.events);
        setTotal(page.total);
      })
      .catch(() => {
        if (alive) notify.error(t("events_load_failed"));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [company?.id, filter, t]);

  async function loadMore() {
    if (!company) return;
    setLoadingMore(true);
    try {
      const page = await listCompanyWebhookEvents(company.id, {
        limit: PAGE_SIZE,
        offset: events.length,
        ...(filter ? { result: filter } : {}),
      });
      setEvents((prev) => [...prev, ...page.events]);
      setTotal(page.total);
    } catch {
      notify.error(t("events_load_failed"));
    } finally {
      setLoadingMore(false);
    }
  }

  if (!company) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          <Webhook size={14} className="text-primary/50" aria-hidden="true" />
          {t("events_title")}
        </h2>
        <div className="w-44">
          <Select
            value={filter}
            onChange={(event) => {
              setFilter(event.currentTarget.value as "" | WebhookEventRow["result"]);
            }}
            aria-label={t("events_filter_label")}
          >
            <option value="">{t("events_filter_all")}</option>
            <option value="ok">{t("events_filter_ok")}</option>
            <option value="ignored">{t("events_filter_ignored")}</option>
            <option value="unmapped">{t("events_filter_unmapped")}</option>
            <option value="error">{t("events_filter_error")}</option>
          </Select>
        </div>
      </div>

      {loading ? (
        <p role="status" className="py-8 text-center text-sm font-medium text-muted-foreground">
          {t("events_loading")}
        </p>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <Inbox size={22} className="text-muted-foreground/40" aria-hidden="true" />
          <p className="text-sm font-semibold text-foreground">
            {filter ? t("events_empty_filtered") : t("events_empty")}
          </p>
          {!filter && (
            <p className="max-w-sm text-xs font-medium leading-relaxed text-muted-foreground/70">
              {t("events_empty_hint")}
            </p>
          )}
        </div>
      ) : (
        <>
          <ul className="divide-y divide-border">
            {events.map((event) => (
              <li key={event.id} className="flex items-start gap-3 py-3">
                <Badge tone={RESULT_TONE[event.result]} size="sm" className="mt-0.5 shrink-0">
                  {t(`events_result_${event.result}`)}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm font-semibold text-foreground">
                    {event.orderNumber ? (
                      <a
                        href={`/orders/${event.orderId}`}
                        className="text-link hover:underline"
                      >
                        {event.orderNumber}
                      </a>
                    ) : (
                      <span className="font-mono text-xs text-muted-foreground">
                        {event.tracking ?? "—"}
                      </span>
                    )}
                    {event.newStatus && (
                      <span className="text-xs font-medium text-muted-foreground">
                        → {t(`zr_status_${event.newStatus}`)}
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 truncate text-xs font-medium text-muted-foreground/70">
                    {formatTime(event.createdAt, locale)} · {event.eventType}
                    {event.reason ? ` · ${event.reason}` : ""}
                    {event.errorMsg ? ` · ${event.errorMsg}` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          {events.length < total && (
            <Button
              type="button"
              variant="secondary"
              className="mt-4 w-full"
              onClick={() => void loadMore()}
              disabled={loadingMore}
            >
              {loadingMore ? t("events_loading") : t("events_load_more")}
            </Button>
          )}
          <p className="mt-2 text-center text-[10px] font-semibold text-muted-foreground/50">
            {`${events.length} / ${total}`}
          </p>
        </>
      )}
    </div>
  );
}
