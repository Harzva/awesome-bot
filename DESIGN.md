# Awesome Bot visual system

The current visual direction follows the user's chosen [Grok Bot marketplace](https://x.ai/bot/marketplace) reference. Version 0.5 replaces the earlier warm-paper editorial directory with neutral light surfaces, desktop category navigation and role-led Bot cards. Awesome Bot keeps its own circular four-cell mark, original role artwork and source attribution.

## Reference and boundaries

The marketplace and a Bot detail page were revisited on 2026-10-20. Workspace-local reference screenshots show a restrained Marketplace heading, compact category navigation, search, prominent identity images, concise descriptions and simple next-step controls. The detail reference separates role identity, author, description and import action.

These patterns inform hierarchy and browsing. Awesome Bot's primary action says Download config, because it downloads a declarative file. Agent reading copies a loading prompt; it does not install or execute a Bot. Original role marks are not upstream creator portraits. The catalogue has no ratings or popularity evidence, so no such metrics or Featured claims are introduced.

## Structure

- The compact header keeps Awesome Bot, the market, contribution, GitHub and language controls reachable.
- A short market title and search lead into the catalogue. Roles and tasks remain distinct collections; category, scenario, sort and saved-only filters combine with search.
- Desktop category navigation sits beside the result grid. Smaller screens use a horizontally scrollable category strip and a single column of cards.
- Each card gives an original role mark, role name, source author where available, summary, work area and skill count. View details, save and direct configuration download remain explicit actions.
- Bulk downloads, source guidance and Agent discovery are supporting utilities. They do not compete with the role grid as a second dashboard.
- Native Bot details show identity and attribution, then three main actions: configuration download, Copy for Agent and first-task copy. Documentation, original manifest, source, editing and sharing form a quieter resource group. Complete responsibilities, materials, steps, skills, permission requests and verification remain available below.

## Typography and identity

Self-hosted IBM Plex Sans, licensed under SIL OFL 1.1 in `site/fonts/OFL-1.1.txt`, handles Latin text with platform Chinese sans fallbacks. The page makes no remote font request. Neutral text, light borders and generous separation provide hierarchy; the old red title emphasis is removed. The own-brand red cell and existing original role marks retain their identities.

Each role mark is generated deterministically from a stable Bot ID. Ten work-area families give related roles a common visual vocabulary while individual geometry remains distinct. A language switch retains the same mark.

## Core tokens

| Token | Value | Purpose |
| --- | --- | --- |
| Page / surface | `#ffffff` | Neutral browsing canvas |
| Soft surface | `#f7f7f5` | Search and supporting controls |
| Ink | `#101010` | Text and primary actions |
| Muted | `#6f6f6d` | Supporting copy |
| Line | `#e3e3e0` | Quiet boundaries |
| Focus | `#1d68ae` | Visible keyboard focus |
| Card / control radius | `16px` / `9px` | Collection and control shapes |
| Content maximum | `1180px` | Desktop reading width |

## Interaction contracts

- Chinese and English cover interface, all 146 role bodies and configuration projections, and five scenarios. The URL records language. Original Chinese source manifests retain their published bytes and versions.
- Search matches names, summaries, tags, source names and authors, IDs, missions, style, category and capabilities. Collection controls use button groups and `aria-pressed`.
- Saved Bots remain in local browser storage. Storage failure leaves an in-memory state. Shared links omit saved-only state and unknown query data.
- Search, filters, scenarios and detail routes survive refresh and browser navigation. Direct-detail closing stays in the market. Missing entries produce a notice.
- The native dialog closes with its control, Escape or backdrop and restores opener focus. Copy feedback uses live status text. Long details scroll normally.
- Loading is bounded. Error recovery retains filters, offers Retry and a GitHub fallback. Empty search results have a distinct clear-filter action.
- Entry content uses text nodes; links allow HTTPS and site-relative paths. Download links point to static configurations. Permission requests are descriptions, not grants. Format checks are separate from real-task verification.
- Reduced-motion settings remove smooth scrolling and reduce transitions.

## Acceptance

The maintained viewport targets are 1280 × 720, 1200 × 776, 390 × 844 and 375 × 812, in Chinese and English. Acceptance checks search, role identity, visible first-card actions, category navigation, wrapping, document overflow, detail hierarchy, copy, localized downloads and route/focus behavior.

Version-specific screenshots, independent visual review and browser evidence are kept in the parent workspace's `research/awesome-bot-20261020/v0.5.0/ui/`, outside this public repository. They are local-preview evidence; public deployment requires separate byte-parity and workflow checks. Earlier releases retain their own historical evidence directories.

Version 0.5 acceptance passed independent visual review in Chinese and English at all four target sizes. The accepted captures use the `accepted-` prefix. First-card detail and download actions are visible at every target; the final English desktop actions stay on one row, and phone sort values remain legible. Earlier captures and the first blocking review remain as evidence of the bounded fixes. The final scoped layout scan reported no findings.

Actual browser checks confirmed category/select synchronization, saved filtering, English scene downloads, all three main detail actions, a real paste of the selected English Bot's Agent prompt, Escape focus restoration and refresh preserving the selected scenario. Public deployment and release package checks are recorded separately from these local UI results.
