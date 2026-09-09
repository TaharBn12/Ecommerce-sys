-- Legacy conversion-event semantics: rows created before the 4-tier model used
-- 'Purchase' to mean "Purchase at confirmed delivery" (webhook-driven). The
-- 4-tier model redefines 'Purchase' as instant checkout Purchase, so existing
-- selections must be preserved as 'Purchase_Delivered' — otherwise stores that
-- chose on-delivery conversion silently switch to instant-checkout measurement.
-- New stores (and re-selections after this migration) use the new meanings.
UPDATE `store_pixel_config` SET `conversion_event` = 'Purchase_Delivered' WHERE `conversion_event` = 'Purchase';--> statement-breakpoint