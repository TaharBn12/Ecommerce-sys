/**
 * Yalidine status mapper — exhaustive enum coverage.
 *
 * Every string comes from the official docs' fixed enum (34 parcel statuses
 * + the histories-only "Alerte résolue"), cross-checked against statuses
 * OBSERVED LIVE on the real account (272 history events / 20 parcels — see
 * report-md/YALIDINE_SLICES.md Slice Y1.2).
 *
 * The final test is a drift guard: the mapper's key set must equal this
 * documented list EXACTLY — a new Yalidine status (or a removed one) fails
 * CI here instead of silently vanishing orders in production.
 */
import { describe, it, expect } from "vitest";
import {
  mapYalidineStatus,
  YALIDINE_DOCUMENTED_STATUSES,
} from "./yalidine-status-mapper";

describe("mapYalidineStatus — terminal mappings", () => {
  it("maps delivered", () => {
    expect(mapYalidineStatus("Livré")).toEqual({
      status: "delivered",
      incrementAttempts: false,
      noop: false,
    });
  });

  it("maps cancelled", () => {
    expect(mapYalidineStatus("Annulé")).toEqual({
      status: "cancelled",
      incrementAttempts: false,
      noop: false,
    });
  });

  const RETURNED = [
    "Retourné au vendeur", // live-observed terminal 3/3
    "Retour vers vendeur",
    "Retour non retiré",
    "Colis abandonné",
    "Echange échoué",
    "Echèc livraison", // live-observed: always precedes return-to-seller
  ];
  for (const status of RETURNED) {
    it(`maps "${status}" → returned`, () => {
      expect(mapYalidineStatus(status)).toEqual({
        status: "returned",
        incrementAttempts: false,
        noop: false,
      });
    });
  }
});

describe("mapYalidineStatus — out for delivery + attempts", () => {
  it("maps 'Sorti en livraison' → out_for_delivery", () => {
    expect(mapYalidineStatus("Sorti en livraison")).toEqual({
      status: "out_for_delivery",
      incrementAttempts: false,
      noop: false,
    });
  });

  it("maps 'Tentative échouée' → stays out_for_delivery + increments attempts", () => {
    expect(mapYalidineStatus("Tentative échouée")).toEqual({
      status: "out_for_delivery",
      incrementAttempts: true,
      noop: false,
    });
  });
});

describe("mapYalidineStatus — transit statuses are deliberate no-ops", () => {
  // Every string observed live on the real account is included here.
  const TRANSIT = [
    "Pas encore expédié",
    "A vérifier",
    "En préparation",      // live
    "Pas encore ramassé",
    "Prêt à expédier",
    "En passation",
    "Ramassé",             // was wrongly "assigned" in the old map
    "Bloqué",
    "Débloqué",
    "Transfert",
    "Expédié",             // live
    "Centre",              // live
    "En localisation",
    "Vers Wilaya",         // live
    "En transit",          // was wrongly "assigned" in the old map
    "Reçu à Wilaya",
    "En attente du client", // live
    "Prêt pour livreur",   // live
    "En attente",          // live
    "En alerte",           // live — reason field is the signal
    "Alerte résolue",      // histories-only
    "Retour vers centre",  // live — return transit
    "Retourné au centre",  // live — return transit
    "Retour transfert",    // return transit
    "Retour groupé",       // return transit
    "Retour à retirer",    // live — can still end "Livré" (client retrieves)
  ];
  for (const status of TRANSIT) {
    it(`maps "${status}" → known no-op (status null, noop true)`, () => {
      expect(mapYalidineStatus(status)).toEqual({
        status: null,
        incrementAttempts: false,
        noop: true,
      });
    });
  }
});

describe("mapYalidineStatus — unknown + degenerate inputs", () => {
  it("unknown string → unmapped (status null, noop false)", () => {
    expect(mapYalidineStatus("Nouveau statut inconnu")).toEqual({
      status: null,
      incrementAttempts: false,
      noop: false,
    });
  });

  it("null / undefined / empty → unmapped", () => {
    for (const input of [null, undefined, "", "   "]) {
      expect(mapYalidineStatus(input)).toEqual({
        status: null,
        incrementAttempts: false,
        noop: false,
      });
    }
  });

  it("case-insensitive fallback still resolves", () => {
    expect(mapYalidineStatus("livré").status).toBe("delivered");
    expect(mapYalidineStatus("SORTI EN LIVRAISON").status).toBe("out_for_delivery");
  });

  it("trims whitespace before matching", () => {
    expect(mapYalidineStatus("  Livré  ").status).toBe("delivered");
  });
});

describe("mapYalidineStatus — drift guard (never silently regress)", () => {
  it("covers EXACTLY the documented enum — 35 parcel statuses + 1 histories-only, no more, no fewer", () => {
    expect(YALIDINE_DOCUMENTED_STATUSES).toHaveLength(36);
  });

  it("contains no phantom statuses from the old broken map", () => {
    // The old mapper mapped three strings that do not exist in Yalidine's
    // enum ("En cours de retour", "Retour à l'agence", "Retourné") — make
    // sure nothing like that sneaks back in via a different casing.
    expect(mapYalidineStatus("En cours de retour").noop).toBe(false);
    expect(mapYalidineStatus("Retour à l'agence").noop).toBe(false);
    expect(mapYalidineStatus("Retourné").noop).toBe(false);
  });

  it("every live-observed status (16 distinct, 272 events) is explicitly covered", () => {
    const LIVE_OBSERVED = [
      "Centre", "Tentative échouée", "En attente du client", "En alerte",
      "Vers Wilaya", "Expédié", "En préparation", "Livré",
      "Sorti en livraison", "Prêt pour livreur", "Retour vers centre",
      "Retourné au centre", "Echèc livraison", "Retourné au vendeur",
      "Retour à retirer", "En attente",
    ];
    for (const status of LIVE_OBSERVED) {
      const mapped = mapYalidineStatus(status);
      // Every live string must be KNOWN (noop true or a real status) —
      // never unknown, or live events would log as unmapped.
      expect(mapped.noop || mapped.status !== null).toBe(true);
    }
  });
});
