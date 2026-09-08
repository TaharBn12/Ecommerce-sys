/**
 * Webhook Events Queries
 *
 * Handles idempotency (dedup via UNIQUE constraint) and audit logging
 * for inbound webhook deliveries from ZR Express and Yalidine.
 */

import { eq } from "drizzle-orm";
import { webhookEvents, orders } from "../db/schema";
import type { AppDb } from "../db/client";

export interface InsertWebhookEventData {
  provider: string;
  eventId: string;
  companyId: string;
  tracking?: string | null;
  eventType: string;
  rawPayload: string;
}

export interface UpdateWebhookEventData {
  result?: string;
  newStatus?: string | null;
  reason?: string | null;
  errorMsg?: string | null;
  orderId?: string | null;
  processedAt?: string | null;
}

/**
 * Insert a webhook event record.
 *
 * If (provider, event_id) already exists → returns isDuplicate=true.
 * The caller must skip all processing when isDuplicate=true.
 *
 * Duplicate detection walks the error CAUSE CHAIN: Drizzle wraps the raw D1
 * error, so "UNIQUE constraint failed" sits on a nested cause, not the
 * top-level message — message-only matching made every duplicate delivery
 * (Yalidine's documented retries) throw 500 instead of deduplicating, which
 * would eventually get the webhook auto-disabled by the carrier.
 */
function isUniqueViolation(err: unknown): boolean {
  let cause: unknown = err;
  for (let depth = 0; cause instanceof Error && depth < 5; depth++) {
    if (cause.message.includes("UNIQUE constraint failed")) return true;
    cause = (cause as Error & { cause?: unknown }).cause;
  }
  return false;
}

export async function insertWebhookEvent(
  db: AppDb,
  data: InsertWebhookEventData,
): Promise<{ id: string; isDuplicate: boolean }> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  try {
    await db.insert(webhookEvents).values({
      id,
      provider: data.provider,
      eventId: data.eventId,
      companyId: data.companyId,
      tracking: data.tracking ?? null,
      eventType: data.eventType,
      rawPayload: data.rawPayload,
      result: "pending",
      createdAt: now,
    });
    return { id, isDuplicate: false };
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { id: "", isDuplicate: true };
    }
    throw err;
  }
}

export async function updateWebhookEvent(
  db: AppDb,
  id: string,
  updates: UpdateWebhookEventData,
): Promise<void> {
  const values: Record<string, unknown> = {};

  if (updates.result !== undefined) values.result = updates.result;
  if (updates.newStatus !== undefined) values.newStatus = updates.newStatus;
  if (updates.reason !== undefined) values.reason = updates.reason;
  if (updates.errorMsg !== undefined) values.errorMsg = updates.errorMsg;
  if (updates.orderId !== undefined) values.orderId = updates.orderId;
  if (updates.processedAt !== undefined) values.processedAt = updates.processedAt;

  if (Object.keys(values).length === 0) return;

  await db
    .update(webhookEvents)
    .set(values)
    .where(eq(webhookEvents.id, id));
}

export async function getOrderByTracking(db: AppDb, trackingNumber: string) {
  return await db
    .select()
    .from(orders)
    .where(eq(orders.trackingNumber, trackingNumber))
    .get();
}

export async function getOrderByReference(db: AppDb, reference: string) {
  return await db
    .select()
    .from(orders)
    .where(eq(orders.orderNumber, reference))
    .get();
}
