/**
 * Yalidine Webhook Signature Verification
 *
 * Verifies the HMAC-SHA256 signature on inbound Yalidine webhook deliveries.
 * No SDK exists for Cloudflare Workers, so this uses the Web Crypto API —
 * same approach as the ZR Express Svix verifier, different wire format.
 *
 * Official spec (webook.md — "Secure Your Webhook"):
 *   Signature header:  X-Yalidine-Signature (PHP: HTTP_X_YALIDINE_SIGNATURE)
 *   Algorithm:         hash_hmac("sha256", rawPayload, secretKey)
 *   Secret:            plain string from the Yalidine Webhooks Dashboard —
 *                      used as raw UTF-8 key bytes (NOT base64, no prefix)
 *   Digest format:     PHP hash_hmac() → lowercase hex (64 chars)
 *
 * PHP reference from the docs:
 *   $computed_signature = hash_hmac("sha256", $payload, $secret_key);
 *   if ($yalidine_signature === $computed_signature) { /* ok *\/ }
 *
 * Tolerances (both must still match the SAME computed HMAC — no weakening):
 *   - hex comparison is case-insensitive (A-F vs a-f)
 *   - a base64-encoded digest is also accepted (44 chars) — defensive;
 *     the docs specify hex, but a dashboard-side format change must not
 *     silently disable a merchant's webhook (Yalidine auto-disables after
 *     7 failed retries).
 *
 * Comparison is constant-time (branch-free length check aside) to prevent
 * timing oracles.
 */

const HEX_LEN = 64; // sha256 hex digest
const B64_LEN = 44; // sha256 base64 digest

async function computeHmacSha256(rawBody: string, secret: string): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(rawBody));
  return new Uint8Array(sig);
}

function toHex(bytes: Uint8Array): string {
  let hex = "";
  for (const b of bytes) hex += b.toString(16).padStart(2, "0");
  return hex;
}

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

/** Constant-time equality — same length requirement, no early exit. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function verifyYalidineSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
): Promise<boolean> {
  if (!signatureHeader || !secret) return false;

  const digest = await computeHmacSha256(rawBody, secret);
  const header = signatureHeader.trim();

  if (header.length === HEX_LEN) {
    // Hex form (documented): compare case-insensitively, constant-time.
    return timingSafeEqual(header.toLowerCase(), toHex(digest));
  }
  if (header.length === B64_LEN) {
    // Base64 form (tolerance): compare constant-time.
    return timingSafeEqual(header, toBase64(digest));
  }
  return false;
}
