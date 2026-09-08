/**
 * Yalidine Status Mapper
 *
 * Yalidine status strings are a system-wide fixed French enum — NOT
 * configurable per customer. They appear in the 'data.status' field of
 * parcel_status_updated events.
 *
 * Source of truth (verified 2026-09-07):
 *   [*] Official REST docs (offcial-docs.md) — full 34-status enum
 *   [L] Observed LIVE on the real account: 272 history events across 20
 *       parcels, 16 distinct statuses, incl. the complete return flow
 *       `Echèc livraison → Retourné au centre ⇄ Retour vers centre →
 *       Retour à retirer → Retourné au vendeur` (3/3 returned parcels).
 *
 * Semantics:
 *   - Terminal → our terminal order status (delivered / returned / cancelled)
 *   - "Sorti en livraison" → out_for_delivery
 *   - "Tentative échouée" → order stays out_for_delivery; increments
 *     orders.deliveryAttempts; the 'reason' (e.g. "Client ne répond pas",
 *     live-observed) is stored in the webhook event log
 *   - Everything else is TRANSIT (parcel in courier's hands) → no-op:
 *     result 'ignored' with the status as the log reason. These must NEVER
 *     move an order backward — the old map's "Ramassé"→assigned and
 *     "En préparation"→preparing did exactly that (a dispatched order
 *     receiving "En préparation" regressed to preparing).
 *   - Return-TRANSIT states ("Retour vers centre", "Retour à retirer", …)
 *     are no-ops deliberately: "Retour à retirer" can still end in "Livré"
 *     (client retrieves at the desk), so only the definitive outcomes map.
 *   - "Echèc livraison" maps to returned: live-observed as always-final
 *     (delivery definitively failed, parcel heads back).
 *   - "En alerte" is a no-op but carries a reason (Téléphone injoignable,
 *     etc. — live-observed) worth surfacing in the event log.
 *
 * A string NOT in this map → unknown: caller logs result='unmapped' and
 * does NOT change the order status (never guess).
 */

export interface YalidineStatusMapping {
  /** Target order status — null = no status change (transit/no-op or unknown). */
  status: string | null;
  /** True for "Tentative échouée": increment deliveryAttempts, keep status. */
  incrementAttempts: boolean;
  /** True = the string is a KNOWN transit status (deliberate no-op).
   *  False + status null = unknown string → caller logs 'unmapped'. */
  noop: boolean;
}

const MAPPING_DELIVERED: YalidineStatusMapping = { status: "delivered", incrementAttempts: false, noop: false };
const MAPPING_CANCELLED: YalidineStatusMapping = { status: "cancelled", incrementAttempts: false, noop: false };
const MAPPING_RETURNED: YalidineStatusMapping = { status: "returned", incrementAttempts: false, noop: false };
const MAPPING_OUT: YalidineStatusMapping = { status: "out_for_delivery", incrementAttempts: false, noop: false };
const MAPPING_ATTEMPTS: YalidineStatusMapping = { status: "out_for_delivery", incrementAttempts: true, noop: false };
const MAPPING_NOOP: YalidineStatusMapping = { status: null, incrementAttempts: false, noop: true };

const YALIDINE_STATUS_MAP: Record<string, YalidineStatusMapping> = {
  // ── Terminal: delivered ──
  "Livré": MAPPING_DELIVERED, // [*][L]

  // ── Terminal: cancelled ──
  "Annulé": MAPPING_CANCELLED, // [*]

  // ── Terminal: returned ──
  "Retourné au vendeur": MAPPING_RETURNED, // [*][L] — live-final 3/3
  "Retour vers vendeur": MAPPING_RETURNED, // [*]
  "Retour non retiré": MAPPING_RETURNED, // [*] — client never retrieved
  "Colis abandonné": MAPPING_RETURNED, // [*]
  "Echange échoué": MAPPING_RETURNED, // [*]
  "Echèc livraison": MAPPING_RETURNED, // [*][L] — always followed by return transit; definitive failure

  // ── Out for delivery ──
  "Sorti en livraison": MAPPING_OUT, // [*][L]

  // ── Failed attempt (counter, no transition) ──
  "Tentative échouée": MAPPING_ATTEMPTS, // [*][L] — reason live-observed

  // ── Transit / waiting / alerts — deliberate no-ops ──
  "Pas encore expédié": MAPPING_NOOP, // [*]
  "A vérifier": MAPPING_NOOP, // [*]
  "En préparation": MAPPING_NOOP, // [*][L]
  "Pas encore ramassé": MAPPING_NOOP, // [*]
  "Prêt à expédier": MAPPING_NOOP, // [*]
  "En passation": MAPPING_NOOP, // [*]
  "Ramassé": MAPPING_NOOP, // [*] — was wrongly "assigned"
  "Bloqué": MAPPING_NOOP, // [*]
  "Débloqué": MAPPING_NOOP, // [*]
  "Transfert": MAPPING_NOOP, // [*]
  "Expédié": MAPPING_NOOP, // [*][L]
  "Centre": MAPPING_NOOP, // [*][L]
  "En localisation": MAPPING_NOOP, // [*]
  "Vers Wilaya": MAPPING_NOOP, // [*][L]
  "En transit": MAPPING_NOOP, // [*] — was wrongly "assigned"
  "Reçu à Wilaya": MAPPING_NOOP, // [*]
  "En attente du client": MAPPING_NOOP, // [*][L]
  "Prêt pour livreur": MAPPING_NOOP, // [*][L]
  "En attente": MAPPING_NOOP, // [*][L]
  "En alerte": MAPPING_NOOP, // [*][L] — reason field is the signal
  "Alerte résolue": MAPPING_NOOP, // [*] histories-only
  "Retour vers centre": MAPPING_NOOP, // [*][L] — return transit
  "Retourné au centre": MAPPING_NOOP, // [*][L] — return transit
  "Retour transfert": MAPPING_NOOP, // [*] — return transit
  "Retour groupé": MAPPING_NOOP, // [*] — return transit
  "Retour à retirer": MAPPING_NOOP, // [*][L] — can still end "Livré" (client retrieves)
};

const MAPPING_UNKNOWN: YalidineStatusMapping = { status: null, incrementAttempts: false, noop: false };

/**
 * Map a Yalidine status string to our order status.
 *
 * Exact match first, then case-insensitive fallback (safety net — Yalidine
 * sends exact French strings).
 *
 * Unknown strings return { status: null, noop: false }: the caller logs
 * result='unmapped' and leaves the order status untouched.
 */
export function mapYalidineStatus(
  status: string | null | undefined
): YalidineStatusMapping {
  if (!status) return MAPPING_UNKNOWN;

  const normalized = status.trim();

  if (normalized in YALIDINE_STATUS_MAP) {
    return YALIDINE_STATUS_MAP[normalized];
  }

  const lower = normalized.toLowerCase();
  for (const [key, value] of Object.entries(YALIDINE_STATUS_MAP)) {
    if (key.toLowerCase() === lower) {
      return value;
    }
  }

  return MAPPING_UNKNOWN;
}

/** The full documented enum — exported for the exhaustive drift-guard test. */
export const YALIDINE_DOCUMENTED_STATUSES = Object.keys(YALIDINE_STATUS_MAP);
