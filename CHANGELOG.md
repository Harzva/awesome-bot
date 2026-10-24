# Changelog

## 0.6.3 — 2026-10-24

- Add `gitopsbot` 1.0.0 with complete Chinese and English onboarding, reusable skills and an operational playbook for event-driven GitHub-to-Feishu notifications.
- Capture validated Webhook authentication, deterministic formatting, persistent deduplication, process recovery, delivery verification and explicit OpenBot/Grok sender routing.
- Keep credentials, live account bindings and runtime processes outside the declarative template; preserve every previously published template version.

## 0.6.2

- Add supervisor role 1.1.0 for OpenBot 0.10.28: real Node checks, evidence-based rework, confirmed restart recovery and durable stop.
- Preserve supervisor 1.0.0 bytes and clarify test permissions, verification scope and App lifecycle.

## 0.6.0 — 2026-10-21

- Add the Task Supervisor BOT (`awesome/supervisor` 1.0.0), the first bot-role template for supervised task execution: turn an authorized objective into bounded supervision and decide each round from evidence — continue, rework, accept, or hand over to the user.
- Publish complete Chinese and English role content, onboarding guidance, a sample task, and explicit host requirements (local API model, local executor bot, tools plus bot-management permission, in-workdir artifact checks, per-task approval).
- Declare `openbot >= 0.10.24` so older hosts refuse to plan the entry instead of installing a tool-less role; catalogue gains a `targetOpenBotVersion` used by export, site and tests.
- Registry, templates, catalogue and site regenerate through the pinned engine; no existing entry bytes change. Downloads remain configuration files; installing grants no execution rights.

## 0.5.1 — 2026-10-21

- Render the existing App character assigned to each Bot in marketplace cards and details, replacing the separate geometric marks. The 146 entries reuse 14 characters; names and identities remain distinct.
- Pin the App's original MIT SVG generators with source digests. Website generation works after a clean clone without an installed App or sibling repository.
- Retain all authored roles, published template versions, configuration downloads, localized role content and permissions. Version website assets so cached earlier artwork is refreshed.

## 0.5.0 — 2026-10-20

- Align marketplace browsing with the Grok Bot reference: a neutral light palette, desktop category navigation, prominent original role marks and responsive Bot cards.
- Add direct configuration downloads to cards and simplify details into three main actions with quieter source and documentation links.
- Preserve complete Chinese and English content, scenarios, saved filters, shareable details and Agent reading. Downloads remain configuration files rather than installation actions.
- Retain all 146 published Chinese template versions and original source attribution.

## 0.4.0 — 2026-10-20

- Give each Bot an original, stable vector role mark in the directory, details and machine-readable context.
- Add complete English content for all 146 roles and five scenarios, with English personas, skills, first tasks, Fleet downloads, catalogue and first-use guide.
- Keep the published Chinese template IDs, versions and bytes unchanged; label localized configuration projections with their language and content revision.
- Add a small llms.txt entry, language indexes and individual Markdown/JSON role context with configuration SHA-256 digests, sources, prerequisites and permission boundaries.
- Add Copy for Agent to the directory and Bot details. It copies loading instructions for a link-capable Agent; it does not install, execute, connect accounts or grant access.

## 0.3.0 — 2026-10-20

- Add five task scenarios with 1–2 existing Bots each, required materials, expected outputs, first-task prompts and explicit user-reviewed handoffs.
- Generate scenario configuration downloads and a first-use guide from one JSON file per scenario; keep the original 146 template versions unchanged.
- Add goal filtering and shareable scenario URLs within the existing directory, including browser navigation, refresh and missing-scenario recovery.
- Copy first-task examples directly from Bot details, and open a bilingual feedback form prefilled only with public identity, version and source fields.
- Keep the four tested directory viewport targets and default search path, with scenario details shown only after selection.

## 0.2.0 — 2026-10-20

- Share filtered searches and individual Bot details through bounded, canonical URLs; restore language and filters on refresh and browser navigation.
- Close details safely for both in-page visits and direct links; keep favorites local and omit saved-only state from shared URLs.
- Make the first Bot and its detail action visible on the tested desktop and phone viewports within the existing paper-and-ink design.
- Offer bounded loading, retry without losing filters, a GitHub catalogue fallback and a clear notice for missing Bot links.
- Reject changes or deletion of published template bytes before generation and in CI, while allowing new versions and community additions.
- Keep all 146 template versions at 1.0.0 unchanged; this release changes the market interface and repository safeguards.

## 0.1.0 — 2026-10-20

- Start an independent, source-backed catalogue with 90 original role templates and 56 original task workflows.
- Generate documentation, manifests, registry and downloadable OpenBot configurations from one JSON file per entry.
- Add a Chinese/English search interface with collection and category filters, local favorites, source details and individual or collection downloads.
- Bundle the MIT OpenBot market core with per-file provenance, so a clean clone builds without another workspace.
- Add contribution forms, Node 22/24 CI, GitHub Pages deployment, bounded source-link reports and versioned releases with SHA-256 checksums.

Entries distinguish public source references, independently authored templates, format verification and real-task evidence. The initial release contains no real-account task certifications.
