/**
 * Test stub for the `cloudflare:workflows` runtime module under Node.
 */
export class NonRetryableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NonRetryableError";
  }
}
