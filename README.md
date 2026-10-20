# Awesome Bot

[![CI](https://github.com/Harzva/awesome-bot/actions/workflows/ci.yml/badge.svg)](https://github.com/Harzva/awesome-bot/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

A source-backed directory of useful Bot roles and task workflows, with readable instructions and downloadable OpenBot configurations.

[Browse the market](https://harzva.github.io/awesome-bot/) · [中文说明](README.zh-CN.md) · [Full catalogue](CATALOGUE.md) · [Contribute](CONTRIBUTING.md) · [Releases](https://github.com/Harzva/awesome-bot/releases)

The initial collection contains **90 original role templates** corresponding to public Grok Marketplace entries and **56 original task workflows**. Browse them separately, inspect their responsibilities and prerequisites, then download a configuration. Every original source and author remains visible. Templates contain instructions, not executable installation hooks.

The repository builds independently after a clean clone. One JSON file per entry generates the documentation, searchable website, manifests, index and configuration downloads. No account or backend is required to browse.

## Start with a task

Choose a scenario in the [market](https://harzva.github.io/awesome-bot/) to get 1–2 relevant Bots, the materials to prepare, a first task you can copy, and a small configuration download. Begin with [a customer meeting](https://harzva.github.io/awesome-bot/?scenario=customer-meeting), or read the generated [first-use guide](START_HERE.md). You review each output and pass it to the next Bot; the scenario download does not execute a workflow.

Every Bot detail also offers its existing first-task example and a feedback form prefilled with the public Bot ID, template version and source. Supply your own materials when starting a task; keep private account or task data out of public feedback.

## Find a Bot

Use the [market](https://harzva.github.io/awesome-bot/) to search Chinese responsibilities or original English titles, filter categories and collections, inspect skills and permission needs, and save favorites in your browser. Share the current search or a Bot detail link; filters and language return on refresh and browser navigation. Favorites stay in your browser and are omitted from shared links. If loading fails, retry with the same filters or browse the GitHub catalogue. Downloads are configuration files; the website does not install into your App or connect your accounts.

- [90 role configurations](https://harzva.github.io/awesome-bot/exports/awesome-bot-roles.fleet.json)
- [56 task workflows](https://harzva.github.io/awesome-bot/exports/awesome-bot-workflows.fleet.json)
- [Complete configuration collection](https://harzva.github.io/awesome-bot/exports/awesome-bot-all.fleet.json)
- [Machine-readable market index](https://harzva.github.io/awesome-bot/registry/index.json)

Import a downloaded Fleet file through **OpenBot → Settings → Data & Sync → Import configuration** and review the summary. Model, tool and account connections need their own setup. New ordinary Bots receive no granted tool or container permissions. In an empty library, OpenBot selects its first Bot as the primary Bot, which carries management capabilities. Importing does not start tasks or environments.

Authored personas are currently **Chinese**. Original English titles are searchable; switching interface language does not translate a persona.

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
