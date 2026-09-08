import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Miniflare } from "miniflare";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import type { AppDb } from "@/db";
import {
  normalizeGeoName,
  syncCarrierGeoNames,
  resolveCarrierWilayaName,
  resolveCarrierCommuneName,
  countCarrierCommuneMappings,
  resolveCarrierCommuneNames,
} from "../../../../../../cod-shared/queries/carrier-geo";

let db: AppDb;
const registry: Miniflare[] = [];

beforeAll(async () => {
  const mf = new Miniflare({
    script: "export default { fetch() { return new Response('ok'); } }",
    modules: true,
    d1Databases: { DB: "test-db" },
  });
  const d1 = await mf.getD1Database("DB");
  const dir = resolve(__dirname, "../../../../db/migrations");
  const preparedStatements: D1PreparedStatement[] = [];
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    const statements = readFileSync(`${dir}/${file}`, "utf8")
      .split("--> statement-breakpoint")
      .flatMap((s) => s.split(/;\s*\n/))
      .map((s) => s.replace(/;+\s*$/, "").trim())
      .filter((s) => s.replace(/--[^\n]*/g, "").trim().length > 0);
    for (const statement of statements) {
      preparedStatements.push(d1.prepare(statement));
    }
  }
  for (let i = 0; i < preparedStatements.length; i += 50) {
    await d1.batch(preparedStatements.slice(i, i + 50));
  }
  db = drizzle(d1 as unknown as D1Database, { schema }) as unknown as AppDb;
  registry.push(mf);

  // The seed (0000_complete) already carries the REAL mismatch shapes this
  // slice fixes — use the seed's own rows instead of inventing fixtures:
  //   wilaya 6: "Béjaïa" seeded accented; align to OUR prod spelling "Bejaia"
  //   c-19-026 "Ain Arnat"  ↔ carrier "Aïn Arnat"  (accent)
  //   c-42-007 "Aghabal"    ↔ carrier "Aghbal"      (spelling)
  //   c-16-002 "Sidi Mhamed" ↔ carrier "Sidi M'Hamed" (punctuation)
  await db
    .update(schema.wilayas)
    .set({ name: "Bejaia" })
    .where(eq(schema.wilayas.id, 6));
  arnatId = "c-19-026";
  aghabalId = "c-42-007";
  sidiId = "c-16-002";
  algerCentreId = "c-16-001"; // "Alger Centre" — exact-match shape
  db = db; // keep reference stable
}, 120_000);

let arnatId: string;
let aghabalId: string;
let sidiId: string;
let algerCentreId: string;

afterAll(async () => {
  for (const mf of registry) await mf.dispose();
});

describe("normalizeGeoName", () => {
  it("strips accents, case, spaces, hyphens, apostrophes, periods", () => {
    expect(normalizeGeoName("Aïn Arnat")).toBe(normalizeGeoName("Ain Arnat"));
    expect(normalizeGeoName("Sidi M'Hamed")).toBe(normalizeGeoName("Sidi Mhamed"));
    expect(normalizeGeoName("Boumerdès")).toBe(normalizeGeoName("Boumerdes"));
    expect(normalizeGeoName("M'Sila")).toBe(normalizeGeoName("MSila"));
    expect(normalizeGeoName("El M'Ghair")).toBe(normalizeGeoName("ElMGhair"));
    expect(normalizeGeoName("Bejaia")).not.toBe(normalizeGeoName("Biskra"));
  });
});

describe("syncCarrierGeoNames — real D1", () => {
  it("maps exact, accent, punctuation, and spelling variants; reports unmapped; is re-runnable", async () => {
    const carrierNames = {
      wilayas: [
        { id: 601, name: "Béjaïa" },      // matches our "Bejaia" (accent)
        { id: 616, name: "Alger" },       // exact
        { id: 638, name: "Tissemsilt" },  // exact
        { id: 650, name: "Boumerdès" },   // seed wilaya 35 exact
      ],
      communes: [
        { id: 1001, name: "Aïn Arnat", wilayaId: 19 },     // accent match (ours: c-19-026 "Ain Arnat")
        { id: 1002, name: "Aghbal", wilayaId: 42 },        // spelling variant (ours: c-42-007 "Aghabal")
        { id: 1003, name: "Sidi M'Hamed", wilayaId: 16 },  // punctuation (ours: c-16-002 + c-28-038)
        { id: 1004, name: "Sidi M'Hamed", wilayaId: 28 },  //   … two seed rows, one carrier string each
        { id: 1005, name: "Akabli", wilayaId: 1 },         // exact (ours: c-01-019)
      ],
    };

    const result = await syncCarrierGeoNames(db, "yalidine", carrierNames);

    // Sync covers the full seeded reference table: the four wilayas above
    // each resolve (accent/exact), and 5 commune shapes match — accent
    // (Aïn Arnat), spelling variant (Aghabal), punctuation ×2 (both Sidi
    // Mhamed rows), exact (Akabli).
    expect(result.wilayasMatched).toBe(4);
    expect(result.communesMatched).toBe(5);

    // Our carrier_id is NOT the carrier's id — the map row references OUR ids.
    expect(await resolveCarrierWilayaName(db, "yalidine", 6)).toBe("Béjaïa");
    expect(await resolveCarrierWilayaName(db, "yalidine", 16)).toBe("Alger");
    expect(await resolveCarrierCommuneName(db, "yalidine", arnatId)).toBe("Aïn Arnat");
    expect(await resolveCarrierCommuneName(db, "yalidine", aghabalId)).toBe("Aghbal");
    expect(await resolveCarrierCommuneName(db, "yalidine", sidiId)).toBe("Sidi M'Hamed");
    expect(await countCarrierCommuneMappings(db, "yalidine")).toBe(5);

    // Another carrier's rows never leak into yalidine lookups.
    expect(await resolveCarrierWilayaName(db, "noest", 6)).toBeNull();

    // Re-sync with a renamed commune: wholesale replacement, no stale rows.
    await syncCarrierGeoNames(db, "yalidine", {
      wilayas: carrierNames.wilayas,
      communes: [
        { id: 1001, name: "Ain Arnat", wilayaId: 19 }, // carrier renamed (dropped accent)
        { id: 1003, name: "Sidi M'Hamed", wilayaId: 16 },
      ],
    });
    expect(await resolveCarrierCommuneName(db, "yalidine", arnatId)).toBe("Ain Arnat");
    expect(await resolveCarrierCommuneName(db, "yalidine", aghabalId)).toBeNull(); // removed
    expect(await resolveCarrierCommuneName(db, "yalidine", sidiId)).toBe("Sidi M'Hamed");
    expect(await countCarrierCommuneMappings(db, "yalidine")).toBe(2);
  });

  it("reports our rows with no carrier counterpart as unmapped", async () => {
    const result = await syncCarrierGeoNames(db, "zr_express", {
      wilayas: [{ id: 900, name: "Alger" }],
      communes: [{ id: 9001, name: "Alger Centre", wilayaId: 16 }],
    });
    expect(result.wilayasMatched).toBe(1);
    expect(result.communesMatched).toBeGreaterThanOrEqual(1);
    expect(result.unmappedCommunes.length).toBeGreaterThan(100); // most of the seed has no ZR counterpart here
  });
});

describe("resolveCarrierCommuneNames — bulk (dispatch batch path)", () => {
  it("resolves a map of only the mapped ids", async () => {
    await syncCarrierGeoNames(db, "yalidine", {
      wilayas: [{ id: 616, name: "Alger" }],
      communes: [
        { id: 1003, name: "Sidi M'Hamed", wilayaId: 16 },
        { id: 9001, name: "Alger Centre", wilayaId: 16 },
      ],
    });
    const map = await resolveCarrierCommuneNames(db, "yalidine", [
      sidiId,
      algerCentreId,
      arnatId, // not mapped
    ]);
    expect(map.get(sidiId)).toBe("Sidi M'Hamed");
    expect(map.has(arnatId)).toBe(false);
  });

  it("empty input returns an empty map without querying", async () => {
    const map = await resolveCarrierCommuneNames(db, "yalidine", []);
    expect(map.size).toBe(0);
  });
});

function countDots(s: string): number {
  return (s.match(/\./g) ?? []).length;
}
