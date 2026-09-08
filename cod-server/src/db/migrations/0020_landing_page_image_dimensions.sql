-- Landing page image intrinsic dimensions — captured client-side at upload
-- so the storefront can reserve layout space (width/height attrs) before the
-- image bytes arrive. Nullable: legacy rows render without dimensions.
ALTER TABLE landing_page_images ADD COLUMN width INTEGER;
ALTER TABLE landing_page_images ADD COLUMN height INTEGER;
