-- CAPI atomic event claim — unique business key per order + stage + event_name.
-- Prevents duplicate server events when multiple trigger sources (e.g. carrier
-- webhook retries, concurrent dashboard status transitions) fire concurrently.
ALTER TABLE `capi_event_log` ADD `stage` text NOT NULL DEFAULT 'delivered';--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `idx_capi_event_log_claim` ON `capi_event_log` (`order_id`, `stage`, `event_name`);
