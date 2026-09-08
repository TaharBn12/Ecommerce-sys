/**
 * Yalidine egress proxy — deploy to Deno Deploy (or any non-Cloudflare
 * platform). Workaround for Yalidine's zone blocking ALL Cloudflare Worker
 * traffic (proven 2026-09-08: fetch AND raw sockets, API AND homepage,
 * with/without token → 403 error 1106 from CF edge; see
 * report-md/YALIDINE_EGRESS_BLOCK_EMAIL.md).
 *
 * Deploy (Deno Deploy, free tier):
 *   1. dash.deno.com → New Playground (or `deployctl deploy` with an account)
 *   2. Paste this file, set env var PROXY_SECRET=<long random string>
 *   3. Note the deployment URL, e.g. https://xxx.deno.dev
 *
 * Wire into CodFlow (no deploy needed until this step):
 *   PATCH /api/delivery-companies/:id  body { notes: "{\"proxy_base_url\":\"https://xxx.deno.dev\",\"proxy_secret\":\"<same secret>\",\"from_wilaya_name\":\"Alger\"}" }
 *   — the yalidine registry reads proxy_base_url + proxy_secret from notes
 *   and routes every carrier call through this proxy. Remove the keys to
 *   go direct again.
 *
 * Security:
 *   - Caller auth: X-Proxy-Secret header, constant-time compare. Without
 *     it the proxy answers 401 and forwards nothing.
 *   - Destination allowlist: ONLY https://api.yalidine.app/* — this is a
 *     Yalidine relay, not an open proxy.
 *   - The proxy never logs or persists anything; it streams method, path,
 *     query, headers, and body through untouched.
 */

const PROXY_SECRET = Deno.env.get("PROXY_SECRET") ?? "";
const UPSTREAM = "https://api.yalidine.app";

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req: Request) => {
  if (req.method === "GET" && new URL(req.url).pathname === "/health") {
    return new Response("ok");
  }
  if (!PROXY_SECRET) {
    return new Response("proxy not configured", { status: 500 });
  }
  const secret = req.headers.get("x-proxy-secret") ?? "";
  if (!timingSafeEqual(secret, PROXY_SECRET)) {
    return new Response("unauthorized", { status: 401 });
  }

  const incoming = new URL(req.url);
  const upstream = new URL(UPSTREAM + incoming.pathname + incoming.search);
  if (upstream.origin !== new URL(UPSTREAM).origin) {
    return new Response("destination not allowed", { status: 403 });
  }

  const headers = new Headers();
  for (const name of ["x-api-id", "x-api-token", "content-type", "accept", "user-agent"]) {
    const value = req.headers.get(name);
    if (value) headers.set(name, value);
  }

  const init: RequestInit = { method: req.method, headers };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.arrayBuffer();
  }

  const upstreamRes = await fetch(upstream.toString(), init);
  const resHeaders = new Headers();
  for (const name of ["content-type", "x-second-quota-left", "x-minute-quota-left", "x-hour-quota-left", "x-day-quota-left", "retry-after"]) {
    const value = upstreamRes.headers.get(name);
    if (value) resHeaders.set(name, value);
  }
  return new Response(upstreamRes.body, { status: upstreamRes.status, headers: resHeaders });
});
