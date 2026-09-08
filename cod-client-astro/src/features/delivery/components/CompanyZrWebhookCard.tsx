import { useMemo, useState } from "react";
import { ExternalLink, Radio, Trash2 } from "lucide-react";
import { Button, Field, Input } from "@/components/ui";
import { useT } from "@/i18n/react";
import { cn } from "@/lib/utils";
import { notify } from "@/lib/notify";
import {
  registerZrWebhook,
  saveZrStatusMapping,
  unregisterZrWebhook,
} from "@/features/delivery/api";
import type { DeliveryCompany } from "@/features/delivery/types";

/**
 * ZR Express webhook management — one-click register/unregister (the svix
 * signing secret is created and stored server-side automatically, unlike
 * Yalidine's manually-pasted secret) plus the custom state-name mapping
 * editor. ZR state names are free text — the mapping layer translates them
 * into our order statuses; unmapped names are logged, never guessed.
 */

/** Our statuses the backend accepts as mapping keys (webhook-handlers.ts). */
const MAPPABLE_STATUSES = [
  "delivered",
  "returned",
  "cancelled",
  "out_for_delivery",
  "assigned",
  "preparing",
  "new",
] as const;

/** Code-level defaults (zr-status-mapper.ts) — shown read-only as a hint. */
const CODE_DEFAULTS: Array<{ name: string; maps: string }> = [
  { name: "Out for Delivery", maps: "out_for_delivery" },
  { name: "In Transit", maps: "assigned" },
  { name: "At Hub", maps: "assigned" },
];

function parseMapping(json: string | null): Record<string, string[]> {
  if (!json) return {};
  try {
    const parsed = JSON.parse(json) as Record<string, unknown>;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
    const out: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (Array.isArray(value) && value.every((v) => typeof v === "string")) {
        out[key] = value;
      }
    }
    return out;
  } catch {
    return {};
  }
}

export function CompanyZrWebhookCard({
  company,
  canManage,
  onSaved,
}: {
  company: DeliveryCompany | null;
  canManage: boolean;
  onSaved: () => void | Promise<void>;
}) {
  const t = useT("delivery_companies");
  const registered = !!company?.webhookEndpointId;
  const [busy, setBusy] = useState<"register" | "unregister" | "mapping" | null>(null);
  const [mappingDraft, setMappingDraft] = useState<Record<string, string>>(() => {
    const stored = parseMapping(company?.webhookStatusMapping ?? null);
    const draft: Record<string, string> = {};
    for (const status of MAPPABLE_STATUSES) {
      const names = stored[status];
      if (names?.length) draft[status] = names.join(", ");
    }
    return draft;
  });

  // Reset the draft when the company record changes (e.g. after a reload).
  const mappingVersion = company?.webhookStatusMapping ?? "";
  const [lastVersion, setLastVersion] = useState(mappingVersion);
  if (mappingVersion !== lastVersion) {
    setLastVersion(mappingVersion);
    const stored = parseMapping(company?.webhookStatusMapping ?? null);
    const draft: Record<string, string> = {};
    for (const status of MAPPABLE_STATUSES) {
      const names = stored[status];
      if (names?.length) draft[status] = names.join(", ");
    }
    setMappingDraft(draft);
  }

  const hasDraftChanges = useMemo(() => {
    const stored = parseMapping(company?.webhookStatusMapping ?? null);
    for (const status of MAPPABLE_STATUSES) {
      const draftNames = (mappingDraft[status] ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const storedNames = stored[status] ?? [];
      if (JSON.stringify(draftNames) !== JSON.stringify(storedNames)) return true;
    }
    return false;
  }, [mappingDraft, company?.webhookStatusMapping]);

  async function register() {
    if (!company) return;
    setBusy("register");
    try {
      await registerZrWebhook(company.id);
      notify.flashSuccess(t("zr_webhook_registered"));
      await onSaved();
    } catch (cause) {
      notify.error(
        cause instanceof Error ? cause.message : t("zr_webhook_register_failed"),
      );
    } finally {
      setBusy(null);
    }
  }

  async function unregister() {
    if (!company) return;
    setBusy("unregister");
    try {
      await unregisterZrWebhook(company.id);
      notify.flashSuccess(t("zr_webhook_unregistered"));
      await onSaved();
    } catch (cause) {
      notify.error(
        cause instanceof Error ? cause.message : t("zr_webhook_unregister_failed"),
      );
    } finally {
      setBusy(null);
    }
  }

  async function saveMapping() {
    if (!company) return;
    setBusy("mapping");
    try {
      const mapping: Record<string, string[]> = {};
      for (const status of MAPPABLE_STATUSES) {
        const names = (mappingDraft[status] ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        if (names.length > 0) mapping[status] = names;
      }
      await saveZrStatusMapping(company.id, mapping);
      notify.flashSuccess(t("zr_mapping_saved"));
      await onSaved();
    } catch (cause) {
      notify.error(
        cause instanceof Error ? cause.message : t("zr_mapping_save_failed"),
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          <Radio size={14} className="text-primary/50" aria-hidden="true" />
          {t("zr_webhook_title")}
        </h2>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-[10px] font-bold",
            registered
              ? "bg-[var(--status-confirmed-bg)] text-[var(--status-confirmed-text)]"
              : "bg-muted text-muted-foreground",
          )}
        >
          {registered ? t("zr_webhook_status_registered") : t("zr_webhook_status_off")}
        </span>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-xs font-medium leading-relaxed text-muted-foreground">
            {registered ? t("zr_webhook_registered_hint") : t("zr_webhook_off_hint")}
          </p>
          {canManage && (
            <div className="flex shrink-0 gap-2">
              {registered ? (
                <Button
                  type="button"
                  variant="dangerOutline"
                  onClick={() => void unregister()}
                  disabled={busy !== null}
                >
                  <Trash2 size={13} />
                  {busy === "unregister" ? t("saving") : t("zr_webhook_unregister")}
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={() => void register()}
                  disabled={busy !== null || !company?.isConnected}
                >
                  {busy === "register" ? t("saving") : t("zr_webhook_register")}
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            {t("zr_mapping_title")}
          </p>
          <p className="text-xs font-medium leading-relaxed text-muted-foreground/70">
            {t("zr_mapping_hint")}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {CODE_DEFAULTS.map((d) => (
              <span
                key={d.name}
                className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold text-muted-foreground"
              >
                {d.name} → {d.maps}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {MAPPABLE_STATUSES.map((status) => (
            <Field key={status} label={t(`zr_status_${status}`)}>
              <Input
                value={mappingDraft[status] ?? ""}
                onChange={(event) =>
                  setMappingDraft((prev) => ({ ...prev, [status]: event.currentTarget.value }))
                }
                placeholder={t("zr_mapping_placeholder")}
                disabled={!canManage}
              />
            </Field>
          ))}
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={() => void saveMapping()}
            disabled={!canManage || !company || busy !== null || !hasDraftChanges}
          >
            {busy === "mapping" ? t("saving") : t("zr_mapping_save")}
          </Button>
        </div>

        <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground/70">
          <ExternalLink size={12} aria-hidden="true" className="shrink-0" />
          {t("webhook_events_hint")}
        </p>
      </div>
    </div>
  );
}
