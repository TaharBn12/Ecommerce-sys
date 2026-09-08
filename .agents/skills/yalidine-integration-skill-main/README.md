# Yalidine (Guepex) Integration Skill

A ready-to-use **Agent Skill** that teaches any AI coding agent — Claude
(claude.ai, Claude Code, Claude Desktop), opencode, Codex, or any other
agent that reads `SKILL.md`-style instructions — exactly how to integrate
the [Yalidine](https://yalidine.com) delivery API (exposed under the brand
name **Guepex**) into a real codebase: parcel creation, tracking, delivery
fees, wilaya/commune/stop-desk lookups, and secure real-time webhooks.

Built from Yalidine's official API and webhook documentation, so the agent
isn't guessing at field names or auth flow — it has the real spec, the real
gotchas, and a clear line between what it can build for you and what only
you can do in your own dashboard.

## Why this exists

Yalidine's docs are complete but written for a human reading top to bottom,
not for an agent that needs to jump straight to "how do I create a
stop-desk parcel" mid-task. This skill restructures that same information
so an agent loads only what the current task needs, follows a sane build
order, and — critically — never has to invent a credential, a webhook URL,
or a workaround when it hits something it can't do itself.

## What's inside

```
.
├── AGENTS.md                          # always-loaded repo context for coding agents (Codex, Cursor, etc.)
├── README.md                          # this file — for humans
└── yalidine-integration/              # the actual skill — point your agent's skill system at THIS folder
    ├── SKILL.md                       # entry point — read by the agent first
    ├── references/
    │   ├── api-reference.md           # every endpoint: parcels, wilayas, communes, centers, fees, histories
    │   ├── webhooks-reference.md      # events, payloads, CRC validation, signature verification, retries
    │   ├── human-only-steps.md        # dashboard actions only the account owner can do
    │   └── troubleshooting.md         # common errors mapped to real causes and fixes
    ├── scripts/
    │   ├── yalidine-client.ts         # typed, dependency-free API client (fetch-based)
    │   └── webhook-handler.ts         # Supabase Edge Function webhook endpoint (CRC + HMAC verification)
    └── assets/
        └── .env.example               # the exact env vars the integration needs
```

`SKILL.md` is an **on-demand** capability — an agent only loads it once it
decides your request matches. `AGENTS.md` is different: it's **always** in
context on tools that support it (Codex, Cursor, and others), so it acts as
a standing pointer telling the agent the skill exists and when to reach for
it, rather than relying on discovery alone.

## Quick start

### Claude — claude.ai / Claude Desktop

1. Download this repo, then zip **just the `yalidine-integration/` folder**
   (not the whole repo — the skill folder shouldn't contain the repo's
   README/LICENSE/etc.).
2. In Claude: **Settings → Customize → Skills → "+" → "+ Create skill" →**
   upload that zip. Make sure **Code execution and file creation** is on.
3. Ask Claude to work on Yalidine — e.g. *"add Yalidine parcel creation to
   my checkout flow"* — Claude decides on its own when to pull the skill
   in based on its description; you don't invoke it manually.

### Claude Code

Skills are filesystem-based — no upload step:

```bash
# personal, available in every project:
cp -r yalidine-integration ~/.claude/skills/

# OR project-scoped, so it's shared with anyone who clones your repo:
mkdir -p .claude/skills
cp -r yalidine-integration .claude/skills/
```
Claude Code auto-discovers it. Just describe the task naturally.

### OpenAI Codex CLI

Codex natively supports the same `SKILL.md` format:
```bash
cp -r yalidine-integration ~/.codex/skills/
```
Codex CLI also reads `AGENTS.md` at your project root automatically — if
you're integrating Yalidine into your own project (not just browsing this
repo), copying this repo's `AGENTS.md` content (or a pointer to it) into
your project's own `AGENTS.md` will make Codex reach for the skill more
reliably than discovery alone.

### opencode

Skill support isn't built into opencode's core yet — it's available via a
community plugin
([`opencode-skills`](https://github.com/arc-source-coder/opencode-skills)).
Install that plugin per its README, then drop `yalidine-integration/` into
the directory it scans (project, home, or config — see the plugin's docs).
If you'd rather not add a plugin, the "any other agent" fallback below
always works.

### Cursor / Windsurf / GitHub Copilot / VS Code (Insiders) / Gemini CLI

These have all adopted the same open Agent Skills standard
([agentskills.io](https://agentskills.io)) at varying levels of maturity —
check your tool's current docs for exactly where it expects skill folders,
then copy `yalidine-integration/` there. The `SKILL.md` format itself
doesn't change between tools.

### Any other LLM / agent

`SKILL.md` and everything under `references/` are plain Markdown with no
proprietary syntax — paste `SKILL.md` into your agent's system prompt or
project context, and let it pull in the reference files as needed when it
hits a `references/...` pointer. No special tooling required.

## What you still have to do yourself

This skill is explicit about the line between "the agent can build this"
and "only you can do this in the Yalidine/Guepex dashboard" — see
[`yalidine-integration/references/human-only-steps.md`](yalidine-integration/references/human-only-steps.md)
for the full, ordered list. In short: generating your API ID/API TOKEN,
creating and enabling the webhook subscription, and copying the webhook
secret key all happen in your own dashboard. No skill, and no agent, can
do that part for you — and this one is written to say so rather than fake
it.

## Security notes

- The API token is a **backend-only** secret. This skill's rules explicitly
  forbid putting it in any client-side/browser code path.
- Webhook payloads are verified with HMAC-SHA256 against the raw request
  body before being trusted — see
  [`yalidine-integration/scripts/webhook-handler.ts`](yalidine-integration/scripts/webhook-handler.ts).
- No real credentials, tokens, secret keys, or account-specific URLs are
  included anywhere in this repo. Every example uses placeholder env var
  names. If you fork or extend this, keep it that way.

## Verified, not just written

Before publishing, the included scripts were compiled under TypeScript
strict mode and the webhook signature-verification logic was tested
against a reference HMAC-SHA256 implementation to confirm it matches what
Yalidine's servers compute. That said, this skill hasn't been run against
Yalidine's live API with real credentials — if you hit something that
doesn't match current behavior, please open an issue (see below).

## Disclaimer

This is an unofficial, community-maintained skill built from Yalidine's
public API and webhook documentation. It is not affiliated with, endorsed
by, or officially supported by Yalidine or Guepex. API behavior may change
over time — always cross-check against the [official
documentation](https://yalidine.com) if something seems off.

## Contributing

Found a field that's changed, an endpoint that behaves differently, or a
gap the skill doesn't cover? Issues and PRs are welcome — see
[`CONTRIBUTING.md`](CONTRIBUTING.md).

## License

[MIT](LICENSE) — use it, fork it, adapt it for your own stack.

---

Built by [Meykiio](https://github.com/Meykiio).
