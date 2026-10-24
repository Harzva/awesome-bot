# Bot market aggregation — 2026-10-24

The market now contains 371 OpenBot role/workflow configurations: the previous 148 entries plus 223 attributed adaptations with actual source instructions. A separate Shared Bots directory indexes specific Bots available at their original sites or source files. Project references remain a third, separate resource collection.

## Imported roles

| Source | Fixed revision | Roles | License |
| --- | --- | ---: | --- |
| [mergisi/awesome-grokbot](https://github.com/mergisi/awesome-grokbot) | 6210f2034c5737d1be100e227c8d308d9757ecf4 | 56 | CC0-1.0 |
| [cobusgreyling/grok-bot-templates](https://github.com/cobusgreyling/grok-bot-templates) | 4f3f28b4e6578cd227ff7f4b78ec91d15fd091b5 | 49 | MIT |
| [PramodDutta/botskills](https://github.com/PramodDutta/botskills) | ed17ebcead177b91dfca57d5df3d7c9872cb77fd | 118 | MIT |

The original role instruction bodies are preserved in English. Names, summaries, onboarding and host boundaries have Chinese and English metadata. This is not a claim that the original instructions were fully translated. Adapters add the OpenBot task-start, language, permissions and stop contract; they do not install upstream software, configure integrations, create schedules or assume another Bot's private data is available. The user chooses the response language.

The exact source files and license texts live under `sources/imported/`; `data/imported-role-sources.json` records revisions, paths and SHA-256 digests. `data/imported-role-translations.zh.json` holds the localized names and summaries. The offline `npm run sync:imports` command generates one declarative role plus a complete English overlay per source role. It does not fetch or execute upstream code. `npm run check:imports` verifies repeat synchronization is a no-op. A changed source must be separately reviewed and versioned; the synchronizer refuses to overwrite an existing different role.

Every generated persona contains the actual original role body, source URL and digest, adaptation notice and applicable license notice. MIT copyright and permission text remains inside the persona so the normal registry → plan → Fleet → App path retains it, including English downloads. CC0 source/license references and the full source license are retained with the distribution. No vendored engine changes are required.

Existing 148 registry entries and all their published manifests are preserved. New local slugs include source prefixes and a deterministic hash when a long ID needs shortening. Exact normalized prompt duplicates are rejected; similar names from different authors remain distinct roles. Tools and containers are off in exported configurations. Actual account tasks and provider integrations have not been individually tested or certified.

## Shared Bots

[Browse Shared Bots](https://harzva.github.io/awesome-bot/shared-bots.html) separately from installable configurations. Its JSON contains only names, authors, categories, canonical original-site/source URLs and provenance records. It contains no copied prompt bodies or descriptions and no installer field. Search, source/platform filters and 50-row pagination keep large directories usable.

Canonical `x.ai/bot/<id>` keys are case sensitive. Tracking parameters, optional human slugs and trailing slashes are removed; all contributing source records remain attached to the surviving entry. Distinct TemplatesGrokBot pages are kept separately because there is no proven mapping to an x.ai identity. Entries without a share URL may link to their fixed-revision GitHub source file. Identical display names alone do not prove the Bots are the same.

These entries are indexed from fixed source catalogues. Their public links have not all been individually checked, and they are not OpenBot-compatible packages. Original-site account requirements and terms still apply. No paid catalogue, checkout or account is accessed by the sync.

The source discovery scope, source-by-source disposition and aggregation counts are in [the source inventory](../sources/bot-markets-20261024.md). Discovery is a dated search of relevant GitHub AI Bot markets, not a guarantee that every GitHub repository or future Bot is covered. Team packs, plugins, software scaffolds and general links are not counted as individual installable Bots.

## Validation and maintenance

Use Node.js 22 or 24, then run `npm run build`, `npm run check`, `npm run check:versions`, `npm test`, `npm run build:site`, and `npm run audit:public` after staging intended public files. Release packaging splits collections into at most 200 Bots per Fleet file; individual downloads remain available on the website. The all-in-one website download is unavailable above that host limit.

Check source hashes and licensing before new snapshots, preserve source identity, and issue a new template version for changed published instructions. Keep links and source-only records outside the installable registry. Public-site generation and publication never modify the running desktop App, user accounts, messages or memory.
