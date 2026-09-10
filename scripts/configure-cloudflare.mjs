#!/usr/bin/env node
/**
 * CodFlow — one-shot Cloudflare deployment config generator.
 *
 * Reads the deployment values from the environment (used by GitHub Actions via
 * secrets, or by you locally via env vars) and:
 *
 *   1. creates any missing Cloudflare resources (D1 / R2 / KV) using the
 *      CLOUDFLARE_API_TOKEN,
 *   2. writes the real (gitignored) config files:
 *      - <root>/.env
 *      - cod-server/wrangler.toml
 *      - cod-client-astro/wrangler.toml
 *      - cod-client-astro/.env
 *
 * The generated wrangler.toml files are intentionally gitignored, so live
 * resource IDs and URLs never get committed.
 *
 * Required env:
 *   CLOUDFLARE_API_TOKEN      — Cloudflare API token with Workers/D1/R2/KV edit
 *
 * Optional env:
 *   CLOUDFLARE_ACCOUNT_ID     — Cloudflare account id (auto-fetched from the
 *                               token when omitted)
 *   API_DOMAIN                — e.g. api.example.com (cod-server)
 *   DASHBOARD_DOMAIN          — e.g. dashboard.example.com
 *   STORE_DOMAIN              — e.g. shop.example.com
 *                               (when NONE of the three domains is set, the
 *                               script runs in "workers.dev mode": all three
 *                               workers are published on the account's free
 *                               *.workers.dev subdomain)
 *   BETTER_AUTH_SECRET        — shared secret (must be the same on server + dashboard)
 *   STORE_API_KEY             — store API key (seeded + used by the storefront)
 *   MCP_LOGIN_TICKET_SECRET   — shared MCP login-ticket secret
 *   ADMIN_EMAIL               — merchant admin email
 *   MEDIA_DOMAIN              — e.g. media.example.com (R2 custom domain)
 *   SERVER_WORKER_NAME        — default codflow-server
 *   DASHBOARD_WORKER_NAME     — default codflow-dashboard
 *   STORE_WORKER_NAME         — default codflow-store (repo theme deploys as
 *                               codflow-os-theme01 — set it to match!)
 *   COD_DB_NAME               — default codflow-db
 *   COD_R2_BUCKET_NAME        — default codflow-images
 *   D1_DATABASE_ID            — skip create + use this id (UUID)
 *   RATE_LIMIT_KV_ID          — skip create + use this id
 *   OAUTH_KV_ID               — skip create + use this id
 *   R2_ACCESS_KEY_ID          — R2 S3 access key (presigned uploads)
 *   R2_SECRET_ACCESS_KEY      — R2 S3 secret key (presigned uploads)
 *   ADMIN_NAME                — default "Admin"
 *   ALLOWED_ORIGINS_EXTRA     — extra comma-separated origins allowed by CORS
 *
 * When running inside GitHub Actions, the resolved origins are exported to
 * GITHUB_ENV (API_ORIGIN, DASHBOARD_ORIGIN, STORE_ORIGIN, DEPLOY_MODE,
 * CF_ACCOUNT_ID) so later steps can use them.
 */

import { readFileSync, writeFileSync, existsSync, appendFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const env = process.env;

function fail(message) {
  console.error(`\n✘ ${message}\n`);
  process.exit(1);
}

function requireValue(name) {
  const value = (env[name] ?? "").trim();
  if (!value) fail(`Missing required environment variable/secrets: ${name}`);
  return value;
}

function asHostname(value) {
  const v = (value ?? "").trim().replace(/\/+$/, "");
  if (!v) return "";
  try {
    return new URL(v.includes("://") ? v : `https://${v}`).hostname;
  } catch {
    return v;
  }
}

function asOrigin(value) {
  const host = asHostname(value);
  return host ? `https://${host}` : "";
}

function run(command, args, opts = {}) {
  const output = execFileSync(command, args, {
    cwd: opts.cwd ?? ROOT,
    encoding: "utf8",
    env: {
      ...process.env,
      NO_COLOR: "1",
      WRANGLER_SEND_METRICS: "false",
    },
    stdio: ["ignore", "pipe", "pipe"],
    ...(opts.allowFailure ? { stdio: "pipe" } : {}),
  });
  return output;
}

function runOrEmpty(command, args, opts = {}) {
  try {
    return run(command, args, opts);
  } catch (err) {
    if (opts.allowFailure) {
      return `${err.stdout ?? ""}${err.stderr ?? ""}`;
    }
    throw err;
  }
}

function parseJsonFromOutput(output, label) {
  const text = (output ?? "").trim();
  try {
    return JSON.parse(text);
  } catch {
    // Some commands print a human banner before JSON (e.g. "✔ ..."). Try the
    // first `[`/`{` block.
    const start = Math.min(
      ...[text.indexOf("["), text.indexOf("{")].filter((x) => x >= 0)
    );
    if (Number.isFinite(start)) {
      return JSON.parse(text.slice(start));
    }
    throw new Error(`Could not find JSON in ${label} output:\n${text}`);
  }
}

function isCloudflareAuthAvailable() {
  return Boolean((env.CLOUDFLARE_API_TOKEN ?? env.WRANGLER_API_TOKEN ?? "").trim());
}

// ────────────────────────────────────────────────────────────────────────────
// Cloudflare REST API helpers (used for account discovery + workers.dev setup)
// ────────────────────────────────────────────────────────────────────────────

const CF_API_BASE = "https://api.cloudflare.com/client/v4";

function cfToken() {
  return (env.CLOUDFLARE_API_TOKEN ?? env.WRANGLER_API_TOKEN ?? "").trim();
}

async function cfApi(method, apiPath, body) {
  let res;
  try {
    res = await fetch(`${CF_API_BASE}${apiPath}`, {
      method,
      headers: {
        Authorization: `Bearer ${cfToken()}`,
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (err) {
    throw new Error(
      `CF API ${method} ${apiPath} network error: ${err?.cause?.code ?? err.message}`
    );
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    const details = (json.errors ?? [])
      .map((e) => `${e.code ?? ""}: ${e.message ?? ""}`.trim())
      .join("; ");
    throw new Error(`CF API ${method} ${apiPath} failed: ${details || res.statusText}`);
  }
  return json.result;
}

async function fetchAccountId() {
  const accounts = await cfApi("GET", "/accounts");
  if (!Array.isArray(accounts) || accounts.length === 0) {
    fail("The token is valid but no Cloudflare accounts are visible to it.");
  }
  if (accounts.length > 1) {
    console.warn(
      `[account] Token can see ${accounts.length} accounts; using the first: ${accounts[0].name}`
    );
  }
  return { id: accounts[0].id, name: accounts[0].name ?? "account" };
}

function slugifyWorkersDevSubdomain(value) {
  const slug = (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  return slug || "codflow";
}

async function ensureWorkersDevSubdomain(accountId, accountName) {
  try {
    const existing = await cfApi("GET", `/accounts/${accountId}/workers/subdomain`);
    if (existing?.subdomain) return existing.subdomain;
  } catch {
    // Fall through to registration.
  }
  const base = slugifyWorkersDevSubdomain(accountName);
  const candidates = [
    base,
    `${base}-${Math.random().toString(16).slice(2, 6)}`,
    `${base}-${Math.random().toString(16).slice(2, 8)}`,
  ];
  for (const candidate of candidates) {
    try {
      const created = await cfApi(
        "PUT",
        `/accounts/${accountId}/workers/subdomain`,
        { subdomain: candidate }
      );
      if (created?.subdomain) return created.subdomain;
    } catch (err) {
      console.warn(`[workers.dev] Subdomain "${candidate}" unavailable (${err.message}).`);
    }
  }
  fail("Could not register a workers.dev subdomain for this account.");
}

// ────────────────────────────────────────────────────────────────────────────
// Cloudflare resource helpers (best-effort, skip when IDs are already present)
// ────────────────────────────────────────────────────────────────────────────

function ensureD1Database(dbName, existingId) {
  if (existingId) return existingId;
  if (!isCloudflareAuthAvailable()) {
    fail(`D1_DATABASE_ID not set and no CLOUDFLARE_API_TOKEN to create it.`);
  }
  try {
    const list = parseJsonFromOutput(
      run("npx", ["wrangler", "d1", "list", "--json"]),
      "wrangler d1 list"
    );
    const found = list.find((d) => d.name === dbName);
    if (found?.uuid) return found.uuid;
  } catch (err) {
    console.warn(`[resources] Could not list D1 databases (${err.message}); trying to create.`);
  }
  const createOut = runOrEmpty("npx", ["wrangler", "d1", "create", dbName], {
    allowFailure: true,
  });
  const match = createOut.match(/database_id\s*=\s*"([^"]+)"/);
  if (match?.[1]) return match[1];

  // Re-list after a possible "already exists" failure.
  const list2 = parseJsonFromOutput(
    run("npx", ["wrangler", "d1", "list", "--json"]),
    "wrangler d1 list"
  );
  const found2 = list2.find((d) => d.name === dbName);
  if (found2?.uuid) return found2.uuid;

  fail(`Could not create or find D1 database "${dbName}". Create it and pass D1_DATABASE_ID.`);
}

function ensureKvNamespace(existingId, namespaceName) {
  if (existingId) return existingId;
  if (!isCloudflareAuthAvailable()) {
    fail(
      `${namespaceName}_KV_ID not set and no CLOUDFLARE_API_TOKEN to create the namespace.`
    );
  }
  const listOut = runOrEmpty(
    "npx",
    ["wrangler", "kv", "namespace", "list"],
    { allowFailure: true }
  );
  try {
    const arr = parseJsonFromOutput(listOut, "wrangler kv namespace list");
    const found = arr.find((n) => n.title === namespaceName);
    if (found?.id) return found.id;
  } catch {
    // Fall through to create.
  }
  const createOut = runOrEmpty(
    "npx",
    ["wrangler", "kv", "namespace", "create", namespaceName],
    { allowFailure: true }
  );
  let m = createOut.match(/"id"\s*:\s*"([a-fA-F0-9]{32})"/);
  if (m?.[1]) return m[1];
  m = createOut.match(/([a-fA-F0-9]{32})/);
  if (m?.[1]) return m[1];
  // The namespace may already exist; re-list before failing.
  try {
    const list2Out = runOrEmpty(
      "npx",
      ["wrangler", "kv", "namespace", "list"],
      { allowFailure: true }
    );
    const arr2 = parseJsonFromOutput(list2Out, "wrangler kv namespace list");
    const found2 = arr2.find((n) => n.title === namespaceName);
    if (found2?.id) return found2.id;
  } catch {
    // fall through to fail below
  }
  fail(
    `Could not create or find KV namespace "${namespaceName}". Create it and pass the namespace id.`
  );
}

function ensureR2Bucket(bucketName) {
  if (!bucketName) return "codflow-images";
  if (isCloudflareAuthAvailable()) {
    runOrEmpty("npx", ["wrangler", "r2", "bucket", "create", bucketName], {
      allowFailure: true,
    });
  }
  return bucketName;
}

// ────────────────────────────────────────────────────────────────────────────
// Config file patchers
// ────────────────────────────────────────────────────────────────────────────

function patchSection(text, startMarker, replacements) {
  let out = text;
  const start = out.indexOf(startMarker);
  if (start === -1) return out;
  const afterStart = out.indexOf("\n", start) + 1;
  const end = out.indexOf("\n[", afterStart);
  const sectionEnd = end === -1 ? out.length : end;
  let section = out.slice(afterStart, sectionEnd);
  for (const [re, value] of replacements) {
    section = section.replace(re, value);
  }
  return out.slice(0, afterStart) + section + out.slice(sectionEnd);
}

function addVar(text, varName, value) {
  const re = new RegExp(`^${varName}\\s*=.*$`, "m");
  if (re.test(text)) return text.replace(re, `${varName} = ${JSON.stringify(value)}`);
  // Insert into the last [vars] section (base vars) before the next top-level key.
  const marker = "[vars]";
  const idx = text.lastIndexOf(marker);
  if (idx === -1) return text;
  const after = text.indexOf("\n", idx) + 1;
  const insertAt = after;
  return (
    text.slice(0, insertAt) + `${varName} = ${JSON.stringify(value)}\n` + text.slice(insertAt)
  );
}

function setTopLevelValue(text, key, value) {
  const re = new RegExp(`^${key}\\s*=.*$`, "m");
  if (re.test(text)) return text.replace(re, `${key} = ${JSON.stringify(value)}`);
  // Insert right after the first non-comment line (the `name = ...` line) so
  // the key stays at the top level — appending at EOF would silently land
  // inside the last TOML section (e.g. [observability]).
  const firstLineEnd = text.search(/^([^#\s[][^=]*=)/m);
  const insertAt = firstLineEnd === -1 ? 0 : text.indexOf("\n", firstLineEnd) + 1;
  return (
    text.slice(0, insertAt) + `${key} = ${JSON.stringify(value)}\n` + text.slice(insertAt)
  );
}

function setBindingValue(text, binding, field, value) {
  // Replace the value inside the closest following block after a binding marker.
  const bindingRegex = new RegExp(
    `(binding\\s*=\\s*"${binding}"\\n(?:[^\\n]*\\n)*?)(${field}\\s*=\\s*).*$`,
    "m"
  );
  return text.replace(bindingRegex, `$1$2${JSON.stringify(value)}\n`);
}

function appendRoutes(text, routes) {
  if (!routes.length) return text;
  const lines = routes.map((r) => `  { pattern = ${JSON.stringify(r.pattern)}, custom_domain = true }`);
  return `${text.trimEnd()}\n\nroutes = [\n${lines.join(",\n")}\n]\n`;
}

function normalizeDomain(value) {
  const v = (value ?? "").trim().replace(/\/+$/, "");
  if (!v) return "";
  if (v.includes("://")) return new URL(v).hostname;
  return v;
}

function defaultDomainFrom(host, workerName) {
  // If the user only provides one custom root domain, derive subdomains when
  // only the primary is known. Keeping it explicit is safer, so this only
  // handles the simple api-only case.
  return host;
}

// ────────────────────────────────────────────────────────────────────────────

async function main() {
  let accountId = (env.CLOUDFLARE_ACCOUNT_ID ?? "").trim();
  let accountName = "";
  if (!accountId) {
    if (!isCloudflareAuthAvailable()) {
      fail("CLOUDFLARE_API_TOKEN (or CLOUDFLARE_ACCOUNT_ID) is required.");
    }
    const account = await fetchAccountId();
    accountId = account.id;
    accountName = account.name;
  }

  const apiDomain = normalizeDomain(env.API_DOMAIN);
  const dashboardDomain = normalizeDomain(env.DASHBOARD_DOMAIN);
  const storeDomain = normalizeDomain(env.STORE_DOMAIN);

  const domainCount = [apiDomain, dashboardDomain, storeDomain].filter(Boolean).length;
  if (domainCount > 0 && domainCount < 3) {
    fail(
      "Set ALL of API_DOMAIN, DASHBOARD_DOMAIN and STORE_DOMAIN — or set none of them to deploy on the account's free *.workers.dev subdomain."
    );
  }
  const deployMode = domainCount === 3 ? "custom" : "workersdev";

  const serverName = env.SERVER_WORKER_NAME || "codflow-server";
  const dashboardName = env.DASHBOARD_WORKER_NAME || "codflow-dashboard";
  const storeName = env.STORE_WORKER_NAME || "codflow-store";

  let workersDevSubdomain = "";
  if (deployMode === "workersdev") {
    if (!isCloudflareAuthAvailable()) {
      fail("workers.dev mode requires CLOUDFLARE_API_TOKEN to register the account subdomain.");
    }
    if (!accountName) {
      const account = await fetchAccountId();
      accountName = account.name;
    }
    workersDevSubdomain = await ensureWorkersDevSubdomain(accountId, accountName);
    console.log(`[workers.dev] Using ${workersDevSubdomain}.workers.dev`);
  }

  const dbName = env.COD_DB_NAME || "codflow-db";
  const bucketName = ensureR2Bucket(env.COD_R2_BUCKET_NAME || "codflow-images");

  const apiUrl =
    deployMode === "custom"
      ? asOrigin(apiDomain)
      : `https://${serverName}.${workersDevSubdomain}.workers.dev`;
  const dashboardUrl =
    deployMode === "custom"
      ? asOrigin(dashboardDomain)
      : `https://${dashboardName}.${workersDevSubdomain}.workers.dev`;
  const storeUrl =
    deployMode === "custom"
      ? asOrigin(storeDomain)
      : `https://${storeName}.${workersDevSubdomain}.workers.dev`;
  const mediaDomain = normalizeDomain(
    env.MEDIA_DOMAIN || (deployMode === "custom" ? `media.${apiDomain}` : "")
  );

  const betterAuthSecret = requireValue("BETTER_AUTH_SECRET");
  const storeApiKey = requireValue("STORE_API_KEY");
  const mcpTicketSecret = requireValue("MCP_LOGIN_TICKET_SECRET");
  const adminEmail = requireValue("ADMIN_EMAIL");

  const d1Id = env.D1_DATABASE_ID?.trim() || ensureD1Database(dbName, env.D1_DATABASE_ID?.trim());
  const rateKvId =
    env.RATE_LIMIT_KV_ID?.trim() || ensureKvNamespace(env.RATE_LIMIT_KV_ID?.trim(), "RATE_LIMIT");
  const oauthKvId =
    env.OAUTH_KV_ID?.trim() || ensureKvNamespace(env.OAUTH_KV_ID?.trim(), "OAUTH_KV");

  // ── Root .env ─────────────────────────────────────────────────────────────
  const rootEnv = [
    `# Generated by scripts/configure-cloudflare.mjs — do not commit this file.`,
    `COD_ACCOUNT_ID=${accountId}`,
    `COD_DB_NAME=${dbName}`,
    `COD_R2_BUCKET_NAME=${bucketName}`,
    `COD_SERVER_URL=${apiUrl}`,
    `COD_MEDIA_DOMAIN=${mediaDomain}`,
    ``,
  ].join("\n");
  writeFileSync(path.join(ROOT, ".env"), rootEnv, "utf8");

  // ── cod-server/wrangler.toml ──────────────────────────────────────────────
  const serverTemplate = readFileSync(
    path.join(ROOT, "cod-server/wrangler.toml.example"),
    "utf8"
  );
  let serverCfg = serverTemplate;
  serverCfg = setTopLevelValue(serverCfg, "name", serverName);
  serverCfg = setTopLevelValue(serverCfg, "account_id", accountId);
  serverCfg = setBindingValue(serverCfg, "DB", "database_name", dbName);
  serverCfg = setBindingValue(serverCfg, "DB", "database_id", d1Id);
  serverCfg = setBindingValue(serverCfg, "IMAGES", "bucket_name", bucketName);
  serverCfg = setBindingValue(serverCfg, "RATE_LIMIT", "id", rateKvId);
  serverCfg = setBindingValue(serverCfg, "OAUTH_KV", "id", oauthKvId);

  // Also update the production env block for people who later run --env production.
  serverCfg = serverCfg.replace(
    /\[env\.production\]\nvars\s*=\s*\{[^}]*\}/,
    `[env.production]\nvars = { ENVIRONMENT = "production", WORKER_URL = ${JSON.stringify(
      apiUrl
    )}, MEDIA_DOMAIN = ${JSON.stringify(mediaDomain)}, R2_BUCKET_NAME = ${JSON.stringify(
      bucketName
    )}, BETTER_AUTH_URL = ${JSON.stringify(
      `${dashboardUrl}/api/auth`
    )}, WORKER_SELF_URL = ${JSON.stringify(`${apiUrl}/`)}, ALLOWED_ORIGINS = ${JSON.stringify(
      [dashboardUrl, storeUrl].filter(Boolean).join(",")
    )}, STOREFRONT_URL = ${JSON.stringify(storeUrl)} }`
  );
  serverCfg = serverCfg.replace(
    /(\[\[env\.production\.d1_databases\]\]\n(?:.|\n)*?database_id\s*=\s*")[^"]+"/,
    `$1${d1Id}"`
  );
  serverCfg = serverCfg.replace(
    /(\[\[env\.production\.d1_databases\]\]\n(?:.|\n)*?database_name\s*=\s*")[^"]+"/,
    `$1${dbName}"`
  );
  serverCfg = serverCfg.replace(
    /(\[\[env\.production\.kv_namespaces\]\]\nbinding\s*=\s*"RATE_LIMIT"\nid\s*=\s*")[^"]+"/,
    `$1${rateKvId}"`
  );
  serverCfg = serverCfg.replace(
    /(\[\[env\.production\.kv_namespaces\]\]\nbinding\s*=\s*"OAUTH_KV"\nid\s*=\s*")[^"]+"/,
    `$1${oauthKvId}"`
  );

  serverCfg = addVar(serverCfg, "ENVIRONMENT", "production");
  serverCfg = addVar(serverCfg, "WORKER_URL", apiUrl);
  serverCfg = addVar(serverCfg, "WORKER_SELF_URL", `${apiUrl}/`);
  serverCfg = addVar(serverCfg, "BETTER_AUTH_URL", `${dashboardUrl}/api/auth`);
  serverCfg = addVar(serverCfg, "MEDIA_DOMAIN", mediaDomain);
  serverCfg = addVar(serverCfg, "R2_BUCKET_NAME", bucketName);
  serverCfg = addVar(serverCfg, "STOREFRONT_URL", storeUrl);

  const allowedOrigins = new Set(
    [apiUrl, dashboardUrl, storeUrl, ...(env.ALLOWED_ORIGINS_EXTRA ?? "").split(",")]
      .map((x) => x.trim())
      .filter(Boolean)
  );
  serverCfg = addVar(serverCfg, "ALLOWED_ORIGINS", [...allowedOrigins].join(","));

  writeFileSync(path.join(ROOT, "cod-server/wrangler.toml"), serverCfg, "utf8");

  // ── cod-client-astro/wrangler.toml ────────────────────────────────────────
  const clientTemplate = readFileSync(
    path.join(ROOT, "cod-client-astro/wrangler.toml.example"),
    "utf8"
  );
  let clientCfg = clientTemplate;
  clientCfg = setTopLevelValue(clientCfg, "name", dashboardName);
  clientCfg = setTopLevelValue(clientCfg, "account_id", accountId);
  clientCfg = setBindingValue(clientCfg, "DB", "database_name", dbName);
  clientCfg = setBindingValue(clientCfg, "DB", "database_id", d1Id);
  clientCfg = setBindingValue(clientCfg, "RATE_LIMIT_KV", "id", rateKvId);
  clientCfg = addVar(clientCfg, "PUBLIC_APP_URL", dashboardUrl);
  clientCfg = addVar(clientCfg, "PUBLIC_API_URL", apiUrl);
  const trustedOrigins = new Set([
    dashboardUrl,
    storeUrl,
    ...(env.ALLOWED_ORIGINS_EXTRA ?? "").split(",").map((x) => x.trim()),
  ].filter(Boolean));
  clientCfg = addVar(
    clientCfg,
    "PUBLIC_TRUSTED_ORIGINS",
    [...trustedOrigins].join(",")
  );
  writeFileSync(path.join(ROOT, "cod-client-astro/wrangler.toml"), clientCfg, "utf8");

  // ── cod-client-astro/.env (build-time) ────────────────────────────────────
  const clientEnv = [
    `# Generated by scripts/configure-cloudflare.mjs — do not commit this file.`,
    `PUBLIC_API_URL=${apiUrl}`,
    ``,
  ].join("\n");
  writeFileSync(path.join(ROOT, "cod-client-astro/.env"), clientEnv, "utf8");

  // ── Storefront runtime secret setup doesn't live in files; the workflow
  //    sets STORE_API_KEY / MEDIA_DOMAIN via `wrangler secret put`.

  // ── GitHub Actions exports ─────────────────────────────────────────────────
  // Later workflow steps need the resolved origins (routes, --var, summary).
  if (env.GITHUB_ENV) {
    appendFileSync(
      env.GITHUB_ENV,
      [
        `API_ORIGIN=${apiUrl}`,
        `DASHBOARD_ORIGIN=${dashboardUrl}`,
        `STORE_ORIGIN=${storeUrl}`,
        `DEPLOY_MODE=${deployMode}`,
        `CF_ACCOUNT_ID=${accountId}`,
        "",
      ].join("\n"),
      "utf8"
    );
  }

  console.log(`\n✔ Cloudflare config generated (${deployMode} mode).
  Account      : ${accountId}
  Mode         : ${deployMode}
  Worker API   : ${serverName} → ${apiUrl} (D1: ${d1Id})
  Dashboard    : ${dashboardName} → ${dashboardUrl}
  Store        : ${storeName} → ${storeUrl}
  DB           : ${dbName} (${d1Id})
  R2 bucket    : ${bucketName}
  KV RATE_LIMIT: ${rateKvId}
  KV OAUTH     : ${oauthKvId}
  Media domain : ${mediaDomain || "(none — R2 passthrough)"}

Now run the deploy steps (workflow does this automatically):
  1. cd cod-server && npm run db:migrate:remote && STORE_API_KEY=... npm run db:seed:remote
  2. cd cod-client-astro && ADMIN_EMAIL=... ADMIN_NAME=... npm run seed:admin:remote
  3. Set wrangler secrets, then build + deploy the three workers.
`);

  // Return useful values for the caller (GitHub Actions summary).
  return { d1Id, rateKvId, oauthKvId, apiUrl, dashboardUrl, storeUrl };
}

try {
  main().catch((err) =>
    fail(err instanceof Error ? `${err.message}\n${err.stack ?? ""}` : String(err))
  );
} catch (err) {
  fail(err instanceof Error ? `${err.message}\n${err.stack ?? ""}` : String(err));
}
