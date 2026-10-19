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
