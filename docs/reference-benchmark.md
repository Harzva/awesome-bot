# Reference benchmark

Awesome Bot borrows the maintenance mechanisms of a mature community directory. Star counts and the size of a different ecosystem are not quality guarantees or project acceptance criteria.

The comparison uses the community [Awesome DSH Plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin) source snapshot `1ae7fd8589e091bd1310053d77b5a0bd3da8e4c1`, checked on 2026-10-20. At that snapshot the repository contained 6,068 entry files in 23 plugin categories. These are DSH plugins, not Bot identities. The directory's CC0 license does not relicense each listed plugin.

The reference keeps one entry per file, validates contributions, and generates its documentation, site, and machine indexes from one catalogue. Its [contribution guide](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/1ae7fd8589e091bd1310053d77b5a0bd3da8e4c1/contributing.md) also explains why maintainers must review the actual functionality behind each entry. Awesome Bot adopts that review principle while using the OpenBot declarative-template format and permission boundaries.

| Capability | Awesome Bot implementation | Acceptance evidence |
| --- | --- | --- |
| Independent repository | Bundled market engine and locked local commands | A clean standalone copy builds and exports without a sibling workspace |
| Small contribution units | One canonical JSON file per entry | Strict entry/schema checks and stable IDs |
| Single source of truth | Canonical entries generate templates, registry, documentation, and site data | Deterministic generated-file check |
| Useful discovery | Search, category and collection separation, source-linked details | Browser checks at desktop and narrow widths |
| Honest provenance | Original author/source, public-role reference, separate OpenBot implementation attribution | Every imported source item maps to a local entry without relabeling it as an official upstream package |
| Install boundary | Explicit community-source consent and file export | Tools disabled, no credentials or learning memory transferred |
| Contribution process | Issue forms, PR checklist, CODEOWNERS and read-only PR CI | CI success plus a maintainer's functional review |
| Releases | Tag/version match, reproducible archive, collection exports, manifest and checksums | Clean package build and checksum verification |
| Availability maintenance | Quiet bounded HTTPS source probes | Report artifact; missing, uncertain and skipped states remain distinct |
| Continuous improvement | Regression checks, real issues and reviewed versions | Changes are measured against these concrete gates, not a claim of popularity |

The initial catalogue separately records 90 publicly listed Grok Bot roles and 56 task workflows. OpenBot role content is independently written from public responsibilities. No upstream prompt, private memory, account connection, image, or running environment is claimed to have been copied or certified.

The executable market [DSH Market](https://github.com/dsh-market/dsh-market) is a second design reference for discoverability and source confirmation. Its runtime, Cordis plugin layers, and package installation behavior do not directly install OpenBot templates. The OpenBot engine retains ownership of identity, permissions, installation plans, and configuration generation.

Website deployment, CI, and release publication must each be verified after a push. Real-account task execution is a further evidence level and remains separate from schema, source, and import-library checks. See [publishing.md](publishing.md) for the project gates and the distinction between configured and observed behavior.

## Version 0.3: first task and per-Bot feedback

Version 0.3 implements the following two flows. Local browser checks, independent visual review, scenario-file download checks and the 47-test suite passed. CI, Pages and release publication remain separate remote checks for each published commit.

| Flow | Reference mechanism | Awesome Bot implementation and local acceptance |
| --- | --- | --- |
| Choose a scenario, prepare inputs, download and start a first task | The reference [website](https://awesome-dsh-plugin.com/#installing) and [DSH Market installation guide](https://github.com/dsh-market/dsh-market#install) put the next installation step near discovery | Scenario sets reuse existing entries; users can find the required materials, download a small configuration set, copy a first task and see its expected output. Downloads remain declarative configurations. |
| Report a problem with the exact Bot version | [DSH Market](https://github.com/dsh-market/dsh-market#what-you-get) provides per-entry discussions and diagnostic context | Bot details lead to the bilingual feedback form with only the public ID, template version and source prefilled. Users provide reproduction steps, expected output and actual behavior; no search, favorites, account or conversation data is included automatically. |

GitHub documents form element `id` values as the canonical URL-prefill keys in its [form schema](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/syntax-for-githubs-form-schema). The feedback URL selects `template=bot-feedback.yml` and uses `bot_id`, `bot_version` and `source_url`. Opening the form does not submit an issue; users can edit these fields before posting.

## Remaining contribution gap

The reference [contribution guide](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/contributing.md#adding-a-plugin--收录插件) accepts one entry file without requiring a local build; its main branch generates the derived documents after merge. Awesome Bot currently requires contributors to run validation and commit the generated templates, registry and catalogue documentation alongside their source entry. A true build-free, source-only PR flow still needs a reviewed generation and preview strategy. This iteration does not claim that automation exists.

## Version 0.4: role identity, English and Agent discovery

The [Grok market comparison](grok-market-reference.md) records current primary sources and distinguishes custom Bot avatars, creator images, App import and documentation reading. Awesome Bot now provides original per-role vector marks, complete English content and configuration projections, and a Copy for Agent reading path through llms.txt and individual Markdown/JSON files. See the [integration contract](agent-integration.md).

All 146 initial roles and five scenarios have complete English overlays. Local generation, English-content and export checks passed, with independent Chinese/English visual review at four viewport sizes. Copy and paste were checked against the selected Bot's language-specific context link. No arbitrary-Agent automatic installation API or real-account certification is claimed.
