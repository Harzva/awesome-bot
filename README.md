# Awesome Bot

[![CI](https://github.com/Harzva/awesome-bot/actions/workflows/ci.yml/badge.svg)](https://github.com/Harzva/awesome-bot/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

A source-backed marketplace of useful Bot roles and task workflows, with readable instructions and downloadable OpenBot configurations.

[Browse the market](https://harzva.github.io/awesome-bot/?lang=en) · [中文说明](README.zh-CN.md) · [Full catalogue](CATALOGUE.en.md) · [Contribute](CONTRIBUTING.md) · [Releases](https://github.com/Harzva/awesome-bot/releases)

The initial collection contains **90 original role templates** corresponding to public Grok Marketplace entries and **56 original task workflows**. Browse them separately, inspect their responsibilities and prerequisites, then download a configuration. Every original source and author remains visible. Templates contain instructions, not executable installation hooks.

The repository builds independently after a clean clone. One JSON file per entry generates the documentation, searchable website, manifests, index and configuration downloads. No account or backend is required to browse.

## gitopsbot

[Open gitopsbot in the market](https://harzva.github.io/awesome-bot/?bot=awesome%2Fgitopsbot) for a reusable GitHub-to-Feishu setup role. Its skills and bilingual playbook cover event routing, signed Webhooks, durable deduplication, real delivery verification, recovery and explicit OpenBot/Grok sender selection. Multiple Bots can remain online; the selected sender determines where each event goes.

[Setup and operations playbook](docs/gitopsbot-playbook.en.md) · [中文手册](docs/gitopsbot-playbook.md). Installing the role grants no accounts or tools and starts no background listener.

## Start with a task

Choose a scenario in the [market](https://harzva.github.io/awesome-bot/?lang=en) to get 1–2 relevant Bots, the materials to prepare, a first task you can copy, and a small configuration download. Begin with [a customer meeting](https://harzva.github.io/awesome-bot/?lang=en&scenario=customer-meeting), or read the generated [first-use guide](START_HERE.en.md). You review each output and pass it to the next Bot; the scenario download does not execute a workflow.

Every Bot detail also offers its existing first-task example and a feedback form prefilled with the public Bot ID, template version and source. Supply your own materials when starting a task; keep private account or task data out of public feedback.


## Bots from other markets

The market now offers **371 OpenBot configuration templates**, including **223 attributed roles** from Awesome Grokbot, Grok Bot Templates and BotSkills. Their actual English instructions and applicable license notices are preserved, with localized Chinese/English metadata. Search a source name or Bot name in the [market](https://harzva.github.io/awesome-bot/?lang=en), inspect the source and instructions, then download an individual configuration. Existing 148 entries remain unchanged.

The [Shared Bots directory](https://harzva.github.io/awesome-bot/shared-bots.html?lang=en) indexes original-site Bots separately, with search, source/platform filters and pagination. These are source links, not importable OpenBot configurations. Read the [coverage and adaptation guide](docs/market-aggregation.md) and [source inventory](sources/bot-markets-20261024.md).

## Explore external projects

The [Projects & references collection](https://harzva.github.io/awesome-bot/resources.en.html) lists seven source-checked team templates, gateways, delegation tools, architecture references and independent runtimes. Six have verified open-source licenses; Grok Factory is a link-only reference because no license was found. Each listing includes a pinned README, license evidence and OpenBot compatibility limits. They are separate from installable configuration templates; those seven project listings do not import or execute external code or prompt packs. [Metadata](data/external-projects.json) · [Source review](sources/external-project-review-20261024.md).

## Find a Bot

Use the [market](https://harzva.github.io/awesome-bot/?lang=en) to search English responsibilities, titles or sources, filter categories and collections, inspect skills and permission needs, and save favorites in your browser. Share the current search or a Bot detail link; filters and language return on refresh and browser navigation. Favorites stay in your browser and are omitted from shared links. If loading fails, retry with the same filters or browse the GitHub catalogue. Downloads are configuration files; the website does not install into your App or connect your accounts.

- [315 role configurations with individual downloads](https://harzva.github.io/awesome-bot/?lang=en&collection=roles)
- [56 task workflows](https://harzva.github.io/awesome-bot/exports/en/awesome-bot-workflows.fleet.json)
- [Complete configuration catalogue](https://harzva.github.io/awesome-bot/?lang=en) (371 entries; collections above 200 require split files via `npm run pack:release`)
- [Machine-readable market index](https://harzva.github.io/awesome-bot/registry/index.json)

Import a downloaded Fleet file through **OpenBot → Settings → Data & Sync → Import configuration** and review the summary. Model, tool and account connections need their own setup. New ordinary Bots receive no granted tool or container permissions. In an empty library, OpenBot selects its first Bot as the primary Bot, which carries management capabilities. Importing does not start tasks or environments.

English mode includes all 371 Bot names, responsibilities, skills, personas, examples and configuration downloads, plus five fully translated scenarios. Chinese mode uses Chinese metadata; the 223 source adaptations retain their original English instruction bodies in both modes. English configuration projections retain the source role identity and are labelled with a separate content revision; published Chinese manifests remain unchanged. Each role has its own independently authored vector mark.

Release collection files with `-en-` in their names contain English personas and skills. The complete source archive includes both languages and the static Agent context files.

## Read with an Agent

Use **Copy for Agent** in the market or an individual Bot detail, then paste the loading prompt into an Agent that can read links. It discovers a small index and loads only the role you need. Start directly with [llms.txt](https://harzva.github.io/awesome-bot/llms.txt) or the [English Agent index](https://harzva.github.io/awesome-bot/agents/en/index.json). Each Bot provides Markdown, JSON, source/version metadata and a configuration digest. Copying or reading does not install or run a Bot. See the [integration guide](docs/agent-integration.md).

## Run locally

Node.js **22 or newer**. No runtime package dependencies.

```sh
git clone https://github.com/Harzva/awesome-bot.git
cd awesome-bot
npm ci
npm run check
npm run check:versions
npm test
npm run build:site
npm run serve
```

Open `http://127.0.0.1:8765/awesome-bot/`. The site serves its own fonts and catalogue data.

```sh
npm run market -- list --query=research
npm run market -- info awesome/grok-researchy
npm run market -- plan awesome/grok-researchy --openbot=0.9.9 --allow-community --allow-unpinned
npm run market -- install awesome/grok-researchy --openbot=0.9.9 --allow-community --allow-unpinned --out=/tmp/researchy.fleet.json
npm run export-all -- --allow-community --collection=roles --out=/tmp/roles.fleet.json
```

The catalogue is unsigned. The CLI preserves explicit community-source and missing-anchor consent; integrity hashes detect content drift but do not establish publisher identity. Export requires an explicit destination and host version. Standalone upgrades and rollback remain disabled until an App integration can reconcile actual imported Bot IDs.

## Add or improve an entry

Each entry lives in [`data/entries/`](data/entries). Submit a PR that changes one entry, explains its function, and identifies the source and license. Community originals do not need a Grok reference. Follow the [contribution guide](CONTRIBUTING.md) or start with a [proposal](https://github.com/Harzva/awesome-bot/issues/new?template=bot-submission.yml).

```sh
npm run build
npm run check
npm run check:versions
npm test
npm run build:site
npm run audit:public
```

CI checks entry validity, complete source mappings, deterministic data, clean-clone operation, export integrity and website artifacts. Scheduled link reports identify unavailable references for review; they do not execute third-party code or silently remove entries. Tagged releases include artifacts and SHA-256 checksums. See [publishing](docs/publishing.md).

## Project structure

| Path | Purpose |
| --- | --- |
| `data/entries/*.json` | One editable role or workflow per file |
| `catalogue.json` | Categories, source definitions and configuration |
| `templates/` · `registry/` | Generated manifests and integrity index |
| `site/` | Static market interface |
| `sources/` | Dated source inventory and attribution |
| `engine/` | Vendored MIT market core, with file provenance |
| `scripts/` · `test/` | Build, checks, exports and packaging |

## Sources and verification

The initial source inventory was checked on **2026-10-20**: 90 public [Grok Marketplace](https://x.ai/bot/marketplace) entries, including 54 tagged “From Grok Bot Team”, and 56 separate [use cases](https://x.ai/bot/use-cases). OpenBot personas and skills were independently authored from public responsibilities. Upstream prompt bodies, images, accounts and runtime environments were not copied.

Format and import checks are not certifications that every role has completed real-account tasks. The market displays this distinction. No ratings, usage statistics or verified-task badges are fabricated.

[Awesome DSH Plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin) and [DSH Market](https://github.com/dsh-market/dsh-market) inform project organization and discovery. Roles, workflows, skills, plugins and execution runtimes remain distinct. See the [reference benchmark](docs/reference-benchmark.md), [source notes](SOURCE.md) and [App integration contract](INTEGRATION.md).

Original content and code use [MIT](LICENSE). Upstream names and references retain their owners' rights; see [third-party notices](THIRD_PARTY_NOTICES.md). This is an independent project, unaffiliated with xAI or DeepSeek.
