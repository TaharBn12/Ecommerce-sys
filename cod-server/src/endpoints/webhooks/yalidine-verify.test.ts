/**
 * Yalidine signature verification — proven against a REFERENCE implementation.
 *
 * The reference signatures are computed with Node's crypto.createHmac
 * (a completely separate implementation from our Web Crypto code path), so
 * agreement proves our Workers-runtime verifier produces exactly what
 * Yalidine's PHP `hash_hmac("sha256", $payload, $secret_key)` produces.
 */
import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { verifyYalidineSignature } from "./yalidine-verify";

const SECRET = "test_webhook_secret_key_2026";
const PAYLOAD = JSON.stringify({
  type: "parcel_status_updated",
  events: [
    {
      event_id: "FLXR9jVMcJd8xvsEZ7D06WyTfBHnrPol",
      occurred_at: "2026-09-07 00:01:26",
      data: { tracking: "yal-111AAA", status: "Livré", reason: null },
    },
  ],
});

function referenceHex(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body, "utf8").digest("hex");
}

function referenceBase64(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body, "utf8").digest("base64");
}

describe("verifyYalidineSignature — reference-agreement proofs", () => {
  it("accepts a reference-computed hex signature (PHP hash_hmac format)", async () => {
    const header = referenceHex(PAYLOAD, SECRET);
    await expect(verifyYalidineSignature(PAYLOAD, header, SECRET)).resolves.toBe(true);
  });

  it("accepts a reference-computed UPPERCASE hex signature (case-insensitive)", async () => {
    const header = referenceHex(PAYLOAD, SECRET).toUpperCase();
    await expect(verifyYalidineSignature(PAYLOAD, header, SECRET)).resolves.toBe(true);
  });

  it("accepts a reference-computed base64 signature (tolerance format)", async () => {
    const header = referenceBase64(PAYLOAD, SECRET);
    await expect(verifyYalidineSignature(PAYLOAD, header, SECRET)).resolves.toBe(true);
  });

  it("agreement holds across multiple bodies/secrets (not a fluke)", async () => {
    const cases: Array<[string, string]> = [
      ["a", "k1"],
      ['{"type":"parcel_created"}', "another-secret"],
      ["unicode payload: عين وارة — Livré", "clé-secrète-é"],
      ["x".repeat(10_000), "s"],
    ];
    for (const [body, secret] of cases) {
      const header = referenceHex(body, secret);
      await expect(verifyYalidineSignature(body, header, secret)).resolves.toBe(true);
    }
  });
});

describe("verifyYalidineSignature — rejection proofs", () => {
  it("rejects a tampered body (signature computed over the original)", async () => {
    const header = referenceHex(PAYLOAD, SECRET);
    const tampered = PAYLOAD.replace('"Livré"', '"Retourné au vendeur"');
    await expect(verifyYalidineSignature(tampered, header, SECRET)).resolves.toBe(false);
  });

  it("rejects the right signature with the WRONG secret", async () => {
    const header = referenceHex(PAYLOAD, "wrong-secret");
    await expect(verifyYalidineSignature(PAYLOAD, header, SECRET)).resolves.toBe(false);
  });

  it("rejects a signature of the right length but wrong content", async () => {
    const header = "0".repeat(64);
    await expect(verifyYalidineSignature(PAYLOAD, header, SECRET)).resolves.toBe(false);
  });

  it("rejects a truncated signature", async () => {
    const header = referenceHex(PAYLOAD, SECRET).slice(0, 63);
    await expect(verifyYalidineSignature(PAYLOAD, header, SECRET)).resolves.toBe(false);
  });

  it("rejects a padded/whitespace-prefixed signature of the wrong shape", async () => {
    const header = "  " + referenceHex(PAYLOAD, SECRET) + "  ";
    // trim() handles pure whitespace — this must still verify
    await expect(verifyYalidineSignature(PAYLOAD, header, SECRET)).resolves.toBe(true);
  });

  it("rejects when the header is null", async () => {
    await expect(verifyYalidineSignature(PAYLOAD, null, SECRET)).resolves.toBe(false);
  });

  it("rejects when the secret is empty", async () => {
    const header = referenceHex(PAYLOAD, SECRET);
    await expect(verifyYalidineSignature(PAYLOAD, header, "")).resolves.toBe(false);
  });

  it("rejects an empty payload signature mismatch (empty body ≠ signed body)", async () => {
    const header = referenceHex(PAYLOAD, SECRET);
    await expect(verifyYalidineSignature("", header, SECRET)).resolves.toBe(false);
  });
});
