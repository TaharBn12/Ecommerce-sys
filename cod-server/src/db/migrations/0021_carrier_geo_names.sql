-- Carrier geo name resolution — per-carrier exact name strings for address
-- matching. Carriers like Yalidine match parcels by EXACT wilaya/commune name
-- strings; our reference tables use their own spellings (often unaccented),
-- so dispatches to mismatched commines fail at the carrier.
-- Names are stored per carrier_code — other carriers (NOEST, ZR, EcoTrack)
-- keep using the reference-table names untouched.
CREATE TABLE IF NOT EXISTS carrier_wilayas (
  carrier_code TEXT NOT NULL,
  wilaya_id INTEGER NOT NULL REFERENCES wilayas(id),
  carrier_name TEXT NOT NULL,
  PRIMARY KEY (carrier_code, wilaya_id)
);

CREATE TABLE IF NOT EXISTS carrier_communes (
  carrier_code TEXT NOT NULL,
  commune_id TEXT NOT NULL REFERENCES communes(id),
  carrier_name TEXT NOT NULL,
  PRIMARY KEY (carrier_code, commune_id)
);
CREATE INDEX IF NOT EXISTS idx_carrier_communes_lookup ON carrier_communes(commune_id);
