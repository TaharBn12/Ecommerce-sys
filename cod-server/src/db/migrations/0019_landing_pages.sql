-- Migration: Landing pages — one-product marketing pages (image stack + COD form)
-- See report-md/LANDING_PAGES_REPORT.md (v2) and report-md/LANDING_PAGES_SLICES.md.

CREATE TABLE IF NOT EXISTS landing_pages (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  product_id TEXT NOT NULL REFERENCES products(id),
  status TEXT NOT NULL DEFAULT 'draft',
  image_gap INTEGER NOT NULL DEFAULT 0,
  side_padding INTEGER NOT NULL DEFAULT 0,
  content_max_width INTEGER NOT NULL DEFAULT 0,
  meta_title TEXT,
  meta_description TEXT,
  views INTEGER NOT NULL DEFAULT 0,
  published_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_landing_pages_product ON landing_pages(product_id);
CREATE INDEX IF NOT EXISTS idx_landing_pages_status ON landing_pages(status);

CREATE TABLE IF NOT EXISTS landing_page_images (
  id TEXT PRIMARY KEY,
  landing_page_id TEXT NOT NULL REFERENCES landing_pages(id) ON DELETE CASCADE,
  r2_key TEXT NOT NULL,
  src TEXT NOT NULL,
  alt_text TEXT,
  source TEXT NOT NULL DEFAULT 'upload',
  position INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_landing_page_images_lp ON landing_page_images(landing_page_id, position);

ALTER TABLE orders ADD COLUMN landing_page_id TEXT REFERENCES landing_pages(id);
CREATE INDEX IF NOT EXISTS idx_orders_landing_page ON orders(landing_page_id);
